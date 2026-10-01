import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getOptimizedImageUrl } from '@/lib/formatters';
import { Columns, SplitSquareVertical, ZoomIn } from 'lucide-react';

interface PhotoComparisonViewProps {
  beforePhotos: string[];
  afterPhotos: string[];
  onOpenLightbox?: (photoUrl: string) => void;
}

export const PhotoComparisonView = ({
  beforePhotos,
  afterPhotos,
  onOpenLightbox,
}: PhotoComparisonViewProps) => {
  const [mode, setMode] = useState<'slider' | 'side-by-side'>('slider');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [selectedBeforeIdx, setSelectedBeforeIdx] = useState(0);
  const [selectedAfterIdx, setSelectedAfterIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  const beforePhoto = beforePhotos[selectedBeforeIdx] || beforePhotos[0];
  const afterPhoto = afterPhotos[selectedAfterIdx] || afterPhotos[0];

  const handlePointerMove = useCallback((clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSliderPosition(percent);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;
    handlePointerMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handlePointerMove(e.clientX);
  };

  if (!beforePhoto || !afterPhoto) return null;

  return (
    <div className="space-y-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5 shadow-xs">
      {/* Header & Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary/15 pb-2.5">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-semibold py-0.5">
            Komparasi Visual
          </Badge>
          <span className="text-xs font-medium text-foreground">Sebelum vs Sesudah Penanganan</span>
        </div>
        <div className="flex items-center gap-1 bg-background/80 p-0.5 rounded-lg border border-border/70 self-start sm:self-auto">
          <Button
            type="button"
            size="sm"
            variant={mode === 'slider' ? 'default' : 'ghost'}
            className="h-7 text-xs px-2.5 rounded-md gap-1"
            onClick={() => setMode('slider')}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            Slider Interaktif
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'side-by-side' ? 'default' : 'ghost'}
            className="h-7 text-xs px-2.5 rounded-md gap-1"
            onClick={() => setMode('side-by-side')}
          >
            <Columns className="w-3.5 h-3.5" />
            Berdampingan
          </Button>
        </div>
      </div>

      {/* Main Comparison Area */}
      {mode === 'slider' ? (
        <div
          ref={sliderContainerRef}
          className="relative aspect-video sm:aspect-16/9 w-full rounded-xl overflow-hidden border border-border/80 shadow-md select-none touch-none cursor-ew-resize bg-black/80"
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onMouseMove={handleMouseMove}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          onTouchMove={handleTouchMove}
        >
          {/* After Image (Background layer) */}
          <img
            src={getOptimizedImageUrl(afterPhoto, 800, 80)}
            alt="Kondisi sesudah perbaikan"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* Before Image (Clipped layer) */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ width: `${sliderPosition}%` }}
          >
            <img
              src={getOptimizedImageUrl(beforePhoto, 800, 80)}
              alt="Kondisi sebelum perbaikan"
              className="absolute inset-0 w-full h-full object-cover max-w-none"
              style={{
                width: sliderContainerRef.current ? `${sliderContainerRef.current.clientWidth}px` : '100%',
                height: '100%',
              }}
            />
          </div>

          {/* Floating Badges */}
          <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
            <span className="text-2xs font-semibold px-2 py-1 rounded-md bg-rose-500/90 text-white shadow-xs backdrop-blur-xs flex items-center gap-1">
              🔴 SEBELUM (Laporan Warga)
            </span>
          </div>
          <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
            <span className="text-2xs font-semibold px-2 py-1 rounded-md bg-emerald-600/90 text-white shadow-xs backdrop-blur-xs flex items-center gap-1">
              🟢 SESUDAH (Dinas Lapangan)
            </span>
          </div>

          {/* Vertical Slider Bar */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.6)] cursor-ew-resize z-20 pointer-events-none"
            style={{ left: `calc(${sliderPosition}% - 2px)` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border-2 border-primary/40 flex items-center justify-center pointer-events-auto">
              <div className="flex items-center gap-0.5 text-foreground text-xs font-bold font-mono">
                <span>◀</span>
                <span>▶</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Side by Side Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Before Photo Card */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-rose-500 flex items-center gap-1">
                🔴 Sebelum Penanganan
              </span>
              {onOpenLightbox && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-2xs px-1.5"
                  onClick={() => onOpenLightbox(beforePhoto)}
                >
                  <ZoomIn className="w-3 h-3 mr-1" />
                  Perbesar
                </Button>
              )}
            </div>
            <div className="relative aspect-video rounded-xl overflow-hidden border border-border/80 bg-black/60 shadow-xs">
              <img
                src={getOptimizedImageUrl(beforePhoto, 600, 80)}
                alt="Sebelum penanganan"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* After Photo Card */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-500 flex items-center gap-1">
                🟢 Sesudah Penanganan
              </span>
              {onOpenLightbox && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-2xs px-1.5"
                  onClick={() => onOpenLightbox(afterPhoto)}
                >
                  <ZoomIn className="w-3 h-3 mr-1" />
                  Perbesar
                </Button>
              )}
            </div>
            <div className="relative aspect-video rounded-xl overflow-hidden border border-border/80 bg-black/60 shadow-xs">
              <img
                src={getOptimizedImageUrl(afterPhoto, 600, 80)}
                alt="Sesudah penanganan"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}

      {/* Multiple Photos Thumbnail Selectors (if available) */}
      {(beforePhotos.length > 1 || afterPhotos.length > 1) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
          {beforePhotos.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              <span className="text-2xs text-muted-foreground shrink-0">Pilih Foto Sebelum:</span>
              {beforePhotos.map((src, idx) => (
                <button
                  key={src + idx}
                  type="button"
                  onClick={() => setSelectedBeforeIdx(idx)}
                  className={`relative w-10 h-7 rounded overflow-hidden border transition-all shrink-0 ${
                    selectedBeforeIdx === idx ? 'ring-2 ring-rose-500 border-transparent' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={getOptimizedImageUrl(src, 100, 60)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {afterPhotos.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 sm:justify-end">
              <span className="text-2xs text-muted-foreground shrink-0">Pilih Foto Sesudah:</span>
              {afterPhotos.map((src, idx) => (
                <button
                  key={src + idx}
                  type="button"
                  onClick={() => setSelectedAfterIdx(idx)}
                  className={`relative w-10 h-7 rounded overflow-hidden border transition-all shrink-0 ${
                    selectedAfterIdx === idx ? 'ring-2 ring-emerald-500 border-transparent' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={getOptimizedImageUrl(src, 100, 60)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
