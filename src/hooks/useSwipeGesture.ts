import { useRef } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export const useSwipeGesture = (handlers: SwipeHandlers) => {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const threshold = handlers.threshold || 50;

  const handleTouchStart = (e: TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart.current) return;

    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) handlers.onSwipeRight?.();
        else handlers.onSwipeLeft?.();
      }
    } else {
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0) handlers.onSwipeDown?.();
        else handlers.onSwipeUp?.();
      }
    }

    touchStart.current = null;
  };

  return { handleTouchStart, handleTouchEnd };
};
