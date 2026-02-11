// MINIMAL FIX: Layer Visibility & Async Error Handling
// Add to MapView.tsx or MapComponent.tsx

import { useEffect, useState, useRef } from 'react';
import { Pane, GeoJSON } from 'react-leaflet';
import { supabase } from '@/integrations/supabase/client';
import type { FeatureCollection, Geometry } from 'geojson';

// 1. URL Sanitizer
const sanitizeUrl = (url: string): string => 
  url.replace(/['"""]/g, '').trim();

// 2. Default Style Fallback
const getDefaultStyle = (layerKey: string) => {
  const styles: Record<string, any> = {
    sawah: { color: '#16a34a', weight: 1.5, fillColor: '#86efac', fillOpacity: 0.4 },
    admin_boundaries: { color: '#6b7280', weight: 1, fillOpacity: 0, dashArray: '4 3' },
  };
  return styles[layerKey] || { color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.3 };
};

// 3. Robust Layer Fetcher
const fetchLayerData = async (layer: { key: string; url?: string; data?: any }): Promise<FeatureCollection | null> => {
  try {
    // Check if data is embedded
    if (layer.data?.featureCollection) {
      return layer.data.featureCollection;
    }

    // Fetch from URL
    if (layer.url) {
      const cleanUrl = sanitizeUrl(layer.url);
      const response = await fetch(`${cleanUrl}?t=${Date.now()}`);
      
      if (!response.ok) {
        console.debug(`[Layer ${layer.key}] HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        console.debug(`[Layer ${layer.key}] Empty features`);
        return null;
      }

      return data;
    }

    return null;
  } catch (error) {
    console.debug(`[Layer ${layer.key}] Fetch failed:`, error);
    return null;
  }
};

// 4. Hook Implementation
export const useMapLayers = (activeLayers: string[]) => {
  const [layerData, setLayerData] = useState<Record<string, FeatureCollection>>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort previous requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const loadLayers = async () => {
      // Fetch layer configs from DB
      const { data: layers } = await supabase
        .from('geo_layers')
        .select('key, url, data')
        .in('key', activeLayers);

      if (!layers) return;

      // Use Promise.allSettled to prevent one failure from breaking others
      const results = await Promise.allSettled(
        layers.map(layer => fetchLayerData(layer))
      );

      const newData: Record<string, FeatureCollection> = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          newData[layers[index].key] = result.value;
        }
      });

      setLayerData(newData);
    };

    if (activeLayers.length > 0) {
      loadLayers().catch(err => console.debug('Layer load error:', err));
    } else {
      setLayerData({});
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [activeLayers]);

  return layerData;
};

// 5. JSX Rendering with Panes
export const MapLayersRenderer = ({ layerData }: { layerData: Record<string, FeatureCollection> }) => {
  return (
    <>
      {/* Admin Boundaries - Lower z-index */}
      <Pane name="admin-boundaries" style={{ zIndex: 350 }}>
        {layerData.admin_boundaries && (
          <GeoJSON
            key="admin-boundaries"
            data={layerData.admin_boundaries}
            style={getDefaultStyle('admin_boundaries')}
          />
        )}
      </Pane>

      {/* Polygons (Sawah, etc) - Higher z-index */}
      <Pane name="polygons" style={{ zIndex: 400 }}>
        {layerData.sawah && (
          <GeoJSON
            key="sawah"
            data={layerData.sawah}
            style={getDefaultStyle('sawah')}
          />
        )}
      </Pane>

      {/* Markers - Highest z-index */}
      <Pane name="markers" style={{ zIndex: 500 }}>
        {/* Add marker layers here */}
      </Pane>
    </>
  );
};

// 6. Usage Example
/*
const MapComponent = () => {
  const [activeLayers, setActiveLayers] = useState(['admin_boundaries', 'sawah']);
  const layerData = useMapLayers(activeLayers);

  return (
    <MapContainer center={[-7.325, 108.353]} zoom={12}>
      <MapLayersRenderer layerData={layerData} />
    </MapContainer>
  );
};
*/
