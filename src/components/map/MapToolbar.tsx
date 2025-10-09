import { Button } from '@/components/ui/button';
import { Navigation, Filter as FilterIcon, Layers, Share2, Download, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

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
  onExport: (opts?: { filename?: string; includeControls?: boolean; scale?: number }) => void;
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
  const [openExport, setOpenExport] = useState(false);
  const [filename, setFilename] = useState('map-export.png');
  const [includeControls, setIncludeControls] = useState(true);
  const [scale, setScale] = useState(1);
  return (
    <div className="absolute top-4 left-4 z-[1000]">
      <div className="map-toolbar-container flex items-center gap-2 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-lg border shadow-lg">
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
        <Button onClick={() => setOpenExport(true)} variant="outline" size="sm" className="shadow-none">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>
      <Dialog open={openExport} onOpenChange={setOpenExport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Peta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="exp-fn">Nama file</Label>
              <Input id="exp-fn" value={filename} onChange={(e) => setFilename(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="exp-controls" checked={includeControls} onCheckedChange={(v) => setIncludeControls(Boolean(v))} />
              <Label htmlFor="exp-controls">Sertakan kontrol dan legend</Label>
            </div>
            <div className="space-y-1">
              <Label htmlFor="exp-scale">Skala (1-3)</Label>
              <Input id="exp-scale" type="number" min={1} max={3} step={1} value={String(scale)} onChange={(e) => setScale(Math.max(1, Math.min(3, Number(e.target.value) || 1)))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenExport(false)}>Batal</Button>
              <Button onClick={() => { onExport({ filename, includeControls, scale }); setOpenExport(false); }}>Export</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
