import { Button } from '@/components/ui/button';
import { Plus, Minus, Navigation, Maximize2 } from 'lucide-react';

interface MobileMapControlsProps {
 onZoomIn: () => void;
 onZoomOut: () => void;
 onLocate: () => void;
 onFullscreen?: () => void;
}

export const MobileMapControls = ({ onZoomIn, onZoomOut, onLocate,
 onFullscreen }: MobileMapControlsProps) => {
 return (
 <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-1 bg-popover/95 border-border shadow-lg rounded-2xl p-1 shadow-md">
 <Button onClick={onLocate} size="icon" variant="ghost" className="h-12 w-12 rounded-xl btn-haptic hover:bg-white/10 text-primary">
 <Navigation className="h-5 w-5 fill-current" />
 </Button>

 <div className="h-px bg-white/10 dark:bg-white/5 mx-2 my-1" />

 <Button onClick={onZoomIn} size="icon" variant="ghost" className="h-12 w-12 rounded-xl btn-haptic hover:bg-white/10">
 <Plus className="h-5 w-5" />
 </Button>
 <div className="h-px bg-white/10 dark:bg-white/5 mx-2 my-1" />
 <Button onClick={onZoomOut} size="icon" variant="ghost" className="h-12 w-12 rounded-xl btn-haptic hover:bg-white/10">
 <Minus className="h-5 w-5" />
 </Button>

 {onFullscreen && (
 <>
 <div className="h-px bg-white/10 dark:bg-white/5 mx-2 my-1" />
 <Button onClick={onFullscreen} size="icon" variant="ghost" className="h-12 w-12 rounded-xl btn-haptic hover:bg-white/10">
 <Maximize2 className="h-5 w-5" />
 </Button>
 </>
 )}
 </div>
 );
};
