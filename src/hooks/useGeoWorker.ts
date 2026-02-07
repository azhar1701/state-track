import { useEffect, useRef, useState } from 'react';
import { wrap, Remote } from 'comlink';
import type { GeoWorker } from '@/workers/geo.worker';
import type { FeatureCollection, Geometry } from 'geojson';

export function useGeoWorker() {
  const workerRef = useRef<Worker | null>(null);
  const apiRef = useRef<Remote<GeoWorker> | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const worker = new Worker(new URL('@/workers/geo.worker.ts', import.meta.url), {
      type: 'module',
    });
    
    workerRef.current = worker;
    apiRef.current = wrap<GeoWorker>(worker);
    setIsReady(true);

    return () => {
      worker.terminate();
      workerRef.current = null;
      apiRef.current = null;
    };
  }, []);

  const parseAndReproject = async (data: FeatureCollection<Geometry>): Promise<FeatureCollection<Geometry>> => {
    if (!apiRef.current) throw new Error('Worker not ready');
    return apiRef.current.parseAndReproject(data);
  };

  return { parseAndReproject, isReady };
}
