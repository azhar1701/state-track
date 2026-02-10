import { useEffect, useRef } from 'react';
import L from 'leaflet';

export function useMapResize(map: L.Map | null, dependencies: unknown[] = []) {
  const timeoutRef = useRef<number | null>(null);
  const depsRef = useRef(dependencies);

  useEffect(() => {
    depsRef.current = dependencies;
  }, [dependencies]);

  useEffect(() => {
    if (!map) return;

    const invalidateMap = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = window.setTimeout(() => {
        map.invalidateSize();
      }, 300);
    };

    // Invalidate on mount
    invalidateMap();

    // Listen to window resize
    window.addEventListener('resize', invalidateMap);

    // Listen to orientation change
    window.addEventListener('orientationchange', invalidateMap);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      window.removeEventListener('resize', invalidateMap);
      window.removeEventListener('orientationchange', invalidateMap);
    };
  }, [map]);

  // Manual trigger function
  const invalidateSize = () => {
    if (map) {
      setTimeout(() => map.invalidateSize(), 100);
    }
  };

  return { invalidateSize };
}
