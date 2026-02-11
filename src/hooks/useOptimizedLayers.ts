import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FeatureCollection, Geometry } from 'geojson';
import proj4 from 'proj4';

interface LayerData {
  key: string;
  name: string;
  geometry_type: string | null;
  data: FeatureCollection<Geometry> | null;
  isVisible: boolean;
  styleConfig?: Record<string, unknown>;
}

interface UseOptimizedLayersOptions {
  enableRealtime?: boolean;
}

export const useOptimizedLayers = (options: UseOptimizedLayersOptions = {}) => {
  const { enableRealtime = true } = options;
  const [layers, setLayers] = useState<LayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const processedCache = useRef<Map<string, FeatureCollection<Geometry>>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Memoized CRS definitions (only define once)
  useMemo(() => {
    proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
    proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs');
    proj4.defs('EPSG:32749', '+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs +type=crs');
  }, []);

  // Optimized GeoJSON processor with caching
  const processGeoJSON = useMemo(() => {
    return (key: string, rawData: unknown): FeatureCollection<Geometry> | null => {
      // Check cache first
      if (processedCache.current.has(key)) {
        return processedCache.current.get(key)!;
      }

      try {
        let fc: FeatureCollection<Geometry> | null = null;
        let srcCrs: string | undefined;

        const raw = rawData as Record<string, unknown>;
        
        // Extract FeatureCollection
        if (raw && typeof raw === 'object' && 'featureCollection' in raw) {
          const wrapper = raw as { featureCollection?: unknown; crs?: string };
          if (wrapper.featureCollection && (wrapper.featureCollection as { type?: string }).type === 'FeatureCollection') {
            fc = wrapper.featureCollection as FeatureCollection<Geometry>;
            srcCrs = wrapper.crs;
          }
        } else if ((raw as { type?: string }).type === 'FeatureCollection') {
          fc = raw as unknown as FeatureCollection<Geometry>;
        }

        if (!fc) return null;

        // Detect CRS and reproject if needed
        const embeddedCrsName = (fc as unknown as { crs?: { properties?: { name?: string } } })?.crs?.properties?.name;
        const src = (srcCrs || embeddedCrsName || '').toUpperCase();
        const needsReprojection = src.includes('EPSG:3857') || src.includes('EPSG:32749') || src.includes('32749');

        if (needsReprojection) {
          const from = src.includes('EPSG:3857') ? 'EPSG:3857' : 'EPSG:32749';
          
          const transformCoord = (pt: number[]): [number, number] => {
            const [lon, lat] = proj4(from, 'EPSG:4326', [pt[0], pt[1]]);
            return [lon, lat];
          };

          const reprojectGeometry = (geom: any): any => {
            if (!geom) return geom;
            const mapCoords = (arr: unknown): unknown => {
              if (!Array.isArray(arr)) return arr;
              if (arr.length > 0 && typeof arr[0] === 'number') return transformCoord(arr as number[]);
              return (arr as unknown[]).map((a) => mapCoords(a));
            };
            return { ...geom, coordinates: mapCoords(geom.coordinates) };
          };

          fc = {
            type: 'FeatureCollection',
            features: fc.features.map((f) => ({
              type: 'Feature',
              properties: f.properties || {},
              geometry: reprojectGeometry(f.geometry),
            })),
          } as FeatureCollection<Geometry>;
        }

        // Cache the processed result
        processedCache.current.set(key, fc);
        return fc;
      } catch (error) {
        console.error(`Failed to process GeoJSON for ${key}:`, error);
        return null;
      }
    };
  }, []);

  // Load layers with optimization
  useEffect(() => {
    let cancelled = false;

    const loadLayers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('geo_layers')
          .select('key,name,geometry_type,data,is_visible,style_config')
          .order('created_at', { ascending: false });

        if (cancelled || error || !data) return;

        const processed = data
          .filter((l) => l.key !== 'admin_boundaries')
          .map((layer) => ({
            key: layer.key,
            name: layer.name,
            geometry_type: layer.geometry_type,
            data: layer.data ? processGeoJSON(layer.key, layer.data) : null,
            isVisible: layer.is_visible ?? false,
            styleConfig: layer.style_config as Record<string, unknown> | undefined,
          }));

        setLayers(processed);
      } catch (error) {
        console.error('Failed to load layers:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadLayers();

    return () => {
      cancelled = true;
    };
  }, [processGeoJSON]);

  // Real-time layer visibility sync
  useEffect(() => {
    if (!enableRealtime) return;

    const channel = supabase
      .channel('geo_layers_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'geo_layers',
        },
        (payload) => {
          const updated = payload.new as { key: string; is_visible?: boolean; data?: unknown; style_config?: unknown };
          
          setLayers((prev) =>
            prev.map((layer) => {
              if (layer.key !== updated.key) return layer;
              
              return {
                ...layer,
                isVisible: updated.is_visible ?? layer.isVisible,
                data: updated.data ? processGeoJSON(updated.key, updated.data) : layer.data,
                styleConfig: updated.style_config as Record<string, unknown> | undefined,
              };
            })
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enableRealtime, processGeoJSON]);

  // Memoized visible layers
  const visibleLayers = useMemo(() => {
    return layers.filter((l) => l.isVisible && l.data);
  }, [layers]);

  return {
    layers,
    visibleLayers,
    loading,
    refreshLayers: () => {
      processedCache.current.clear();
      setLayers([]);
    },
  };
};
