import { useMap } from 'react-leaflet';
import { TileLayer } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map, Satellite } from 'lucide-react';
import { basemaps, type BasemapType } from './basemap-config';

interface BasemapSwitcherProps {
  onBasemapChange?: (basemap: BasemapType) => void;
  initialBasemap?: BasemapType;
}

export const BasemapSwitcher = ({ onBasemapChange, initialBasemap = 'osm' }: BasemapSwitcherProps) => {
  const map = useMap();
  const [currentBasemap, setCurrentBasemap] = useState<BasemapType>(initialBasemap);
  const tileLayerRef = useRef<TileLayer | null>(null);

  // Initialize and update basemap layer when map or currentBasemap changes
  useEffect(() => {
    if (!map) return;

    // Remove existing layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    // Add new layer
    const layer = new TileLayer(basemaps[currentBasemap].url, {
      attribution: basemaps[currentBasemap].attribution,
      maxZoom: 19,
    });
    layer.addTo(map);
    tileLayerRef.current = layer;

    return () => {
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }
    };
  }, [map, currentBasemap]);

  const switchBasemap = (basemap: BasemapType) => {
    setCurrentBasemap(basemap);
    onBasemapChange?.(basemap);
  };

  return (
    <Card className="absolute top-4 right-4 z-[1000] shadow-lg">
      <CardContent className="p-2 flex gap-2">
        <Button
          variant={currentBasemap === 'osm' ? 'default' : 'outline'}
          size="sm"
          onClick={() => switchBasemap('osm')}
          className="flex items-center gap-2"
        >
          <Map className="w-4 h-4" />
          Street
        </Button>
        <Button
          variant={currentBasemap === 'satellite' ? 'default' : 'outline'}
          size="sm"
          onClick={() => switchBasemap('satellite')}
          className="flex items-center gap-2"
        >
          <Satellite className="w-4 h-4" />
          Satellite
        </Button>
      </CardContent>
    </Card>
  );
};
