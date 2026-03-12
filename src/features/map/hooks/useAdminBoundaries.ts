import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/client";
import { logger } from "@/lib/logger";
import type { FeatureCollection, Geometry } from "geojson";

interface AdminBoundariesOptions {
  enabled: boolean;
  zoom: number;
}

/**
 * useAdminBoundaries Hook
 * 
 * Fetches administrative boundaries with dynamic simplification based on zoom level.
 * Uses PostGIS ST_Simplify on the backend via RPC for optimal performance.
 */
export const useAdminBoundaries = ({ enabled, zoom }: AdminBoundariesOptions) => {
  return useQuery({
    queryKey: ["map", "admin-boundaries", Math.floor(zoom / 2)], // Group by zoom buckets to prevent over-fetching
    queryFn: async () => {
      // Simplification factor: more simplification (higher value) at low zoom
      // Zoom 12+ -> No simplification (0)
      // Zoom 10-11 -> 0.001
      // Zoom < 10 -> 0.01
      const simplifyFactor = zoom >= 12 ? 0 : zoom >= 10 ? 0.001 : 0.01;

      try {
        const { data, error } = await (supabase as any).rpc("get_simplified_admin_boundaries", {
          simplify_factor: simplifyFactor
        });

        if (error) {
          // Fallback to static file if RPC fails or doesn't exist yet
          logger.warn("Simplified RPC failed, falling back to static GeoJSON", error);
          const response = await fetch("/data/adm_ciamis.geojson");
          if (!response.ok) throw new Error("Failed to load static boundaries");

          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Received non-JSON response for boundaries fallback");
          }

          return await response.json() as FeatureCollection<Geometry>;
        }

        return data as unknown as FeatureCollection<Geometry>;
      } catch (err) {
        logger.error("Critical error loading admin boundaries", err);
        throw err;
      }
    },
    enabled: enabled,
    staleTime: 1000 * 60 * 60, // 1 hour (boundaries don't change often)
  });
};
