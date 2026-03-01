import { logger } from "@/lib/logger";
import { useState, useCallback } from 'react';
import { supabase } from '@/services/client';
import { toast } from 'sonner';

export const useSystemSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSetting = useCallback(async <T,>(category: string, key: string): Promise<T | null> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('category', category)
        .eq('key', key)
        .maybeSingle();

      if (error) throw error;
      return data?.value as T || null;
    } catch (error) {
      logger.error(`Failed to fetch ${category}.${key}:`, error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSetting = useCallback(async (category: string, key: string, value: unknown) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('app_settings')
        .upsert({ category, key, value }, { onConflict: 'category,key' });

      if (error) throw error;
      toast.success('Pengaturan berhasil disimpan');
    } catch (error) {
      logger.error(`Failed to save ${category}.${key}:`, error);
      toast.error('Gagal menyimpan pengaturan');
      throw error;
    } finally {
      setSaving(false);
    }
  }, []);

  return { fetchSetting, saveSetting, loading, saving };
};
