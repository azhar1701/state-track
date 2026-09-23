import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Search,
  Navigation,
  Filter as FilterIcon,
  Layers,
  Share2,
  Download,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Ruler,
  Compass,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { format } from "date-fns";
import type { LegendOverlayItem } from "./Legend";

interface ModernMapOverlayProps {
  // Search
  showSearch?: boolean;
  onToggleSearch?: () => void;
  // Location
  canLocate: boolean;
  onLocate: () => void;
  onResetExtent?: () => void;
  // Filters & Overlays
  onToggleFilters?: () => void;
  onToggleOverlays?: () => void;
  // Drawing & Measurement
  onToggleDrawing?: () => void;
  drawToolbarContent?: React.ReactNode;
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
  onResetExtent,
  onToggleFilters,
  onToggleOverlays,
  onToggleDrawing,
  drawToolbarContent,
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
  const [drawingActive, setDrawingActive] = useState(false);

  const handleDrawClick = () => {
    const newState = !drawingActive;
    setDrawingActive(newState);
    onToggleDrawing?.();
  };

  const statusItems = [
    { color: "#f59e0b", label: "Baru", count: statusCounts.baru },
    { color: "#3b82f6", label: "Diproses", count: statusCounts.diproses },
    { color: "#10b981", label: "Selesai", count: statusCounts.selesai },
  ];

  const severityItems = [
    { color: "#22c55e", label: "Ringan" },
    { color: "#f97316", label: "Sedang" },
    { color: "#ef4444", label: "Berat" },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none z-[1000]">
      {/* Top Section */}
      <div className="absolute top-3 md:top-4 left-3 md:left-4 right-3 md:right-4 flex flex-col gap-2 pointer-events-none z-[1000]">
        {/* Main Toolbar */}
        <div className="flex justify-center">
          <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-md border border-border/80 shadow-float rounded-2xl px-2.5 py-1.5 pointer-events-auto">
            {/* Search Button */}
            <Button
              onClick={onToggleSearch}
              variant={showSearch ? "default" : "ghost"}
              size="sm"
              className="h-11 px-4 rounded-xl font-medium btn-haptic transition-transform active:scale-95"
            >
              <Search className="icon-sm mr-2" />
              <span className="hidden sm:inline">Cari</span>
            </Button>

            <div className="w-px h-7 bg-border/70 mx-0.5" />

            {/* Location */}
            {canLocate && (
              <Button
                onClick={onLocate}
                size="sm"
                variant="ghost"
                className="h-11 w-11 p-0 rounded-xl btn-haptic transition-transform hover:scale-105 active:scale-95"
                title="Lokasi Saya"
                aria-label="Lokasi Saya"
              >
                <Navigation className="icon-sm" />
              </Button>
            )}

            {/* Reset Extent */}
            {onResetExtent && (
              <Button
                onClick={onResetExtent}
                size="sm"
                variant="ghost"
                className="h-11 w-11 p-0 rounded-xl btn-haptic transition-transform hover:scale-105 active:scale-95 hover:bg-primary/10 text-primary"
                title="Kembali ke Wilayah Ciamis"
                aria-label="Reset Extent ke Ciamis"
              >
                <Compass className="icon-sm" />
              </Button>
            )}

            {/* Filter */}
            <Button
              onClick={onToggleFilters}
              variant="ghost"
              size="sm"
              className="h-11 w-11 p-0 rounded-xl btn-haptic transition-transform hover:scale-105 active:scale-95"
              title="Filter Laporan"
              aria-label="Filter Laporan"
            >
              <FilterIcon className="icon-sm" />
            </Button>

            {/* Overlay */}
            <Button
              onClick={onToggleOverlays}
              variant="ghost"
              size="sm"
              className="h-11 w-11 p-0 rounded-xl btn-haptic transition-transform hover:scale-105 active:scale-95"
              title="Layer & Overlay"
              aria-label="Layer dan Overlay"
            >
              <Layers className="icon-sm" />
            </Button>

            {/* Drawing */}
            <Button
              onClick={handleDrawClick}
              variant={drawingActive ? "default" : "ghost"}
              size="sm"
              className="h-11 w-11 p-0 rounded-xl btn-haptic transition-transform hover:scale-105 active:scale-95"
              title="Alat Gambar & Ukur"
              aria-label="Alat Gambar dan Ukur"
            >
              <Ruler className="icon-sm" />
            </Button>

            <div className="w-px h-7 bg-border/70 mx-0.5" />

            {/* Share */}
            <Button
              onClick={onShare}
              variant="ghost"
              size="sm"
              className="h-11 w-11 p-0 rounded-xl btn-haptic transition-transform hover:scale-105 active:scale-95"
              title="Bagikan Tampilan Peta"
              aria-label="Bagikan Tampilan Peta"
            >
              <Share2 className="icon-sm" />
            </Button>

            {/* Export */}
            <Button
              onClick={onExport}
              variant="ghost"
              size="sm"
              className="h-11 w-11 p-0 rounded-xl btn-haptic transition-transform hover:scale-105 active:scale-95"
              title="Unduh Peta"
              aria-label="Unduh Peta"
            >
              <Download className="icon-sm" />
            </Button>
          </div>
        </div>

        {/* Draw Sub-Toolbar */}
        {drawingActive && drawToolbarContent && (
          <div className="flex justify-center mt-2">
            <div className="bg-background/90 backdrop-blur-md border border-border/80 shadow-float rounded-2xl px-3 py-2 pointer-events-auto">
              {drawToolbarContent}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section: Timeline Player */}
      <div className="absolute bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 w-full max-w-xl px-3 md:px-0 flex justify-center pointer-events-none z-[1000]">
        {/* Tool Instructions */}
        {drawingActive && (
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary/80 text-white px-6 py-3 rounded-xl shadow-lifted text-sm font-medium pointer-events-auto border border-border transition-all duration-300">
            <div className="font-bold mb-1">📏 Alat Gambar & Ukur</div>
            <div className="text-2xs opacity-90">
              Gunakan toolbar untuk menggambar polygon, garis, lingkaran, dan mengukur jarak
            </div>
          </div>
        )}
        <div className="w-full max-w-2xl bg-background/90 backdrop-blur-md border border-border/80 shadow-float rounded-2xl px-4 py-3 pointer-events-auto">
          <div className="flex items-center gap-3 mb-2">
            {/* Play Controls */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={onStepPrev}
                className="h-10 w-10 sm:h-11 sm:w-11 p-0 rounded-xl btn-haptic transition-transform hover:scale-105 active:scale-95"
                title="Hari Sebelumnya"
                aria-label="Hari Sebelumnya"
              >
                <ChevronLeft className="icon-sm" />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onPlayPause}
                className="h-10 w-10 sm:h-11 sm:w-11 p-0 rounded-full shadow-md btn-haptic transition-transform hover:scale-105 active:scale-95"
                title={isPlaying ? "Jeda" : "Putar Garis Waktu"}
                aria-label={isPlaying ? "Jeda Garis Waktu" : "Putar Garis Waktu"}
              >
                {isPlaying ? <Pause className="icon-sm" /> : <Play className="icon-sm" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onStepNext}
                className="h-10 w-10 sm:h-11 sm:w-11 p-0 rounded-xl btn-haptic transition-transform hover:scale-105 active:scale-95"
                title="Hari Berikutnya"
                aria-label="Hari Berikutnya"
              >
                <ChevronRight className="icon-sm" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-10 w-10 sm:h-11 sm:w-11 p-0 rounded-xl btn-haptic transition-transform hover:scale-105 active:scale-95"
                title="Reset ke Awal"
                aria-label="Reset ke Tanggal Awal"
              >
                <RotateCcw className="icon-sm" />
              </Button>
            </div>

            {/* Date Display */}
            <div className="flex-1 text-center">
              <div className="text-sm font-semibold">{format(currentDate, "dd MMM yyyy")}</div>
            </div>

            {/* Total Count Badge */}
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-2xs font-medium">
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
            aria-label="Rentang Waktu Laporan"
          />

          {/* Date Range */}
          <div className="flex justify-between text-2xs text-muted-foreground mt-1">
            <span>{format(minDate, "dd MMM yy")}</span>
            <span>{format(maxDate, "dd MMM yy")}</span>
          </div>
        </div>
      </div>

      {/* Bottom Left: Collapsible Legend */}
      <div className="absolute bottom-48 md:bottom-4 left-3 md:left-4 pointer-events-none z-[900]">
        <div className="bg-card/95 backdrop-blur-md border border-border/80 shadow-float rounded-xl overflow-hidden pointer-events-auto max-w-xs">
          {/* Legend Header */}
          <button
            onClick={() => setLegendCollapsed(!legendCollapsed)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all"
            aria-expanded={!legendCollapsed}
            aria-label="Buka tutup legenda peta"
          >
            <span className="text-2xs font-bold uppercase tracking-wide">Legenda</span>
            {legendCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Legend Content */}
          {!legendCollapsed && (
            <div className="px-3 py-2 text-2xs space-y-2.5">
              {/* Status */}
              <div>
                <div className="font-bold text-foreground mb-1.5 text-3xs uppercase tracking-wide opacity-70">
                  Status
                </div>
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
                      <span className="text-2xs font-semibold text-primary">{i.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div className="pt-1.5 border-t border-border/50">
                <div className="font-bold text-foreground mb-1.5 text-3xs uppercase tracking-wide opacity-70">
                  Tingkat Bahaya
                </div>
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
                  <div className="font-bold text-foreground mb-1.5 text-3xs uppercase tracking-wide opacity-70">
                    Layer
                  </div>
                  <div className="space-y-1">
                    {legendOverlays.slice(0, 3).map((item, idx) => {
                      if (item.type === "line") {
                        return (
                          <div key={idx} className="flex items-center gap-1.5 py-0.5">
                            {item.dashArray ? (
                              <span
                                className="inline-block w-4 h-0.5 rounded-full"
                                style={{
                                  borderTop: `1px dashed ${item.color}`,
                                }}
                              />
                            ) : (
                              <span
                                className="inline-block w-4 h-0.5 rounded-full shadow-sm"
                                style={{
                                  backgroundColor: item.color,
                                }}
                              />
                            )}
                            <span className="text-foreground/90 truncate">{item.label}</span>
                          </div>
                        );
                      }
                      if (item.type === "point") {
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
                      if (item.type === "fill") {
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
                      <div className="text-3xs text-muted-foreground italic pt-0.5">
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
