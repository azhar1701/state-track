/**
 * useDynamicLayers.ts
 * Manages dynamic geo_layers: listing, lazy-loading, CRS reprojection, style extraction.
 * Extracted from MapView.tsx to isolate Supabase + proj4 side-effects.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/services/client";
import { logger } from "@/lib/logger";
import { sanitizeForLog } from "@/lib/security";
import { toast } from "sonner";
import proj4 from "proj4";
import type { FeatureCollection, Geometry, Feature } from "geojson";
import type { MapOverlays } from "../OverlayToggle";
import { getColorForKey } from "../mapIcons";
import L from "leaflet";
import { sanitizeText } from "@/lib/security";

export interface AvailableLayer {
  key: string;
  name: string;
  geometry_type: string | null;
}

export interface LayerStyleConfig {
  color?: string;
  weight?: number;
  opacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  dashArray?: string;
  radius?: number;
}

type AssetRow = {
  id: string;
  code: string | null;
  name: string | null;
  category: string | null;
  status: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  keterangan: string | null;
  created_at: string | null;
};

interface UseDynamicLayersResult {
  availableLayers: AvailableLayer[];
  dynamicData: Record<string, FeatureCollection<Geometry> | null>;
  dynamicStyle: Record<string, LayerStyleConfig>;
  dynamicLoading: Record<string, boolean>;
  setDynamicStyle: React.Dispatch<React.SetStateAction<Record<string, LayerStyleConfig>>>;
}

import type React from "react";

// Register common CRS defs once
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");
proj4.defs("EPSG:3857", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs");
proj4.defs("EPSG:32749", "+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs +type=crs");

function extractStyleConfig(
  geomType: string,
  dataStyle: Record<string, unknown>,
): LayerStyleConfig {
  const cfg: LayerStyleConfig = {};
  if (/Point/i.test(geomType)) {
    const pt = dataStyle.point as Record<string, unknown> | undefined;
    if (pt) {
      cfg.color = pt.color as string;
      cfg.fillColor = pt.fillColor as string;
      cfg.fillOpacity = pt.fillOpacity as number;
      cfg.radius = pt.radius as number;
      cfg.weight = pt.weight as number;
    }
  } else if (/LineString/i.test(geomType)) {
    const ln = dataStyle.line as Record<string, unknown> | undefined;
    if (ln) {
      cfg.color = ln.color as string;
      cfg.weight = ln.weight as number;
      cfg.opacity = ln.opacity as number;
      cfg.dashArray = ln.dashArray as string;
    }
  } else if (/Polygon/i.test(geomType)) {
    const pg = dataStyle.polygon as Record<string, unknown> | undefined;
    if (pg) {
      cfg.color = pg.color as string;
      cfg.weight = pg.weight as number;
      cfg.opacity = pg.opacity as number;
      cfg.fillColor = pg.fillColor as string;
      cfg.fillOpacity = pg.fillOpacity as number;
    }
  }
  return cfg;
}

function reprojectFeatureCollection(
  fc: FeatureCollection<Geometry>,
  from: string,
): FeatureCollection<Geometry> {
  const transformCoord = (pt: number[]): [number, number] => {
    const [lon, lat] = proj4(from, "EPSG:4326", [pt[0], pt[1]]);
    return [lon, lat];
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reprojectGeometry = (geom: any): any => {
    if (!geom) return geom;
    const t = geom.type;
    const mapCoords = (arr: unknown): unknown => {
      if (!Array.isArray(arr)) return arr;
      if (arr.length > 0 && typeof arr[0] === "number" && typeof arr[1] === "number")
        return transformCoord(arr as number[]);
      return (arr as unknown[]).map((a) => mapCoords(a));
    };
    if (t === "GeometryCollection") {
      return { type: "GeometryCollection", geometries: geom.geometries.map((g: unknown) => reprojectGeometry(g)) };
    }
    return { type: t, coordinates: mapCoords(geom.coordinates) };
  };

  return {
    type: "FeatureCollection",
    features: fc.features.map((f) => ({
      type: "Feature",
      properties: f.properties || {},
      geometry: reprojectGeometry(f.geometry),
    })) as unknown as Feature<Geometry>[],
  } as FeatureCollection<Geometry>;
}

function detectNeedsTransform(
  fc: FeatureCollection<Geometry>,
  srcCrs: string,
): { needed: boolean; from: string } {
  const src = srcCrs.toUpperCase();
  const isEPSG4326 = src.includes("EPSG:4326");
  const isEPSG3857 = src.includes("EPSG:3857") || src.includes("EPSG:900913");
  const isEPSG32749 = src.includes("EPSG:32749") || src.includes("32749");

  const f = fc.features?.find((f) => f.geometry && "coordinates" in f.geometry);
  let looksProjected = false;
  if (f) {
    const g = f.geometry as unknown as { coordinates?: unknown };
    const peek = (coords: unknown): [number, number] | null => {
      if (!Array.isArray(coords)) return null;
      if (coords.length > 0 && typeof coords[0] === "number" && typeof coords[1] === "number")
        return [coords[0] as number, coords[1] as number];
      for (const c of coords as unknown[]) {
        const p = peek(c);
        if (p) return p;
      }
      return null;
    };
    const sample = peek(g.coordinates);
    looksProjected = sample ? Math.abs(sample[0]) > 1000 || Math.abs(sample[1]) > 1000 : false;
  }

  const needed = isEPSG3857 || isEPSG32749 || (!isEPSG4326 && looksProjected);
  const from = isEPSG3857 ? "EPSG:3857" : "EPSG:32749";
  return { needed, from };
}

async function buildAssetsFC(): Promise<FeatureCollection<Geometry> | null> {
  const { data: assetRows, error } = await supabase
    .from("assets")
    .select("id,code,name,category,status,latitude,longitude,keterangan,created_at")
    .order("created_at", { ascending: false });
  if (error || !assetRows) return null;

  const features = (assetRows as AssetRow[])
    .map((row) => {
      const rawLat = row.latitude as unknown;
      const rawLon = row.longitude as unknown;
      const lat =
        typeof rawLat === "number" ? rawLat : typeof rawLat === "string" ? parseFloat(rawLat) : null;
      const lon =
        typeof rawLon === "number" ? rawLon : typeof rawLon === "string" ? parseFloat(rawLon) : null;
      if (lat === null || lon === null || Number.isNaN(lat) || Number.isNaN(lon)) return null;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {
          id: row.id,
          code: row.code,
          name: row.name,
          category: row.category,
          status: row.status,
          keterangan: row.keterangan,
          created_at: row.created_at,
        },
      } as Feature<Geometry>;
    })
    .filter((f): f is Feature<Geometry> => Boolean(f));

  return { type: "FeatureCollection", features } as FeatureCollection<Geometry>;
}

export const useDynamicLayers = (
  overlays: MapOverlays,
  setOverlays: React.Dispatch<React.SetStateAction<MapOverlays>>,
): UseDynamicLayersResult => {
  const [availableLayers, setAvailableLayers] = useState<AvailableLayer[]>([]);
  const [dynamicData, setDynamicData] = useState<Record<string, FeatureCollection<Geometry> | null>>({});
  const [dynamicStyle, setDynamicStyle] = useState<Record<string, LayerStyleConfig>>(() => {
    try {
      const cached = sessionStorage.getItem("map:layerStyles");
      return cached ? (JSON.parse(cached) as Record<string, LayerStyleConfig>) : {};
    } catch {
      return {};
    }
  });
  const [dynamicLoading, setDynamicLoading] = useState<Record<string, boolean>>({});
  const processedLayersRef = useRef<Set<string>>(new Set());
  const layerErrorsRef = useRef<Set<string>>(new Set());

  // Auto-remove errored layer from overlays helper
  const removeFromOverlays = useCallback(
    (key: string) => {
      setOverlays((prev) => {
        const nextDynamic = { ...prev.dynamic };
        delete nextDynamic[key];
        return { ...prev, dynamic: nextDynamic };
      });
    },
    [setOverlays],
  );

  // Listen for layer deletion/update events from GeoDataManager
  useEffect(() => {
    const handleDeleted = (e: Event) => {
      const { layerKey } = (e as CustomEvent<{ layerKey: string }>).detail;
      logger.info("[useDynamicLayers] Layer deleted:", layerKey);
      setDynamicData((prev) => {
        const next = { ...prev };
        delete next[layerKey];
        return next;
      });
      setOverlays((prev) => {
        const nextDynamic = { ...prev.dynamic };
        delete nextDynamic[layerKey];
        return { ...prev, dynamic: nextDynamic };
      });
      processedLayersRef.current.delete(layerKey);
      layerErrorsRef.current.delete(layerKey);
    };
    const handleUpdated = () => {
      sessionStorage.removeItem("map:availableLayers");
    };
    window.addEventListener("layer-deleted", handleDeleted);
    window.addEventListener("layer-updated", handleUpdated);
    return () => {
      window.removeEventListener("layer-deleted", handleDeleted);
      window.removeEventListener("layer-updated", handleUpdated);
    };
  }, [setOverlays]);

  // Load available layer list from geo_layers
  useEffect(() => {
    let cancelled = false;
    const cached = sessionStorage.getItem("map:availableLayers");
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as AvailableLayer[];
        if (Array.isArray(parsed) && parsed.length > 0 && !cancelled) {
          setAvailableLayers(parsed);
        }
      } catch {
        // ignore
      }
    }

    const loadList = async () => {
      try {
        const { data, error } = await supabase
          .from("geo_layers")
          .select("key,name,geometry_type")
          .order("created_at", { ascending: false });
        if (cancelled || error || !data) return;
        const rows = data as AvailableLayer[];
        const mapped = rows
          .filter((l) => l.key !== "admin_boundaries")
          .map(({ key, name, geometry_type }) => ({ key, name, geometry_type }));
        setAvailableLayers(mapped);
        sessionStorage.setItem("map:availableLayers", JSON.stringify(mapped));
      } catch (e) {
        logger.warn("Failed to load layers list", sanitizeForLog(e));
      }
    };

    void loadList();
    return () => { cancelled = true; };
  }, []);

  // Lazy-load toggled dynamic layer data
  useEffect(() => {
    const loadToggled = async () => {
      const dyn = overlays.dynamic || {};
      const keysToLoad = Object.entries(dyn)
        .filter(([, on]) => on)
        .map(([k]) => k);

      for (const key of keysToLoad) {
        if (dynamicData[key] || dynamicLoading[key] || layerErrorsRef.current.has(key)) continue;
        if (processedLayersRef.current.has(key)) continue;
        processedLayersRef.current.add(key);
        setDynamicLoading((s) => ({ ...s, [key]: true }));

        try {
          const { data: fullLayer, error: layerError } = await supabase
            .from("geo_layers")
            .select("data")
            .eq("key", key)
            .limit(1)
            .maybeSingle();

          let fc: FeatureCollection<Geometry> | null = null;
          let srcCrs = "";

          if (!layerError && fullLayer) {
            const raw = fullLayer.data as unknown as Record<string, unknown>;
            const dataStyle = (raw?.style || {}) as Record<string, unknown>;
            const geomType = availableLayers.find((l) => l.key === key)?.geometry_type || "";
            const styleConfig = extractStyleConfig(geomType, dataStyle);

            if (Object.keys(styleConfig).length > 0) {
              setDynamicStyle((s) => {
                const next = { ...s, [key]: styleConfig };
                try { sessionStorage.setItem("map:layerStyles", JSON.stringify(next)); } catch { /* ignore */ }
                return next;
              });
              await new Promise<void>((resolve) => setTimeout(resolve, 50));
            }

            // Extract FeatureCollection
            if (raw && typeof raw === "object" && "featureCollection" in raw) {
              const wrapper = raw as { featureCollection?: unknown; crs?: string };
              if (
                wrapper.featureCollection &&
                (wrapper.featureCollection as { type?: string }).type === "FeatureCollection"
              ) {
                fc = wrapper.featureCollection as FeatureCollection<Geometry>;
                srcCrs = typeof wrapper.crs === "string" ? wrapper.crs : "";
              }
            }
            if (!fc) {
              if ((raw as { type?: string }).type === "FeatureCollection") {
                fc = raw as unknown as FeatureCollection<Geometry>;
              } else if (raw && typeof raw === "object") {
                const found = Object.values(raw).find(
                  (v) => !!v && typeof v === "object" && (v as { type?: string }).type === "FeatureCollection",
                );
                if (found) fc = found as FeatureCollection<Geometry>;
              }
            }
            if (!srcCrs) {
              const embeddedCrs = (fc as unknown as { crs?: { properties?: { name?: string } } })?.crs?.properties?.name;
              srcCrs = embeddedCrs || "";
            }
          }

          if (!fc && key === "assets") {
            try { fc = await buildAssetsFC(); } catch (e) {
              logger.warn("Failed to build assets feature collection", sanitizeForLog(e));
            }
          }

          if (fc) {
            const { needed, from } = detectNeedsTransform(fc, srcCrs);
            const resultFC = needed ? reprojectFeatureCollection(fc, from) : fc;
            setDynamicData((s) => ({ ...s, [key]: resultFC }));
          } else {
            layerErrorsRef.current.add(key);
            processedLayersRef.current.delete(key);
            toast.error(`Gagal memuat layer: ${key}`, {
              id: `layer-error-${key}`,
              description:
                key === "assets"
                  ? "Data aset belum tersedia atau koordinat aset belum lengkap."
                  : "Format data tidak dikenali. Harap unggah GeoJSON FeatureCollection atau ZIP Shapefile.",
            });
            removeFromOverlays(key);
          }
        } catch (e) {
          logger.warn(`Failed to load layer ${key}`, sanitizeForLog(e));
          layerErrorsRef.current.add(key);
          processedLayersRef.current.delete(key);
          toast.error(`Gagal memuat layer: ${key}`, { id: `layer-error-${key}` });
          removeFromOverlays(key);
        } finally {
          setDynamicLoading((s) => ({ ...s, [key]: false }));
        }
      }
    };

    void loadToggled();
   
  }, [overlays.dynamic, dynamicData, dynamicLoading, availableLayers, removeFromOverlays]);

  return { availableLayers, dynamicData, dynamicStyle, dynamicLoading, setDynamicStyle };
};

// Re-export helper for use in MapView render logic
export { getColorForKey };

// Suppress unused L import warning (used transitively via mapIcons in consumer)
void L;
void sanitizeText;