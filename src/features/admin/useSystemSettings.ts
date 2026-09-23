import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/api-errors";
import { useState, useCallback } from 'react';
import { supabase } from '@/services/client';
import { toast } from 'sonner';

export type SaveSettingOptions = {
  silent?: boolean;
};

export const useSystemSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSetting = useCallback(async <T,>(category: string, key: string): Promise<T | null> => {
    try {
      setLoading(true);
      // Prioritize system_settings table
      const { data: sysData, error: sysError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('category', category)
        .eq('key', key)
        .maybeSingle();

      if (!sysError && sysData?.value !== undefined && sysData?.value !== null) {
        return sysData.value as T;
      }

      // Fallback to app_settings if not found in system_settings
      const { data: appData, error: appError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('category', category)
        .eq('key', key)
        .maybeSingle();

      if (!appError && appData?.value !== undefined && appData?.value !== null) {
        return appData.value as unknown as T;
      }

      return null;
    } catch (error) {
      logger.error(`Failed to fetch ${category}.${key}:`, error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSetting = useCallback(async (
    category: string,
    key: string,
    value: unknown,
    options?: SaveSettingOptions
  ) => {
    try {
      setSaving(true);
      // Try upserting to system_settings first
      const { error: sysError } = await supabase
        .from('system_settings')
        .upsert(
          { category, key, value: value as Record<string, unknown> },
          { onConflict: 'category,key' }
        );

      if (sysError) {
        logger.warn(`Could not save to system_settings (${sysError.message}), falling back to app_settings`);
        const { error: appError } = await supabase
          .from('app_settings')
          .upsert(
            { category, key, value: value as Record<string, unknown> },
            { onConflict: 'category,key' }
          );

        if (appError) throw appError;
      }

      if (!options?.silent) {
        toast.success('Pengaturan berhasil disimpan');
      }
    } catch (error) {
      logger.error(`Failed to save ${category}.${key}:`, error);
      if (!options?.silent) {
        toast.error(handleApiError(error, 'Gagal menyimpan pengaturan'));
      }
      throw error;
    } finally {
      setSaving(false);
    }
  }, []);

  return { fetchSetting, saveSetting, loading, saving };
};

