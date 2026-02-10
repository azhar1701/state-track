import { useRef, useEffect } from 'react';
import { useSwipeGesture } from './useSwipeGesture';

export const SwipeContainer = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  className = '',
}: {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { handleTouchStart, handleTouchEnd } = useSwipeGesture({
    onSwipeLeft,
    onSwipeRight,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart);
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};
