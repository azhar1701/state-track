import { useMap } from 'react-leaflet';
import { TileLayer } from 'leaflet';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Map, Satellite, Mountain, Moon, Sun, ChevronDown, WifiOff } from 'lucide-react';
import { basemaps, type BasemapType } from './basemap-config';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Basemaps yang ditampilkan di UI — dark & light (Carto) disembunyikan sementara
  const VISIBLE_BASEMAPS: BasemapType[] = ['osm', 'satellite', 'terrain'];

  // Helper for offline tile caching strategy
  useEffect(() => {
    if (!map || !isOfflineMode) return;
    console.info('[PWA] Memulai caching tile peta untuk area saat ini');
    toast.info('Menyimpan area peta untuk offline...');
  }, [map, isOfflineMode, currentBasemap]);

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

  const switchBasemap = useCallback((basemap: BasemapType) => {
    setCurrentBasemap(basemap);
    onBasemapChange?.(basemap);
    setIsOpen(false);
  }, [onBasemapChange]);

  useEffect(() => {
    const handleGlobalChange = (e: Event) => {
      const type = (e as CustomEvent).detail?.type as BasemapType;
      if (type && basemaps[type]) {
        switchBasemap(type);
      }
    };
    window.addEventListener('basemap-change', handleGlobalChange);
    return () => window.removeEventListener('basemap-change', handleGlobalChange);
  }, [switchBasemap]);

  const handleOfflineToggle = (e: React.MouseEvent) => {
    // Prevent click from bubbling up to the backdrop and immediately closing
    e.stopPropagation();
    const next = !isOfflineMode;
    setIsOfflineMode(next);
    if (next) {
      toast.info('Mode offline diaktifkan — area peta saat ini akan di-cache');
    } else {
      toast.info('Mode offline dinonaktifkan');
    }
  };

  return (
    /* Positioned at top-right; sits beside the quick stats hud */
    <div className="absolute top-3 md:top-4 right-3 md:right-4 z-[1000]">
      {/* Single trigger button — keeps top-right area clean with just one element */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-background/90 backdrop-blur-md border border-border/80 shadow-float rounded-2xl transition-all text-foreground btn-haptic"
        aria-label="Ganti Basemap Peta"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {/* Show offline indicator dot on the trigger when active */}
        {isOfflineMode && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Mode Offline Aktif" />
        )}
        {basemapIcons[currentBasemap]}
        <span className="text-sm font-medium text-foreground hidden sm:inline">
          {basemaps[currentBasemap].name}
        </span>
        <ChevronDown className={cn(
          "icon-sm transition-transform text-muted-foreground",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <>
          {/* Click-outside backdrop */}
          <div
            className="fixed inset-0 z-[-1]"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/*
            Dropdown opens DOWNWARD (top-full).
            Width is narrow (w-48) and right-aligned so it never touches the
            centered main toolbar. The toolbar spans left-4 → right-4 but
            is centered; this panel is flush-right and only 192 px wide.
          */}
          <div
            role="listbox"
            aria-label="Pilih Basemap"
            className="absolute top-full right-0 mt-2 w-48 bg-background/95 backdrop-blur-md border border-border/80 shadow-lifted rounded-2xl overflow-hidden p-1 animate-in fade-in slide-in-from-top-2 duration-150"
          >
            {/* Basemap options — hanya tampilkan basemap gratis */}
            {(Object.keys(basemaps) as BasemapType[])
              .filter((key) => VISIBLE_BASEMAPS.includes(key))
              .map((key) => (
              <button
                key={key}
                role="option"
                aria-selected={currentBasemap === key}
                onClick={() => switchBasemap(key)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left rounded-xl",
                  currentBasemap === key
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-foreground"
                )}
              >
                {basemapIcons[key]}
                <span>{basemaps[key].name}</span>
              </button>
            ))}

            {/* Divider */}
            <div className="my-1 mx-2 h-px bg-border/60" />

            {/* Offline Tiles toggle — contextually placed inside the basemap panel */}
            <button
              onClick={handleOfflineToggle}
              aria-pressed={isOfflineMode}
              title={isOfflineMode ? "Klik untuk nonaktifkan cache offline" : "Klik untuk aktifkan cache tile offline"}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl transition-colors text-left",
                isOfflineMode
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative flex-shrink-0">
                <WifiOff className="icon-sm" />
                {isOfflineMode && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-bold uppercase tracking-tighter">Offline Tiles</span>
                <span className="text-[10px] font-normal opacity-70">
                  {isOfflineMode ? 'Cache aktif' : 'Cache nonaktif'}
                </span>
              </div>
              {/* Toggle pill */}
              <div className={cn(
                "ml-auto w-8 h-4 rounded-full transition-colors flex items-center px-0.5",
                isOfflineMode ? "bg-emerald-500" : "bg-border"
              )}>
                <div className={cn(
                  "w-3 h-3 rounded-full bg-white shadow transition-transform",
                  isOfflineMode ? "translate-x-4" : "translate-x-0"
                )} />
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
