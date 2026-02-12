import { useState, useEffect } from 'react';

export type ReportConfig = {
  autoApprove: boolean;
  requirePhotos: boolean;
  minPhotos: number;
  maxPhotos: number;
  requireLocation: boolean;
  allowAnonymous: boolean;
  autoAssign: boolean;
  defaultPriority: 'rendah' | 'sedang' | 'tinggi';
  autoCloseAfterDays: number;
  enablePublicView: boolean;
  requireVerification: boolean;
};

const STORAGE_KEY = 'admin:reportSettings';

const defaultConfig: ReportConfig = {
  autoApprove: false,
  requirePhotos: true,
  minPhotos: 1,
  maxPhotos: 5,
  requireLocation: true,
  allowAnonymous: false,
  autoAssign: false,
  defaultPriority: 'sedang',
  autoCloseAfterDays: 30,
  enablePublicView: true,
  requireVerification: false,
};

export const useReportConfig = () => {
  const [config, setConfig] = useState<ReportConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.config) {
          setConfig(prev => ({ ...prev, ...parsed.config }));
        }
      }
    } catch (error) {
      console.warn('[useReportConfig] Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.config) {
            setConfig(prev => ({ ...prev, ...parsed.config }));
          }
        } catch (error) {
          console.warn('[useReportConfig] Failed to parse storage change:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    config,
    loading,
    shouldRequirePhotos: () => config.requirePhotos,
    shouldRequireLocation: () => config.requireLocation,
    shouldAllowAnonymous: () => config.allowAnonymous,
    shouldAutoApprove: () => config.autoApprove,
    shouldAutoAssign: () => config.autoAssign,
    shouldRequireVerification: () => config.requireVerification,
    getPhotoLimits: () => ({ min: config.minPhotos, max: config.maxPhotos }),
    getDefaultPriority: () => config.defaultPriority,
    getAutoCloseAfterDays: () => config.autoCloseAfterDays,
    isPublicViewEnabled: () => config.enablePublicView,
  };
};
