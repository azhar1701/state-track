import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "admin:backupConfig";

export type BackupConfig = {
  schedule?: {
    autoBackup: boolean;
    backupFrequency: "daily" | "weekly" | "monthly";
    backupTime: string;
    includeReports: boolean;
    includeGeoLayers: boolean;
    includeSettings: boolean;
    includeUsers: boolean;
    retentionDays: number;
  };
  lastBackup?: string;
};

const defaultConfig: BackupConfig = {
  schedule: {
    autoBackup: false,
    backupFrequency: "daily",
    backupTime: "02:00",
    includeReports: true,
    includeGeoLayers: true,
    includeSettings: true,
    includeUsers: false,
    retentionDays: 30,
  },
};

export const useBackupConfig = () => {
  const [config, setConfig] = useState<BackupConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<BackupConfig>;
          setConfig(prev => ({ ...prev, ...parsed }));
        }

        const { error: checkError } = await supabase
          .from("system_settings")
          .select("id")
          .limit(1);

        if (checkError) {
          console.warn("System settings table not available yet");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("system_settings")
          .select("value")
          .eq("category", "backup")
          .eq("key", "config")
          .maybeSingle();

        if (error) throw error;

        if (data?.value) {
          const supabaseConfig = data.value as Partial<BackupConfig>;
          setConfig(prev => ({ ...prev, ...supabaseConfig }));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(supabaseConfig));
        }
      } catch (error) {
        console.warn("Failed to load backup config", error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const saveConfig = useCallback(async (newConfig: Partial<BackupConfig>) => {
    try {
      const updated = { ...config, ...newConfig };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setConfig(updated);

      const { error: checkError } = await supabase
        .from("system_settings")
        .select("id")
        .limit(1);

      if (checkError) {
        console.warn("System settings table not available yet");
        return;
      }

      const { error } = await supabase
        .from("system_settings")
        .upsert({
          category: "backup",
          key: "config",
          value: updated,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "category,key",
        });

      if (error) throw error;
    } catch (error) {
      console.error("Failed to save backup config", error);
    }
  }, [config]);

  return {
    config,
    saveConfig,
    loading,
  };
};
