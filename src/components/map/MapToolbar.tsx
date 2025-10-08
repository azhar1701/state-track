import { Button } from '@/components/ui/button';
import { Navigation, Filter as FilterIcon, Layers, Share2, Download, Search } from 'lucide-react';

interface MapToolbarProps {
  // When compact, only show Locate, Share, Export
  compact?: boolean;
  showSearch?: boolean;
  onToggleSearch?: () => void;
  canLocate: boolean;
  onLocate: () => void;
  onToggleFilters?: () => void;
  onToggleOverlays?: () => void;
  onShare: () => void;
  onExport: () => void;
}

export const MapToolbar = ({
  compact = false,
  showSearch = false,
  onToggleSearch,
  canLocate,
  onLocate,
  onToggleFilters,
  onToggleOverlays,
  onShare,
  onExport,
}: MapToolbarProps) => {
  return (
    <div className="absolute top-4 left-4 z-[1000]">
      <div className="flex items-center gap-2 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-lg border shadow-lg">
        {!compact && (
          <Button
            onClick={onToggleSearch}
            variant={showSearch ? 'default' : 'outline'}
            size="sm"
            className="shadow-none"
          >
            <Search className="w-4 h-4 mr-2" />
            Cari
          </Button>
        )}
        {canLocate && (
          <Button onClick={onLocate} size="sm" variant="outline" className="shadow-none">
            <Navigation className="w-4 h-4 mr-2" />
            Lokasi
          </Button>
        )}
        {!compact && <div className="w-px h-6 bg-border" />}
        {!compact && (
          <Button onClick={onToggleFilters} variant="outline" size="sm" className="shadow-none">
            <FilterIcon className="w-4 h-4 mr-2" />
            Filter
          </Button>
        )}
        {!compact && (
          <Button onClick={onToggleOverlays} variant="outline" size="sm" className="shadow-none">
            <Layers className="w-4 h-4 mr-2" />
            Overlay
          </Button>
        )}
        <div className="w-px h-6 bg-border" />
        <Button onClick={onShare} variant="outline" size="sm" className="shadow-none">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
        <Button onClick={onExport} variant="outline" size="sm" className="shadow-none">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  );
};
