import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

type SliderSize = 'sm' | 'md';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { size?: SliderSize }
>(({ className, size = 'md', ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className={cn(
      "relative w-full grow overflow-hidden rounded-full bg-secondary/90 border border-border/60 dark:border-slate-700/80 dark:bg-slate-800 shadow-inner",
      size === 'sm' ? 'h-1.5' : 'h-2'
    )}>
      <SliderPrimitive.Range className="absolute h-full bg-primary shadow-sm" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className={cn(
      "block rounded-full border-2 border-primary bg-background dark:bg-slate-100 ring-2 ring-primary/30 shadow-md hover:scale-110 active:scale-95 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
    )} />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
