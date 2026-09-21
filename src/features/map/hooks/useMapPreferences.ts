/**
 * useMapPreferences.ts
 * Manages map preference persistence and restore from localStorage.
 * Extracted from MapView.tsx to isolate storage side-effects.
 */
import type React from "react";
import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { sanitizeForLog } from "@/lib/security";
import type { BasemapType } from "../basemap-config";
import type { MapOverlays } from "../OverlayToggle";

export const MAP_PREFS_STORAGE_KEY = "admin:mapPreferences";
export const MAP_OVERLAY_STORAGE_KEY = "map:overlays";

interface StoredPrefs {
  centerLat?: string;
  centerLng?: string;
  zoom?: string;
  basemap?: BasemapType;
  showAdminBoundaries?: boolean;
  enableClustering?: boolean;
  enableHeatmap?: boolean;
  enableGeolocation?: boolean;
  clusterRadius?: number;
  heatmapRadius?: number;
}

export interface UseMapPreferencesResult {
  mapCenter: [number, number];
  setMapCenter: React.Dispatch<React.SetStateAction<[number, number]>>;
  mapZoom: number;
  setMapZoom: React.Dispatch<React.SetStateAction<number>>;
  basemap: BasemapType;
  setBasemap: React.Dispatch<React.SetStateAction<BasemapType>>;
  overlays: MapOverlays;
  setOverlays: React.Dispatch<React.SetStateAction<MapOverlays>>;
}

interface Options {
  hasUrlCenter: boolean;
  hasUrlZoom: boolean;
  hasUrlBasemap: boolean;
  urlCenter?: [number, number];
  urlZoom?: number;
  urlBasemap?: string;
  onEnableGeolocation?: () => void;
}

export const useMapPreferences = ({
  hasUrlCenter,
  hasUrlZoom,
  hasUrlBasemap,
  urlCenter,
  urlZoom,
  urlBasemap,
  onEnableGeolocation,
}: Options): UseMapPreferencesResult => {
  const [mapCenter, setMapCenter] = useState<[number, number]>(urlCenter || [-7.325, 108.353]);
  const [mapZoom, setMapZoom] = useState(urlZoom || 12);
  const [basemap, setBasemap] = useState<BasemapType>((urlBasemap as BasemapType) || "osm");
  const [overlays, setOverlays] = useState<MapOverlays>({
    adminBoundaries: true,
    clustering: true,
    heatmap: false,
    dynamic: {},
  });

  // Restore admin map preferences (center, zoom, basemap, overlay defaults)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(MAP_PREFS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<StoredPrefs>;

      setOverlays((prev) => {
        const nextDynamic = { ...(prev.dynamic || {}) };
        let dynamicChanged = false;
        if (typeof nextDynamic.assets !== "undefined") {
          nextDynamic.assets = false;
          dynamicChanged = true;
        }

        const nextAdminBoundaries =
          typeof parsed.showAdminBoundaries === "boolean"
            ? parsed.showAdminBoundaries
            : prev.adminBoundaries;
        const nextClustering =
          typeof parsed.enableClustering === "boolean" ? parsed.enableClustering : prev.clustering;
        const nextHeatmap =
          typeof parsed.enableHeatmap === "boolean" ? parsed.enableHeatmap : prev.heatmap;

        const unchanged =
          nextAdminBoundaries === prev.adminBoundaries &&
          nextClustering === prev.clustering &&
          nextHeatmap === prev.heatmap &&
          !dynamicChanged;

        if (unchanged) return prev;

        return {
          ...prev,
          adminBoundaries: nextAdminBoundaries,
          clustering: nextClustering,
          heatmap: nextHeatmap,
          dynamic: dynamicChanged ? nextDynamic : prev.dynamic,
        };
      });

      if (!hasUrlCenter && parsed.centerLat && parsed.centerLng) {
        const lat = parseFloat(parsed.centerLat);
        const lng = parseFloat(parsed.centerLng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) setMapCenter([lat, lng]);
      }
      if (!hasUrlZoom && parsed.zoom) {
        const zoomVal = parseInt(parsed.zoom, 10);
        if (!Number.isNaN(zoomVal)) setMapZoom(zoomVal);
      }
      if (!hasUrlBasemap && parsed.basemap) {
        setBasemap(parsed.basemap);
      }
      if (parsed.enableGeolocation) {
        onEnableGeolocation?.();
      }
    } catch (error) {
      logger.warn("Failed to apply stored map preferences", sanitizeForLog(error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore last saved overlay toggles
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(MAP_OVERLAY_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<MapOverlays>;
      setOverlays((prev) => {
        const nextDynamic = { ...(prev.dynamic || {}) };
        for (const key of Object.keys(nextDynamic)) {
          const lower = key.toLowerCase();
          if (lower.includes("sawah") || lower.includes("padi")) delete nextDynamic[key];
        }
        if (parsed.dynamic && typeof parsed.dynamic === "object") {
          for (const [key, value] of Object.entries(parsed.dynamic)) {
            const lower = key.toLowerCase();
            if (lower.includes("sawah") || lower.includes("padi")) continue;
            if (typeof value === "boolean") nextDynamic[key] = value;
          }
        }
        return {
          adminBoundaries:
            typeof parsed.adminBoundaries === "boolean"
              ? parsed.adminBoundaries
              : prev.adminBoundaries,
          clustering:
            typeof parsed.clustering === "boolean" ? parsed.clustering : prev.clustering,
          heatmap: typeof parsed.heatmap === "boolean" ? parsed.heatmap : prev.heatmap,
          dynamic: nextDynamic,
        };
      });
    } catch (error) {
      logger.warn("Failed to restore overlay toggles", sanitizeForLog(error));
    }
  }, []);

  // Persist overlays on every change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const snapshot: MapOverlays = {
        adminBoundaries: overlays.adminBoundaries,
        clustering: overlays.clustering,
        heatmap: overlays.heatmap,
        dynamic: Object.fromEntries(
          Object.entries(overlays.dynamic || {}).filter(([key]) => {
            const lower = key.toLowerCase();
            return !lower.includes("sawah") && !lower.includes("padi");
          }),
        ),
      };
      window.localStorage.setItem(MAP_OVERLAY_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      logger.warn("Failed to persist overlay toggles", sanitizeForLog(error));
    }
  }, [overlays]);

  return { mapCenter, setMapCenter, mapZoom, setMapZoom, basemap, setBasemap, overlays, setOverlays };
};

/** Read a numeric preference (clusterRadius / heatmapRadius) from localStorage */
export const readPrefNumber = (
  key: "clusterRadius" | "heatmapRadius",
  fallback: number,
): number => {
  try {
    const stored = window.localStorage.getItem(MAP_PREFS_STORAGE_KEY);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Partial<StoredPrefs>;
    const val = parsed[key];
    return typeof val === "number" && val > 0 ? val : fallback;
  } catch {
    return fallback;
  }
};