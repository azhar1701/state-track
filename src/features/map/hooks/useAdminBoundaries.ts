import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/client";
import { logger } from "@/lib/logger";
import type { FeatureCollection, Geometry, Feature } from "geojson";
import proj4 from "proj4";

proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");
proj4.defs("EPSG:3857", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs");
proj4.defs("EPSG:32749", "+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs +type=crs");

interface AdminBoundariesOptions {
  enabled: boolean;
  zoom: number;
}

/**
 * Ensures any FeatureCollection (whether in UTM 49S, WebMercator, or already WGS84)
 * has standard WGS84 (EPSG:4326) [lng, lat] coordinates for Leaflet canvas.
 */
function normalizeAdminGeoJson(fc: FeatureCollection<Geometry>): FeatureCollection<Geometry> {
  if (!fc || !fc.features || fc.features.length === 0) return fc;

  const sampleFeature = fc.features.find((f) => f.geometry && "coordinates" in f.geometry);
  if (!sampleFeature) return fc;

  const peek = (coords: unknown): [number, number] | null => {
    if (!Array.isArray(coords)) return null;
    if (coords.length > 0 && typeof coords[0] === "number" && typeof coords[1] === "number") {
      return [coords[0] as number, coords[1] as number];
    }
    for (const c of coords as unknown[]) {
      const p = peek(c);
      if (p) return p;
    }
    return null;
  };

  const sample = peek((sampleFeature.geometry as { coordinates?: unknown }).coordinates);
  if (!sample) return fc;

  const isProjected = Math.abs(sample[0]) > 1000 || Math.abs(sample[1]) > 1000;
  if (!isProjected) {
    return fc;
  }

  const crsName = typeof (fc as { crs?: { properties?: { name?: string } } }).crs?.properties?.name === "string"
    ? (fc as { crs?: { properties?: { name?: string } } }).crs!.properties!.name!.toUpperCase()
    : "";
  const from = crsName.includes("3857") ? "EPSG:3857" : "EPSG:32749";

  const transformCoord = (pt: number[]): [number, number] => {
    const [lon, lat] = proj4(from, "EPSG:4326", [pt[0], pt[1]]);
    return [Number(lon.toFixed(6)), Number(lat.toFixed(6))];
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reprojectGeometry = (geom: any): any => {
    if (!geom) return geom;
    const t = geom.type;
    const mapCoords = (arr: unknown): unknown => {
      if (!Array.isArray(arr)) return arr;
      if (arr.length > 0 && typeof arr[0] === "number" && typeof arr[1] === "number") {
        return transformCoord(arr as number[]);
      }
      return (arr as unknown[]).map((a) => mapCoords(a));
    };
    if (t === "GeometryCollection") {
      return { type: "GeometryCollection", geometries: geom.geometries.map((g: unknown) => reprojectGeometry(g)) };
    }
    return { ...geom, coordinates: mapCoords(geom.coordinates) };
  };

  return {
    type: "FeatureCollection",
    crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    features: fc.features.map((f) => ({
      ...f,
      geometry: reprojectGeometry(f.geometry),
    })) as Feature<Geometry>[],
  } as FeatureCollection<Geometry>;
}

let cachedStaticGeoJson: FeatureCollection<Geometry> | null = null;

const loadStaticAdminGeoJson = async (): Promise<FeatureCollection<Geometry>> => {
  if (cachedStaticGeoJson) {
    return cachedStaticGeoJson;
  }
  const response = await fetch("/data/adm_ciamis.geojson");
  if (!response.ok) {
    throw new Error(`Failed to load static boundaries: HTTP ${response.status}`);
  }
  const json = await response.json();
  if (!json || json.type !== "FeatureCollection") {
    throw new Error("Invalid GeoJSON structure for administrative boundaries");
  }
  cachedStaticGeoJson = normalizeAdminGeoJson(json as FeatureCollection<Geometry>);
  return cachedStaticGeoJson;
};

/**
 * useAdminBoundaries Hook
 * 
 * Fetches administrative boundaries with dynamic simplification based on zoom level.
 * Uses PostGIS ST_Simplify on the backend via RPC for optimal performance with static GeoJSON fallback.
 */
export const useAdminBoundaries = ({ enabled, zoom }: AdminBoundariesOptions) => {
  return useQuery({
    queryKey: ["map", "admin-boundaries"],
    queryFn: async () => {
      const simplifyFactor = zoom >= 12 ? 0 : zoom >= 10 ? 0.001 : 0.01;

      try {
        const { data, error } = await supabase.rpc("get_simplified_admin_boundaries", {
          simplify_factor: simplifyFactor
        });

        const rpcFeatures = (data as unknown as FeatureCollection)?.features;
        if (
          error ||
          !data ||
          typeof data !== "object" ||
          (data as unknown as FeatureCollection).type !== "FeatureCollection" ||
          !Array.isArray(rpcFeatures) ||
          rpcFeatures.length === 0
        ) {
          logger.info("Simplified RPC returned no boundary features, loading static GeoJSON");
          return await loadStaticAdminGeoJson();
        }

        return normalizeAdminGeoJson(data as unknown as FeatureCollection<Geometry>);
      } catch (err) {
        logger.warn("RPC call failed, falling back to static GeoJSON", err);
        return await loadStaticAdminGeoJson();
      }
    },
    enabled: enabled,
    staleTime: Infinity, // boundaries don't change during session
  });
};

