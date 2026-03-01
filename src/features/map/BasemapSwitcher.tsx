import { useMap } from 'react-leaflet';
import { TileLayer } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { Map, Satellite, Mountain, Moon, Sun, ChevronDown } from 'lucide-react';
import { basemaps, type BasemapType } from './basemap-config';
import { cn } from '@/lib/utils';

interface BasemapSwitcherProps {
  onBasemapChange?: (basemap: BasemapType) => void;
  initialBasemap?: BasemapType;
}

const basemapIcons: Record<BasemapType, React.ReactNode> = {
  osm: <Map className="icon-sm" />,
  satellite: <Satellite className="icon-sm" />,
  terrain: <Mountain className="icon-sm" />,
  dark: <Moon className="icon-sm" />,
  light: <Sun className="icon-sm" />,
};

export const BasemapSwitcher = ({ onBasemapChange, initialBasemap = 'osm' }: BasemapSwitcherProps) => {
  const map = useMap();
  const [currentBasemap, setCurrentBasemap] = useState<BasemapType>(initialBasemap);
  const [isOpen, setIsOpen] = useState(false);
  const tileLayerRef = useRef<TileLayer | null>(null);

  useEffect(() => {
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

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
    setIsOpen(false);
  };

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 glass-panel shadow-lifted rounded-lg transition-all text-foreground btn-haptic"
          aria-label="Basemap Switcher"
        >
          {basemapIcons[currentBasemap]}
          <span className="text-sm font-medium text-foreground">{basemaps[currentBasemap].name}</span>
          <ChevronDown className={cn(
            "icon-sm transition-transform text-muted-foreground",
            isOpen && "rotate-180"
          )} />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-40 glass-panel shadow-lifted rounded-lg overflow-hidden border border-border">
            {(Object.keys(basemaps) as BasemapType[]).map((key) => (
              <button
                key={key}
                onClick={() => switchBasemap(key)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left",
                  currentBasemap === key
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-foreground"
                )}
              >
                {basemapIcons[key]}
                <span>{basemaps[key].name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
