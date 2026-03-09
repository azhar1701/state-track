import { logger } from "@/lib/logger";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/services/client";
import { toast } from "sonner";

const STORAGE_KEY = "admin:securityConfig";

export type SecurityConfig = {
  authentication: {
    requireMFA: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    passwordMinLength: number;
    requireStrongPassword: boolean;
    allowAnonymous: boolean;
  };
  access: {
    ipWhitelist: string;
    enableRateLimit: boolean;
    maxRequestsPerMinute: number;
    enableCORS: boolean;
    allowedOrigins: string;
    requireEmailVerification: boolean;
  };
  audit: {
    enableAuditLog: boolean;
    logAuthEvents: boolean;
    logDataChanges: boolean;
    logAPIAccess: boolean;
    retentionDays: number;
    alertOnSuspicious: boolean;
  };
  encryption: {
    encryptSensitiveData: boolean;
    encryptPhotos: boolean;
    encryptBackups: boolean;
    keyRotationDays: number;
  };
  updatedAt?: string;
};

const defaultConfig: SecurityConfig = {
  authentication: {
    requireMFA: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    passwordMinLength: 8,
    requireStrongPassword: true,
    allowAnonymous: false,
  },
  access: {
    ipWhitelist: "",
    enableRateLimit: true,
    maxRequestsPerMinute: 60,
    enableCORS: true,
    allowedOrigins: "",
    requireEmailVerification: true,
  },
  audit: {
    enableAuditLog: true,
    logAuthEvents: true,
    logDataChanges: true,
    logAPIAccess: false,
    retentionDays: 90,
    alertOnSuspicious: true,
  },
  encryption: {
    encryptSensitiveData: true,
    encryptPhotos: false,
    encryptBackups: true,
    keyRotationDays: 90,
  },
};

export const useSecurityConfig = () => {
  const [config, setConfig] = useState<SecurityConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Load from localStorage first
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<SecurityConfig>;
          setConfig(prev => ({ ...prev, ...parsed }));
        }

        // Check if system_settings table exists
        const { error: checkError } = await supabase
          .from("system_settings")
          .select("id")
          .limit(1);

        if (checkError) {
          logger.warn("System settings table not available yet, using defaults");
          setLoading(false);
          return;
        }

        // Then load from Supabase
        const { data, error } = await supabase
          .from("system_settings")
          .select("value")
          .eq("category", "security")
          .eq("key", "config")
          .maybeSingle();

        if (error) throw error;

        if (data?.value) {
          const supabaseConfig = data.value as Partial<SecurityConfig>;
          setConfig(prev => ({ ...prev, ...supabaseConfig }));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(supabaseConfig));
        }
      } catch (error) {
        logger.warn("Failed to load security config, using defaults", error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const saveConfig = useCallback(async (newConfig: Partial<SecurityConfig>) => {
    try {
      const updated = { ...config, ...newConfig, updatedAt: new Date().toISOString() };

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setConfig(updated);

      // Check if system_settings table exists
      const { error: checkError } = await supabase
        .from("system_settings")
        .select("id")
        .limit(1);

      if (checkError) {
        logger.warn("System settings table not available yet, saved to localStorage only");
        toast.success("Pengaturan keamanan tersimpan lokal (database belum tersedia)");
        return;
      }

      // Save to Supabase
      const { error } = await supabase
        .from("system_settings")
        .upsert({
          category: "security",
          key: "config",
          value: updated,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "category,key",
        });

      if (error) throw error;

      toast.success("Pengaturan keamanan berhasil disimpan");
    } catch (error) {
      logger.error("Failed to save security config", error);
      toast.error("Gagal menyimpan ke database, tersimpan lokal saja");
    }
  }, [config]);

  const isIPAllowed = useCallback((ip: string): boolean => {
    if (!config.access.ipWhitelist.trim()) return true;

    const allowedIPs = config.access.ipWhitelist
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    return allowedIPs.some(allowed => {
      if (allowed.includes("/")) {
        // CIDR notation - simplified check
        const [network] = allowed.split("/");
        return ip.startsWith(network.split(".").slice(0, 3).join("."));
      }
      return ip === allowed;
    });
  }, [config.access.ipWhitelist]);

  const validatePassword = useCallback((password: string): { valid: boolean; message?: string } => {
    if (password.length < config.authentication.passwordMinLength) {
      return {
        valid: false,
        message: `Password minimal ${config.authentication.passwordMinLength} karakter`,
      };
    }

    if (config.authentication.requireStrongPassword) {
      const hasUpperCase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!hasUpperCase || !hasNumber || !hasSymbol) {
        return {
          valid: false,
          message: "Password harus mengandung huruf besar, angka, dan simbol",
        };
      }
    }

    return { valid: true };
  }, [config.authentication]);

  return {
    config,
    saveConfig,
    loading,
    isIPAllowed,
    validatePassword,
  };
};
