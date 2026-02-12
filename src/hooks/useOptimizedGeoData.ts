import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FeatureCollection, Geometry } from 'geojson';

interface CachedLayer {
  data: FeatureCollection<Geometry>;
  timestamp: number;
  size: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

export const useOptimizedGeoData = () => {
  const cacheRef = useRef<Map<string, CachedLayer>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const getCacheSize = useCallback(() => {
    let total = 0;
    cacheRef.current.forEach(item => total += item.size);
    return total;
  }, []);

  const evictOldestCache = useCallback(() => {
    const entries = Array.from(cacheRef.current.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    while (getCacheSize() > MAX_CACHE_SIZE && entries.length > 0) {
      const [key] = entries.shift()!;
      cacheRef.current.delete(key);
    }
  }, [getCacheSize]);

  const fetchLayerOptimized = useCallback(async (
    layerKey: string,
    options?: { forceRefresh?: boolean; simplify?: boolean }
  ): Promise<FeatureCollection<Geometry> | null> => {
    const now = Date.now();
    const cached = cacheRef.current.get(layerKey);

    if (!options?.forceRefresh && cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    if (loading.has(layerKey)) return null;

    setLoading(prev => new Set(prev).add(layerKey));

    try {
      const controller = new AbortController();
      abortControllersRef.current.set(layerKey, controller);

      // Fetch only necessary fields
      const { data, error } = await supabase
        .from('geo_layers')
        .select('data')
        .eq('key', layerKey)
        .single()
        .abortSignal(controller.signal);

      if (error) throw error;

      const raw = data.data as { featureCollection?: FeatureCollection<Geometry> };
      let fc = raw.featureCollection;

      if (!fc) throw new Error('Invalid data');

      // Simplify if requested
      if (options?.simplify && fc.features.length > 1000) {
        fc = {
          ...fc,
          features: fc.features.map(f => ({
            ...f,
            properties: Object.keys(f.properties || {}).length > 10
              ? Object.fromEntries(Object.entries(f.properties || {}).slice(0, 10))
              : f.properties
          }))
        };
      }

      const size = JSON.stringify(fc).length;
      cacheRef.current.set(layerKey, { data: fc, timestamp: now, size });

      if (getCacheSize() > MAX_CACHE_SIZE) {
        evictOldestCache();
      }

      return fc;
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === 'AbortError') return null;
      throw error;
    } finally {
      setLoading(prev => {
        const next = new Set(prev);
        next.delete(layerKey);
        return next;
      });
      abortControllersRef.current.delete(layerKey);
    }
  }, [loading, getCacheSize, evictOldestCache]);

  const prefetchLayers = useCallback(async (layerKeys: string[]) => {
    const promises = layerKeys.map(key => 
      fetchLayerOptimized(key, { simplify: true }).catch(() => null)
    );
    await Promise.allSettled(promises);
  }, [fetchLayerOptimized]);

  const clearCache = useCallback((layerKey?: string) => {
    if (layerKey) {
      cacheRef.current.delete(layerKey);
    } else {
      cacheRef.current.clear();
    }
  }, []);

  const abortFetch = useCallback((layerKey: string) => {
    const controller = abortControllersRef.current.get(layerKey);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(layerKey);
    }
  }, []);

  useEffect(() => {
    const controllers = abortControllersRef.current;
    return () => {
      controllers.forEach(controller => controller.abort());
      controllers.clear();
    };
  }, []);

  return {
    fetchLayerOptimized,
    prefetchLayers,
    clearCache,
    abortFetch,
    isLoading: (key: string) => loading.has(key),
    cacheSize: getCacheSize(),
  };
};
