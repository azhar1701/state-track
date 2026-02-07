import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap } from 'lucide-react';

export const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: 0,
    loadTime: 0,
  });
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show only in development or when ?debug=true
    const isDev = import.meta.env.DEV;
    const hasDebug = new URLSearchParams(window.location.search).has('debug');
    setShow(isDev || hasDebug);

    if (!show) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setMetrics((prev) => ({
          ...prev,
          fps: Math.round((frameCount * 1000) / (currentTime - lastTime)),
        }));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    // Memory usage
    if ('memory' in performance) {
      const updateMemory = () => {
        const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        setMetrics((prev) => ({
          ...prev,
          memory: Math.round(mem.usedJSHeapSize / 1048576),
        }));
      };
      const memInterval = setInterval(updateMemory, 2000);
      
      return () => {
        cancelAnimationFrame(animationId);
        clearInterval(memInterval);
      };
    }

    return () => cancelAnimationFrame(animationId);
  }, [show]);

  useEffect(() => {
    if ('performance' in window && 'timing' in performance) {
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      setMetrics((prev) => ({ ...prev, loadTime: Math.round(loadTime) }));
    }
  }, []);

  if (!show) return null;

  const fpsColor = metrics.fps >= 50 ? 'text-emerald-500' : metrics.fps >= 30 ? 'text-amber-500' : 'text-red-500';

  return (
    <Card className="fixed top-20 right-4 z-[9999] glass-panel p-3 text-xs space-y-2 w-48">
      <div className="flex items-center gap-2 font-semibold">
        <Activity className="w-4 h-4" />
        Performance
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">FPS:</span>
          <Badge variant="outline" className={fpsColor}>
            {metrics.fps}
          </Badge>
        </div>
        
        {metrics.memory > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Memory:</span>
            <Badge variant="outline">{metrics.memory} MB</Badge>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Load:</span>
          <Badge variant="outline">{metrics.loadTime} ms</Badge>
        </div>
      </div>
    </Card>
  );
};
