import { Button } from '@/components/ui/button';
import { Plus, Minus, Navigation, Maximize2 } from 'lucide-react';

interface MobileMapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  onFullscreen?: () => void;
}

export const MobileMapControls = ({
  onZoomIn,
  onZoomOut,
  onLocate,
  onFullscreen,
}: MobileMapControlsProps) => {
  return (
    <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-1 bg-background/90 backdrop-blur-md border border-border/80 shadow-float rounded-2xl p-1">
      <Button
        onClick={onLocate}
        size="icon"
        variant="ghost"
        className="h-11 w-11 rounded-xl btn-haptic hover:bg-muted/60 text-primary transition-transform active:scale-95"
        title="Lokasi Saya"
        aria-label="Lokasi Saya"
      >
        <Navigation className="h-5 w-5 fill-current" />
      </Button>

      <div className="h-px bg-border/60 mx-2 my-0.5" />

      <Button
        onClick={onZoomIn}
        size="icon"
        variant="ghost"
        className="h-11 w-11 rounded-xl btn-haptic hover:bg-muted/60 transition-transform active:scale-95"
        title="Perbesar"
        aria-label="Perbesar Peta"
      >
        <Plus className="h-5 w-5" />
      </Button>

      <div className="h-px bg-border/60 mx-2 my-0.5" />

      <Button
        onClick={onZoomOut}
        size="icon"
        variant="ghost"
        className="h-11 w-11 rounded-xl btn-haptic hover:bg-muted/60 transition-transform active:scale-95"
        title="Perkecil"
        aria-label="Perkecil Peta"
      >
        <Minus className="h-5 w-5" />
      </Button>

      {onFullscreen && (
        <>
          <div className="h-px bg-border/60 mx-2 my-0.5" />
          <Button
            onClick={onFullscreen}
            size="icon"
            variant="ghost"
            className="h-11 w-11 rounded-xl btn-haptic hover:bg-muted/60 transition-transform active:scale-95"
            title="Layar Penuh"
            aria-label="Mode Layar Penuh"
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
        </>
      )}
    </div>
  );
};
