import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FeatureCollection } from 'geojson';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, Maximize2, MapPin, Loader2 } from 'lucide-react';
import { basemaps } from '@/features/map/basemap-config';

interface LayerMapPreviewProps {
  featureCollection: FeatureCollection | null;
  geometryType?: string | null;
  layerName?: string;
  style?: Record<string, unknown>;
}

export const LayerMapPreview = ({
  featureCollection,
  geometryType,
  layerName,
  style,
}: LayerMapPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const [activeBasemap, setActiveBasemap] = useState<'street' | 'satellite'>('street');
  const [boundsInfo, setBoundsInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Basemap tiles
  const streetTile = useMemo(() => {
    return L.tileLayer(basemaps.osm.url, {
      attribution: basemaps.osm.attribution,
      maxZoom: 19,
    });
  }, []);

  const satelliteTile = useMemo(() => {
    return L.tileLayer(basemaps.satellite.url, {
      attribution: basemaps.satellite.attribution,
      maxZoom: 19,
    });
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Default Ciamis center
    const map = L.map(containerRef.current, {
      center: [-7.3274, 108.3556],
      zoom: 11,
      zoomControl: true,
      attributionControl: false,
    });

    streetTile.addTo(map);
    mapRef.current = map;

    // Small delay to ensure container sizing in dialog
    const timer = setTimeout(() => {
      map.invalidateSize();
      setLoading(false);
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, [streetTile]);

  // Handle Basemap Switch
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activeBasemap === 'street') {
      map.removeLayer(satelliteTile);
      streetTile.addTo(map);
    } else {
      map.removeLayer(streetTile);
      satelliteTile.addTo(map);
    }
  }, [activeBasemap, streetTile, satelliteTile]);

  // Render GeoJSON Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !featureCollection) return;

    // Remove old layer
    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
      geoLayerRef.current = null;
    }

    try {
      const geoLayer = L.geoJSON(featureCollection, {
        style: () => {
          const polyStyle = (style?.polygon as Record<string, unknown>) || {};
          const lineStyle = (style?.line as Record<string, unknown>) || {};
          return {
            color: (lineStyle.color as string) || (polyStyle.color as string) || '#0ea5e9',
            weight: (lineStyle.weight as number) || (polyStyle.weight as number) || 2,
            opacity: (lineStyle.opacity as number) || (polyStyle.opacity as number) || 0.85,
            fillColor: (polyStyle.fillColor as string) || '#38bdf8',
            fillOpacity: (polyStyle.fillOpacity as number) || 0.35,
          };
        },
        pointToLayer: (_feature, latlng) => {
          const ptStyle = (style?.point as Record<string, unknown>) || {};
          return L.circleMarker(latlng, {
            radius: (ptStyle.radius as number) || 6,
            fillColor: (ptStyle.fillColor as string) || '#0ea5e9',
            color: (ptStyle.color as string) || '#0284c7',
            weight: (ptStyle.weight as number) || 1.5,
            opacity: 1,
            fillOpacity: (ptStyle.fillOpacity as number) || 0.75,
          });
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties) {
            const props = feature.properties;
            const keys = Object.keys(props).slice(0, 5);
            const content = `
              <div class="p-2 text-xs max-w-xs font-sans">
                <div class="font-semibold text-foreground border-b pb-1 mb-1.5">${layerName || 'Fitur Geospasial'}</div>
                <div class="space-y-1">
                  ${keys.map(k => `<div><span class="text-muted-foreground font-medium">${k}:</span> ${props[k] ?? '-'}</div>`).join('')}
                </div>
              </div>
            `;
            layer.bindPopup(content);
          }
        },
      });

      geoLayer.addTo(map);
      geoLayerRef.current = geoLayer;

      const bounds = geoLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        setBoundsInfo(`${sw.lat.toFixed(4)}, ${sw.lng.toFixed(4)} s/d ${ne.lat.toFixed(4)}, ${ne.lng.toFixed(4)}`);
      } else {
        setBoundsInfo(null);
      }
    } catch (err) {
      console.error('Failed to render GeoJSON preview:', err);
    }
  }, [featureCollection, style, layerName]);

  const handleZoomToFit = () => {
    if (!mapRef.current || !geoLayerRef.current) return;
    const bounds = geoLayerRef.current.getBounds();
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    }
  };

  return (
    <div className="relative w-full h-[380px] rounded-xl overflow-hidden border border-border/70 shadow-sm bg-muted/20">
      <div ref={containerRef} className="w-full h-full z-0" />

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-xs">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Floating Basemap Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-background/85 backdrop-blur-md p-1 rounded-lg border border-border/80 shadow-md">
        <Button
          type="button"
          size="sm"
          variant={activeBasemap === 'street' ? 'default' : 'ghost'}
          className="h-7 text-xs px-2.5 rounded-md"
          onClick={() => setActiveBasemap('street')}
        >
          <Layers className="w-3 h-3 mr-1" />
          Street
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeBasemap === 'satellite' ? 'default' : 'ghost'}
          className="h-7 text-xs px-2.5 rounded-md"
          onClick={() => setActiveBasemap('satellite')}
        >
          Satelit
        </Button>
        <div className="w-[1px] h-4 bg-border/80 mx-0.5" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 rounded-md"
          onClick={handleZoomToFit}
          title="Zoom ke batas layer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Floating Info Overlay */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-md border-border/80 text-foreground text-xs shadow-xs pointer-events-auto">
            <MapPin className="w-3 h-3 text-primary mr-1" />
            {geometryType || 'Geometri'} • {featureCollection?.features.length || 0} fitur
          </Badge>
          {boundsInfo && (
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-md border-border/80 text-muted-foreground text-2xs shadow-xs hidden sm:inline-flex pointer-events-auto font-mono">
              BBox: {boundsInfo}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
