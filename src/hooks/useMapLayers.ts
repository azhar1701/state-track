import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FeatureCollection, Geometry } from 'geojson';

export interface LayerStyleConfig {
  color?: string;
  weight?: number;
  opacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  dashArray?: string;
  radius?: number;
}

export interface PopupConfig {
  fields: string[];
  template?: string | null;
}

export interface LegendConfig {
  label: string;
  color: string;
  visible: boolean;
  icon?: string;
}

export interface GeoLayer {
  id: string;
  key: string;
  name: string;
  layer_type: 'geojson' | 'wms' | 'cluster' | 'heatmap' | 'tile';
  geometry_type: string | null;
  style_config: LayerStyleConfig;
  popup_config: PopupConfig;
  legend_config: LegendConfig;
  z_index: number;
  opacity: number;
  visible: boolean;
  data: {
    featureCollection?: FeatureCollection<Geometry>;
    url?: string;
    crs?: string;
  };
  metadata: Record<string, unknown>;
  created_at: string;
}

const LAYER_CACHE_TIME = 5 * 60 * 1000; // 5 minutes
const LAYER_STALE_TIME = 2 * 60 * 1000; // 2 minutes

export const useMapLayers = () => {
  const queryClient = useQueryClient();

  // Fetch all layers
  const { data: layers = [], isLoading, error } = useQuery<GeoLayer[]>({
    queryKey: ['map-layers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geo_layers')
        .select('*')
        .eq('visible', true)
        .order('z_index', { ascending: true });

      if (error) throw error;
      return (data || []) as GeoLayer[];
    },
    staleTime: LAYER_STALE_TIME,
    gcTime: LAYER_CACHE_TIME,
    retry: 1,
  });

  // Fetch single layer data (lazy load)
  const useLayerData = (layerKey: string, enabled = true) => {
    return useQuery({
      queryKey: ['layer-data', layerKey],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('geo_layers')
          .select('data')
          .eq('key', layerKey)
          .single();

        if (error) throw error;

        const raw = data.data as GeoLayer['data'];
        if (raw.featureCollection) return raw.featureCollection;
        if (raw.url) {
          const res = await fetch(`${raw.url}?t=${Date.now()}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        }
        throw new Error('No data source');
      },
      staleTime: LAYER_CACHE_TIME,
      gcTime: LAYER_CACHE_TIME * 2,
      enabled,
      retry: false,
      onError: (err: Error) => {
        toast.error(`Failed to load layer: ${layerKey}`, {
          id: `layer-error-${layerKey}`,
          description: err.message,
        });
      },
    });
  };

  // Update layer visibility
  const toggleVisibility = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase
        .from('geo_layers')
        .update({ visible })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-layers'] });
    },
  });

  // Update layer opacity
  const updateOpacity = useMutation({
    mutationFn: async ({ id, opacity }: { id: string; opacity: number }) => {
      const { error } = await supabase
        .from('geo_layers')
        .update({ opacity })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, opacity }) => {
      await queryClient.cancelQueries({ queryKey: ['map-layers'] });
      const prev = queryClient.getQueryData<GeoLayer[]>(['map-layers']);
      queryClient.setQueryData<GeoLayer[]>(['map-layers'], (old) =>
        old?.map((l) => (l.id === id ? { ...l, opacity } : l))
      );
      return { prev };
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(['map-layers'], context?.prev);
      toast.error('Failed to update opacity');
    },
  });

  // Update layer z-index (reorder)
  const updateZIndex = useMutation({
    mutationFn: async ({ id, z_index }: { id: string; z_index: number }) => {
      const { error } = await supabase
        .from('geo_layers')
        .update({ z_index })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-layers'] });
    },
  });

  // Update style config
  const updateStyle = useMutation({
    mutationFn: async ({ id, style_config }: { id: string; style_config: LayerStyleConfig }) => {
      const { error } = await supabase
        .from('geo_layers')
        .update({ style_config })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-layers'] });
      toast.success('Style updated');
    },
  });

  return {
    layers,
    isLoading,
    error,
    useLayerData,
    toggleVisibility,
    updateOpacity,
    updateZIndex,
    updateStyle,
  };
};
