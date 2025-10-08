import { useMap } from 'react-leaflet';
import { TileLayer } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
      <CardContent className="p-2 grid grid-cols-2 gap-2 w-[200px]">
        <button
          onClick={() => switchBasemap('osm')}
          className={`relative rounded-md overflow-hidden border text-left ${currentBasemap === 'osm' ? 'ring-2 ring-primary' : ''}`}
          aria-label="Basemap Street"
        >
          <div className="h-16 bg-[url('https://tile.openstreetmap.org/5/27/15.png')] bg-cover bg-center" />
          <div className="absolute top-1 left-1 bg-background/80 px-1.5 py-0.5 rounded text-xs flex items-center gap-1">
            <Map className="w-3 h-3" /> Street
          </div>
        </button>
        <button
          onClick={() => switchBasemap('satellite')}
          className={`relative rounded-md overflow-hidden border text-left ${currentBasemap === 'satellite' ? 'ring-2 ring-primary' : ''}`}
          aria-label="Basemap Satellite"
        >
          <div className="h-16 bg-[url('https://mt1.google.com/vt/lyrs=y&x=104&y=64&z=8')] bg-cover bg-center" />
          <div className="absolute top-1 left-1 bg-background/80 px-1.5 py-0.5 rounded text-xs flex items-center gap-1">
            <Satellite className="w-3 h-3" /> Satellite
          </div>
        </button>
      </CardContent>
    </Card>
  );
};
