import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FeatureCollection, Geometry } from 'geojson';

// Strict schema matching database
export interface LayerData {
  id?: string;
  key: string;
  name: string;
  geometry_type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon' | 'GeometryCollection' | null;
  data: {
    featureCollection: FeatureCollection<Geometry>;
    crs: string;
    storageUrl?: string;
    meta?: Record<string, unknown>;
    style?: Record<string, unknown>;
  };
  created_at?: string;
}

const sanitizeFilename = (name: string): string => 
  name.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_').toLowerCase();

const sanitizeText = (text: string): string => 
  text.replace(/[""]/g, '"').replace(/['']/g, "'");

export const useLayerManager = () => {
  const [layers, setLayers] = useState<LayerData[]>([]);
  const [loading, setLoading] = useState(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const loadedLayersRef = useRef<Set<string>>(new Set());
  const errorLayersRef = useRef<Set<string>>(new Set());

  const fetchLayers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('geo_layers')
        .select('id,key,name,geometry_type,created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const rows = (data || []) as Array<{
        id: string;
        key: string;
        name: string;
        geometry_type: string | null;
        created_at: string;
      }>;
      const uniqueLayers = Array.from(
        new Map(rows.map((l) => [l.id, { ...l, data: null } as LayerData])).values()
      );
      
      setLayers(uniqueLayers as LayerData[]);
    } catch (error) {
      console.error('[useLayerManager] Fetch failed:', error);
      toast.error('Gagal memuat layers', { id: 'fetch-layers-error' });
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadLayer = useCallback(async (params: {
    key: string;
    name: string;
    geometry_type: LayerData['geometry_type'];
    data: FeatureCollection<Geometry>;
    file?: File;
  }): Promise<boolean> => {
    const sanitizedKey = sanitizeFilename(params.key);
    const toastId = `upload-${sanitizedKey}`;

    try {
      // Validate structure
      if (!params.data?.type || params.data.type !== 'FeatureCollection') {
        toast.error('Format GeoJSON tidak valid', { 
          id: toastId,
          description: 'Data harus berupa FeatureCollection' 
        });
        return false;
      }

      let storageUrl: string | undefined;

      // Upload to storage if file provided
      if (params.file) {
        const sanitizedFilename = sanitizeFilename(params.file.name);
        const filePath = `layers/${Date.now()}_${sanitizedFilename}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('geo-layers')
          .upload(filePath, params.file, { upsert: false });

        if (uploadError) {
          toast.error('Gagal upload file', { id: toastId, description: uploadError.message });
          return false;
        }

        const { data: urlData } = supabase.storage
          .from('geo-layers')
          .getPublicUrl(uploadData.path);
        
        storageUrl = urlData.publicUrl;
      }

      // Strict payload matching schema
      const payload: Omit<LayerData, 'id' | 'created_at'> = {
        key: sanitizedKey,
        name: sanitizeText(params.name),
        geometry_type: params.geometry_type,
        data: {
          featureCollection: params.data,
          crs: 'EPSG:4326',
          ...(storageUrl && { storageUrl }),
        },
      };

      const { error: dbError } = await supabase
        .from('geo_layers')
        .upsert(payload, { onConflict: 'key' });

      if (dbError) {
        toast.error('Gagal menyimpan layer', { id: toastId, description: dbError.message });
        return false;
      }

      toast.success('Layer berhasil disimpan', { id: toastId });
      await fetchLayers();
      
      // Broadcast event
      window.dispatchEvent(new CustomEvent('layer-updated', { detail: { key: sanitizedKey } }));
      
      return true;
    } catch (error) {
      console.error('[useLayerManager] Upload failed:', error);
      toast.error('Terjadi kesalahan saat upload', { id: toastId });
      return false;
    }
  }, [fetchLayers]);

  const deleteLayer = useCallback(async (layer: LayerData): Promise<boolean> => {
    const toastId = `delete-${layer.id}`;

    try {
      // Abort any pending fetches for this layer
      const controller = abortControllersRef.current.get(layer.key);
      if (controller) {
        controller.abort();
        abortControllersRef.current.delete(layer.key);
      }

      // Delete from storage if exists
      if (layer.data?.storageUrl) {
        const pathMatch = layer.data.storageUrl.match(/layers\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from('geo-layers').remove([`layers/${pathMatch[1]}`]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('geo_layers')
        .delete()
        .eq('id', layer.id || '');

      if (error) {
        // Fallback to key-based delete
        const { error: keyError } = await supabase
          .from('geo_layers')
          .delete()
          .eq('key', layer.key);
        
        if (keyError) throw keyError;
      }

      toast.success('Layer berhasil dihapus', { id: toastId });
      
      // Optimistic update
      setLayers(prev => prev.filter(l => l.id !== layer.id));
      
      // Clear caches
      loadedLayersRef.current.delete(layer.key);
      errorLayersRef.current.delete(layer.key);
      
      // Broadcast deletion
      window.dispatchEvent(new CustomEvent('layer-deleted', { 
        detail: { layerId: layer.id, layerKey: layer.key } 
      }));
      
      return true;
    } catch (error) {
      console.error('[useLayerManager] Delete failed:', error);
      toast.error('Gagal menghapus layer', { id: toastId });
      return false;
    }
  }, []);

  const updateLayer = useCallback(async (
    id: string, 
    updates: Partial<Pick<LayerData, 'name' | 'geometry_type'>>
  ): Promise<boolean> => {
    const toastId = `update-${id}`;

    try {
      const sanitized = {
        ...(updates.name && { name: sanitizeText(updates.name) }),
        ...(updates.geometry_type !== undefined && { geometry_type: updates.geometry_type }),
      };

      const { error } = await supabase
        .from('geo_layers')
        .update(sanitized)
        .eq('id', id);

      if (error) throw error;

      toast.success('Layer berhasil diperbarui', { id: toastId });
      await fetchLayers();
      
      window.dispatchEvent(new CustomEvent('layer-updated', { detail: { layerId: id } }));
      
      return true;
    } catch (error) {
      console.error('[useLayerManager] Update failed:', error);
      toast.error('Gagal memperbarui layer', { id: toastId });
      return false;
    }
  }, [fetchLayers]);

  const fetchLayerData = useCallback(async (
    key: string
  ): Promise<FeatureCollection<Geometry> | null> => {
    // Check cache
    if (loadedLayersRef.current.has(key)) {
      return null; // Already loaded
    }

    // Check error cache
    if (errorLayersRef.current.has(key)) {
      return null; // Previously failed
    }

    const toastId = `fetch-${key}`;

    try {
      // Create abort controller
      const controller = new AbortController();
      abortControllersRef.current.set(key, controller);

      // Cache busting with timestamp
      const timestamp = Date.now();
      const { data, error } = await supabase
        .from('geo_layers')
        .select('data')
        .eq('key', key)
        .limit(1)
        .maybeSingle()
        .abortSignal(controller.signal);

      if (error) throw error;
      if (!data?.data) throw new Error('No data found');

      const raw = data.data as LayerData['data'];
      const fc = raw.featureCollection;

      if (!fc || fc.type !== 'FeatureCollection') {
        throw new Error('Invalid FeatureCollection');
      }

      // Mark as loaded
      loadedLayersRef.current.add(key);
      abortControllersRef.current.delete(key);

      return fc;
    } catch (error: unknown) {
      // Ignore abort errors
      if ((error as { name?: string })?.name === 'AbortError') {
        return null;
      }

      console.error(`[useLayerManager] Fetch layer ${key} failed:`, error);
      
      // Mark as errored
      errorLayersRef.current.add(key);
      abortControllersRef.current.delete(key);

      // Single toast with static ID
      toast.error(`Gagal memuat layer: ${key}`, { 
        id: toastId,
        description: (error instanceof Error ? error.message : String(error)) || 'Layer tidak ditemukan atau format tidak valid'
      });

      return null;
    }
  }, []);

  const clearCache = useCallback((key?: string) => {
    if (key) {
      loadedLayersRef.current.delete(key);
      errorLayersRef.current.delete(key);
    } else {
      loadedLayersRef.current.clear();
      errorLayersRef.current.clear();
    }
  }, []);

  return {
    layers,
    loading,
    fetchLayers,
    uploadLayer,
    deleteLayer,
    updateLayer,
    fetchLayerData,
    clearCache,
  };
};
