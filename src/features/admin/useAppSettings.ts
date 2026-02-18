import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/client';
import { toast } from 'sonner';

type SettingValue = Record<string, unknown>;

export const useAppSettings = (category: string, key: string) => {
  const [value, setValue] = useState<SettingValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSetting = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('category', category)
        .eq('key', key)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setValue(data?.value || null);
    } catch (error) {
      console.error('Failed to fetch setting:', error);
      setValue(null);
    } finally {
      setLoading(false);
    }
  }, [category, key]);

  const saveSetting = useCallback(async (newValue: SettingValue) => {
    try {
      setSaving(true);
      
      // Try RPC first
      const { error: rpcError } = await supabase.rpc('update_app_setting', {
        p_category: category,
        p_key: key,
        p_value: newValue
      });

      // If RPC fails, try direct upsert
      if (rpcError) {
        const { error: upsertError } = await supabase
          .from('app_settings')
          .upsert({
            category,
            key,
            value: newValue
          }, {
            onConflict: 'category,key'
          });
        
        if (upsertError) throw upsertError;
      }

      setValue(newValue);
      toast.success('Pengaturan berhasil disimpan');
      return true;
    } catch (error) {
      console.error('Failed to save setting:', error);
      toast.error('Gagal menyimpan pengaturan');
      return false;
    } finally {
      setSaving(false);
    }
  }, [category, key]);

  useEffect(() => {
    void fetchSetting();
  }, [fetchSetting]);

  return { value, loading, saving, saveSetting, refetch: fetchSetting };
};
