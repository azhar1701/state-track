import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Search, Navigation, Filter as FilterIcon, Layers, Share2, Download,
  Play, Pause, ChevronLeft, ChevronRight, RotateCcw, ChevronDown, ChevronUp
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { format } from 'date-fns';
import type { LegendOverlayItem } from './Legend';

interface ModernMapOverlayProps {
  // Search
  showSearch?: boolean;
  onToggleSearch?: () => void;
  
  // Location
  canLocate: boolean;
  onLocate: () => void;
  
  // Filters & Overlays
  onToggleFilters?: () => void;
  onToggleOverlays?: () => void;
  
  // Share & Export
  onShare: () => void;
  onExport: () => void;
  
  // Timeline
  minDate: Date;
  maxDate: Date;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  totalDays: number;
  sliderValue: number;
  onSliderChange: (value: number[]) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStepPrev: () => void;
  onStepNext: () => void;
  onReset: () => void;
  
  // Legend
  legendOverlays?: LegendOverlayItem[];
  statusCounts: { total: number; baru: number; diproses: number; selesai: number };
}

export const ModernMapOverlay = ({
  showSearch,
  onToggleSearch,
  canLocate,
  onLocate,
  onToggleFilters,
  onToggleOverlays,
  onShare,
  onExport,
  minDate,
  maxDate,
  currentDate,
  totalDays,
  sliderValue,
  onSliderChange,
  isPlaying,
  onPlayPause,
  onStepPrev,
  onStepNext,
  onReset,
  legendOverlays = [],
  statusCounts,
}: ModernMapOverlayProps) => {
  const [legendCollapsed, setLegendCollapsed] = useState(false);

  const statusItems = [
    { color: '#f59e0b', label: 'Baru', count: statusCounts.baru },
    { color: '#3b82f6', label: 'Diproses', count: statusCounts.diproses },
    { color: '#10b981', label: 'Selesai', count: statusCounts.selesai },
  ];

  const severityItems = [
    { color: '#22c55e', label: 'Ringan' },
    { color: '#f97316', label: 'Sedang' },
    { color: '#ef4444', label: 'Berat' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none z-[1000]">
      {/* Top Section: Floating Search Bar with Actions */}
      <div className="absolute top-4 left-4 right-4 flex justify-center pointer-events-none">
        <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xl rounded-2xl px-3 py-2 pointer-events-auto">
          {/* Search Button */}
          <Button
            onClick={onToggleSearch}
            variant={showSearch ? 'default' : 'ghost'}
            size="sm"
            className="h-9 px-3"
          >
            <Search className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Cari</span>
          </Button>

          <div className="w-px h-6 bg-border" />

          {/* Location */}
          {canLocate && (
            <Button onClick={onLocate} size="sm" variant="ghost" className="h-9 w-9 p-0">
              <Navigation className="w-4 h-4" />
            </Button>
          )}

          {/* Filter */}
          <Button onClick={onToggleFilters} variant="ghost" size="sm" className="h-9 w-9 p-0">
            <FilterIcon className="w-4 h-4" />
          </Button>

          {/* Overlay */}
          <Button onClick={onToggleOverlays} variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Layers className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-border" />

          {/* Share */}
          <Button onClick={onShare} variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Share2 className="w-4 h-4" />
          </Button>

          {/* Export */}
          <Button onClick={onExport} variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bottom Section: Timeline Player */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none">
        <div className="w-full max-w-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xl rounded-2xl px-4 py-3 pointer-events-auto">
          <div className="flex items-center gap-3 mb-2">
            {/* Play Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onStepPrev}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onPlayPause}
                className="h-8 w-8 p-0 rounded-full"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onStepNext}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-8 w-8 p-0"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {/* Date Display */}
            <div className="flex-1 text-center">
              <div className="text-sm font-semibold">{format(currentDate, 'dd MMM yyyy')}</div>
            </div>

            {/* Total Count Badge */}
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
              {statusCounts.total} laporan
            </div>
          </div>

          {/* Progress Bar */}
          <Slider
            value={[sliderValue]}
            onValueChange={onSliderChange}
            max={totalDays}
            step={1}
            className="w-full"
          />

          {/* Date Range */}
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{format(minDate, 'dd MMM yy')}</span>
            <span>{format(maxDate, 'dd MMM yy')}</span>
          </div>
        </div>
      </div>

      {/* Bottom Left: Collapsible Legend */}
      <div className="absolute bottom-40 left-4 pointer-events-none">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-2xl rounded-xl overflow-hidden pointer-events-auto max-w-xs border border-white/20">
          {/* Legend Header */}
          <button
            onClick={() => setLegendCollapsed(!legendCollapsed)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all"
          >
            <span className="text-xs font-bold uppercase tracking-wide">Legend</span>
            {legendCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Legend Content */}
          {!legendCollapsed && (
            <div className="px-3 py-2 text-[10px] space-y-2.5">
              {/* Status */}
              <div>
                <div className="font-bold text-foreground mb-1.5 text-[11px] uppercase tracking-wide opacity-70">Status</div>
                <div className="space-y-1">
                  {statusItems.map((i) => (
                    <div key={i.label} className="flex items-center justify-between gap-2 py-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-3 h-3 rounded-full shadow-sm"
                          style={{ backgroundColor: i.color }}
                        />
                        <span className="text-foreground/90">{i.label}</span>
                      </div>
                      <span className="text-xs font-semibold text-primary">{i.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div className="pt-1.5 border-t border-border/50">
                <div className="font-bold text-foreground mb-1.5 text-[11px] uppercase tracking-wide opacity-70">Severity</div>
                <div className="space-y-1">
                  {severityItems.map((i) => (
                    <div key={i.label} className="flex items-center gap-1.5 py-0.5">
                      <span
                        className="inline-block w-3 h-3 rounded-full border-2 shadow-sm"
                        style={{ borderColor: i.color }}
                      />
                      <span className="text-foreground/90">{i.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overlays - Only show first 3 */}
              {legendOverlays.length > 0 && (
                <div className="pt-1.5 border-t border-border/50">
                  <div className="font-bold text-foreground mb-1.5 text-[11px] uppercase tracking-wide opacity-70">Layers</div>
                  <div className="space-y-1">
                    {legendOverlays.slice(0, 3).map((item, idx) => {
                      if (item.type === 'line') {
                        return (
                          <div key={idx} className="flex items-center gap-1.5 py-0.5">
                            <span
                              className="inline-block w-4 h-0.5 rounded-full shadow-sm"
                              style={{
                                backgroundColor: item.dashArray ? 'transparent' : item.color,
                                borderTop: item.dashArray ? `1px dashed ${item.color}` : undefined,
                              }}
                            />
                            <span className="text-foreground/90 truncate">{item.label}</span>
                          </div>
                        );
                      }
                      if (item.type === 'point') {
                        return (
                          <div key={idx} className="flex items-center gap-1.5 py-0.5">
                            <span
                              className="inline-block w-3 h-3 rounded-full shadow-sm"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-foreground/90 truncate">{item.label}</span>
                          </div>
                        );
                      }
                      if (item.type === 'fill') {
                        return (
                          <div key={idx} className="flex items-center gap-1.5 py-0.5">
                            <span
                              className="inline-block w-3 h-3 border rounded shadow-sm"
                              style={{
                                backgroundColor: item.fillColor,
                                borderColor: item.color,
                              }}
                            />
                            <span className="text-foreground/90 truncate">{item.label}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                    {legendOverlays.length > 3 && (
                      <div className="text-[9px] text-muted-foreground italic pt-0.5">
                        +{legendOverlays.length - 3} layer lainnya
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
