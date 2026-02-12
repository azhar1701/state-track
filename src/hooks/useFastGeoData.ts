import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FeatureCollection, Geometry } from 'geojson';
import { geoOptimizer } from '@/lib/geoOptimizer';
import { geoCache } from '@/lib/geoCache';
import { toast } from 'sonner';

interface FetchOptions {
  forceRefresh?: boolean;
  simplify?: boolean;
  tolerance?: number;
  bounds?: [number, number, number, number];
  zoom?: number;
  keepFields?: string[];
  useCache?: boolean;
}

export const useFastGeoData = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const fetchLayer = useCallback(async (
    layerKey: string,
    options: FetchOptions = {}
  ): Promise<FeatureCollection<Geometry> | null> => {
    const {
      forceRefresh = false,
      simplify = true,
      tolerance = 0.0001,
      bounds,
      zoom,
      keepFields,
      useCache = true,
    } = options;

    // Check cache first
    if (useCache && !forceRefresh) {
      const cached = await geoCache.get(layerKey);
      if (cached) return cached;
    }

    setLoading(prev => ({ ...prev, [layerKey]: true }));

    try {
      const { data, error } = await supabase
        .from('geo_layers')
        .select('data')
        .eq('key', layerKey)
        .single();

      if (error) throw error;

      const raw = data.data as { featureCollection?: FeatureCollection<Geometry> };
      let fc = raw.featureCollection;

      if (!fc) throw new Error('Invalid data');

      // Optimize
      fc = geoOptimizer.optimize(fc, {
        simplify,
        tolerance,
        bounds,
        zoom,
        reduceProps: !!keepFields,
        keepFields,
      });

      // Cache result
      if (useCache) {
        await geoCache.set(layerKey, fc);
      }

      return fc;
    } catch (error) {
      console.error(`Failed to fetch layer ${layerKey}:`, error);
      toast.error(`Gagal memuat layer: ${layerKey}`);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, [layerKey]: false }));
    }
  }, []);

  const prefetchLayers = useCallback(async (layerKeys: string[]) => {
    const promises = layerKeys.map(key =>
      fetchLayer(key, { simplify: true, useCache: true }).catch(() => null)
    );
    await Promise.allSettled(promises);
  }, [fetchLayer]);

  const clearCache = useCallback(async (layerKey?: string) => {
    if (layerKey) {
      await geoCache.delete(layerKey);
    } else {
      await geoCache.clear();
    }
  }, []);

  const getCacheSize = useCallback(async () => {
    return await geoCache.getSize();
  }, []);

  return {
    fetchLayer,
    prefetchLayers,
    clearCache,
    getCacheSize,
    isLoading: (key: string) => loading[key] || false,
  };
};
