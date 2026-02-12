import { useState, useEffect } from 'react';

export type GeoLayerConfig = {
  enforceCRS: boolean;
  defaultCRS: string;
  autoPublishToMap: boolean;
  maxUploadSizeMb: number;
  requireMetadata: boolean;
  defaultLayerType: 'geojson' | 'wms' | 'cluster' | 'heatmap' | 'tile';
  defaultZIndex: number;
  defaultOpacity: number;
  defaultVisible: boolean;
  enableClustering: boolean;
  clusterRadius: number;
  enableHeatmap: boolean;
  heatmapRadius: number;
  heatmapBlur: number;
  heatmapMaxZoom: number;
};

export type StyleConfig = {
  color: string;
  weight: number;
  opacity: number;
  fillColor: string;
  fillOpacity: number;
  dashArray: string;
};

const STORAGE_KEY = 'admin:geoLayerSettings';
const STYLE_STORAGE_KEY = 'admin:geoLayerStyle';

const defaultConfig: GeoLayerConfig = {
  enforceCRS: true,
  defaultCRS: 'EPSG:4326',
  autoPublishToMap: true,
  maxUploadSizeMb: 50,
  requireMetadata: true,
  defaultLayerType: 'geojson',
  defaultZIndex: 400,
  defaultOpacity: 1.0,
  defaultVisible: true,
  enableClustering: true,
  clusterRadius: 80,
  enableHeatmap: false,
  heatmapRadius: 25,
  heatmapBlur: 15,
  heatmapMaxZoom: 18,
};

const defaultStyle: StyleConfig = {
  color: '#3b82f6',
  weight: 2,
  opacity: 0.8,
  fillColor: '#3b82f6',
  fillOpacity: 0.3,
  dashArray: '',
};

/**
 * Hook untuk mengakses konfigurasi GeoLayer dari localStorage
 * Digunakan oleh komponen yang perlu membaca pengaturan layer
 */
export const useGeoLayerConfig = () => {
  const [config, setConfig] = useState<GeoLayerConfig>(defaultConfig);
  const [style, setStyle] = useState<StyleConfig>(defaultStyle);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      const storedConfig = localStorage.getItem(STORAGE_KEY);
      if (storedConfig) {
        const parsed = JSON.parse(storedConfig) as Partial<GeoLayerConfig>;
        setConfig(prev => ({ ...prev, ...parsed }));
      }

      const storedStyle = localStorage.getItem(STYLE_STORAGE_KEY);
      if (storedStyle) {
        const parsed = JSON.parse(storedStyle) as Partial<StyleConfig>;
        setStyle(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('[useGeoLayerConfig] Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as Partial<GeoLayerConfig>;
          setConfig(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          console.warn('[useGeoLayerConfig] Failed to parse storage change:', error);
        }
      }
      if (e.key === STYLE_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as Partial<StyleConfig>;
          setStyle(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          console.warn('[useGeoLayerConfig] Failed to parse style change:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    config,
    style,
    loading,
    // Helper functions
    shouldEnforceCRS: () => config.enforceCRS,
    shouldAutoPublish: () => config.autoPublishToMap,
    shouldRequireMetadata: () => config.requireMetadata,
    getMaxUploadSize: () => config.maxUploadSizeMb * 1024 * 1024, // Convert to bytes
    getDefaultLayerConfig: () => ({
      layer_type: config.defaultLayerType,
      z_index: config.defaultZIndex,
      opacity: config.defaultOpacity,
      visible: config.defaultVisible,
      style_config: style,
    }),
    getClusterConfig: () => ({
      enabled: config.enableClustering,
      radius: config.clusterRadius,
    }),
    getHeatmapConfig: () => ({
      enabled: config.enableHeatmap,
      radius: config.heatmapRadius,
      blur: config.heatmapBlur,
      maxZoom: config.heatmapMaxZoom,
    }),
  };
};
