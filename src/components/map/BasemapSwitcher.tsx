import { useMap } from 'react-leaflet';
import { TileLayer } from 'leaflet';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map, Satellite } from 'lucide-react';

export const basemaps = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    name: 'Google Satellite',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
  },
};

export type BasemapType = keyof typeof basemaps;

interface BasemapSwitcherProps {
  onBasemapChange?: (basemap: BasemapType) => void;
  initialBasemap?: BasemapType;
}

export const BasemapSwitcher = ({ onBasemapChange, initialBasemap = 'osm' }: BasemapSwitcherProps) => {
  const map = useMap();
  const [currentBasemap, setCurrentBasemap] = useState<BasemapType>(initialBasemap);
  const [tileLayer, setTileLayer] = useState<TileLayer | null>(null);

  useEffect(() => {
    const layer = new TileLayer(basemaps[currentBasemap].url, {
      attribution: basemaps[currentBasemap].attribution,
      maxZoom: 19,
    });

    layer.addTo(map);
    setTileLayer(layer);

    return () => {
      if (layer) {
        map.removeLayer(layer);
      }
    };
  }, []);

  const switchBasemap = (basemap: BasemapType) => {
    if (tileLayer) {
      map.removeLayer(tileLayer);
    }

    const newLayer = new TileLayer(basemaps[basemap].url, {
      attribution: basemaps[basemap].attribution,
      maxZoom: 19,
    });

    newLayer.addTo(map);
    setTileLayer(newLayer);
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
