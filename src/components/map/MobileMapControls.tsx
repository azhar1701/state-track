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
  onFullscreen 
}: MobileMapControlsProps) => {
  return (
    <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-2">
      <div className="flex flex-col gap-1 glass-panel rounded-xl p-1">
        <Button
          onClick={onZoomIn}
          size="icon"
          variant="ghost"
          className="h-12 w-12 rounded-lg btn-haptic"
        >
          <Plus className="h-5 w-5" />
        </Button>
        <div className="h-px bg-border mx-2" />
        <Button
          onClick={onZoomOut}
          size="icon"
          variant="ghost"
          className="h-12 w-12 rounded-lg btn-haptic"
        >
          <Minus className="h-5 w-5" />
        </Button>
      </div>

      <Button
        onClick={onLocate}
        size="icon"
        className="h-12 w-12 rounded-xl shadow-float btn-haptic"
      >
        <Navigation className="h-5 w-5" />
      </Button>

      {onFullscreen && (
        <Button
          onClick={onFullscreen}
          size="icon"
          variant="outline"
          className="h-12 w-12 rounded-xl shadow-float btn-haptic"
        >
          <Maximize2 className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};
