import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { X, Search, Filter as FilterIcon, Layers } from 'lucide-react';
import { MapSearch } from './MapSearch';
import { FilterPanel, type MapFilters } from './FilterPanel';
import { OverlayToggle, type MapOverlays } from './OverlayToggle';

interface SidePanelProps {
  open: boolean;
  activeTab: 'search' | 'filter' | 'overlay';
  onTabChange: (tab: 'search' | 'filter' | 'overlay') => void;
  onClose: () => void;
  // Search
  onSearchSelect: (lat: number, lon: number, label: string) => void;
  // Filter
  filters: MapFilters;
  onFilterChange: (filters: MapFilters) => void;
  // Overlay
  overlays: MapOverlays;
  onOverlayChange: (overlays: MapOverlays) => void;
}

export const SidePanel = ({
  open,
  activeTab,
  onTabChange,
  onClose,
  onSearchSelect,
  filters,
  onFilterChange,
  overlays,
  onOverlayChange,
}: SidePanelProps) => {
  if (!open) return null;
  return (
    <div className="absolute top-[80px] left-4 z-[2000]">
      <Card className="w-[360px] shadow-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Pengaturan Peta</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as typeof activeTab)} className="mt-2">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="search" className="flex items-center gap-2 text-xs">
                <Search className="w-3.5 h-3.5" /> Cari
              </TabsTrigger>
              <TabsTrigger value="filter" className="flex items-center gap-2 text-xs">
                <FilterIcon className="w-3.5 h-3.5" /> Filter
              </TabsTrigger>
              <TabsTrigger value="overlay" className="flex items-center gap-2 text-xs">
                <Layers className="w-3.5 h-3.5" /> Overlay
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {activeTab === 'search' && (
            <div className="py-1">
              <MapSearch onSelect={onSearchSelect} onClose={onClose} />
            </div>
          )}
          {activeTab === 'filter' && (
            <div className="py-1">
              <FilterPanel filters={filters} onFilterChange={onFilterChange} onClose={onClose} />
            </div>
          )}
          {activeTab === 'overlay' && (
            <div className="py-1">
              <OverlayToggle overlays={overlays} onOverlayChange={onOverlayChange} onClose={onClose} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
