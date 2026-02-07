import { ReactNode, useEffect, useRef } from 'react';
import { useMapResize } from '@/hooks/useMapResize';
import { cn } from '@/lib/utils';
import L from 'leaflet';

interface ResponsiveMapContainerProps {
  children: ReactNode;
  mapInstance: L.Map | null;
  className?: string;
  sidebarOpen?: boolean;
}

export function ResponsiveMapContainer({
  children,
  mapInstance,
  className,
  sidebarOpen,
}: ResponsiveMapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-resize map when sidebar toggles or window resizes
  useMapResize(mapInstance, [sidebarOpen]);

  // Additional resize on container size change
  useEffect(() => {
    if (!containerRef.current || !mapInstance) return;

    const resizeObserver = new ResizeObserver(() => {
      setTimeout(() => mapInstance.invalidateSize(), 100);
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [mapInstance]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full h-full transition-all duration-300',
        className
      )}
    >
      {children}
    </div>
  );
}
