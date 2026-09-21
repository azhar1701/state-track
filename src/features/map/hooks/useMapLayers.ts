/**
 * useMapLayers.ts
 * Manages Leaflet MarkerClusterGroup and heatLayer lifecycle.
 * Uses useRef instead of useState to avoid triggering re-renders when layers change.
 * Extracted from MapView.tsx.
 */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.heat";
import type { Report } from "@/services/types";
import { logger } from "@/lib/logger";
import { sanitizeForLog } from "@/lib/security";
import { createClusterCustomIcon, createCustomIcon } from "../mapIcons";
import { MAP_PREFS_STORAGE_KEY } from "./useMapPreferences";

interface StoredMapPrefs {
  clusterRadius?: number;
  heatmapRadius?: number;
}

function readPrefNum(key: keyof StoredMapPrefs, fallback: number): number {
  try {
    const stored = window.localStorage.getItem(MAP_PREFS_STORAGE_KEY);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Partial<StoredMapPrefs>;
    const val = parsed[key];
    return typeof val === "number" && val > 0 ? val : fallback;
  } catch {
    return fallback;
  }
}

interface UseMapLayersOptions {
  mapInstance: L.Map | null;
  filteredReports: Report[];
  clusteringEnabled: boolean;
  heatmapEnabled: boolean;
  onReportClick: (report: Report) => void;
}

export const useMapLayers = ({
  mapInstance,
  filteredReports,
  clusteringEnabled,
  heatmapEnabled,
  onReportClick,
}: UseMapLayersOptions): void => {
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatRef = useRef<L.Layer | null>(null);

  // Cluster layer lifecycle
  useEffect(() => {
    if (!mapInstance) return;

    // Remove previous cluster layer
    if (clusterRef.current) {
      try { mapInstance.removeLayer(clusterRef.current); } catch (e) {
        logger.warn("Failed to remove cluster layer", sanitizeForLog(e));
      }
      clusterRef.current = null;
    }

    if (!clusteringEnabled) return;

    const clusterRadius = readPrefNum("clusterRadius", 80);
    const mcg = new L.MarkerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: clusterRadius,
      showCoverageOnHover: true,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: createClusterCustomIcon,
    }) as L.MarkerClusterGroup;

    for (const r of filteredReports) {
      const marker = L.marker([r.latitude, r.longitude], {
        icon: createCustomIcon(r.category, r.status, r.severity),
      }).on("click", () => onReportClick(r));
      mcg.addLayer(marker);
    }

    mcg.addTo(mapInstance);
    clusterRef.current = mcg;

    return () => {
      if (clusterRef.current) {
        try { mapInstance.removeLayer(clusterRef.current); } catch { /* ignore */ }
        clusterRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, clusteringEnabled, filteredReports]);

  // Heatmap layer lifecycle
  useEffect(() => {
    if (!mapInstance) return;

    if (heatRef.current) {
      try { mapInstance.removeLayer(heatRef.current); } catch (e) {
        logger.warn("Failed to remove heat layer", sanitizeForLog(e));
      }
      heatRef.current = null;
    }

    if (!heatmapEnabled) return;

    const heatmapRadius = readPrefNum("heatmapRadius", 25);
    const pts: Array<[number, number, number]> = filteredReports.map((r) => [
      r.latitude,
      r.longitude,
      0.6,
    ]);
    const hl = L.heatLayer(pts, {
      radius: heatmapRadius,
      blur: 15,
      maxZoom: 17,
      minOpacity: 0.25,
    }) as L.Layer;
    hl.addTo(mapInstance);
    heatRef.current = hl;

    return () => {
      if (heatRef.current) {
        try { mapInstance.removeLayer(heatRef.current); } catch { /* ignore */ }
        heatRef.current = null;
      }
    };
   
  }, [mapInstance, heatmapEnabled, filteredReports]);
};