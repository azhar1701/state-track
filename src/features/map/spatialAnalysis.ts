import { supabase } from '@/services/client';
import { useQuery } from '@tanstack/react-query';
import { point, featureCollection, distance, bearing, hexGrid, polygon } from '@turf/turf';
import type { Polygon, FeatureCollection } from 'geojson';

export interface ProximityResult {
  id: string;
  distance: number; // in kilometers
  bearing: number; // in degrees
}

export interface DensityCell {
  id: string;
  count: number;
  geometry: Polygon;
  center: [number, number];
}

export interface SpatialStats {
  nearestNeighborIndex: number;
  meanDistance: number;
  standardDeviation: number;
  clustered: boolean;
}

/**
 * RPC: Find points within radius using PostGIS
 */
export const useProximityQuery = (center: [number, number] | null, radiusKm: number) => {
  return useQuery({
    queryKey: ['spatial', 'proximity', center, radiusKm],
    queryFn: async () => {
      if (!center) return [];
      const { data, error } = await supabase.rpc('get_reports_in_radius', {
        lng: center[0],
        lat: center[1],
        radius_m: radiusKm * 1000
      });
      if (error) throw error;
      
      const from = point(center);
      return (data || []).map((r: any) => ({
        id: r.id,
        distance: r.dist / 1000,
        bearing: bearing(from, point([r.longitude, r.latitude]))
      })) as ProximityResult[];
    },
    enabled: !!center,
  });
};

/**
 * RPC: Calculate density grid using PostGIS
 */
export const useDensityQuery = (bbox: [number, number, number, number] | null, cellSizeKm: number) => {
  return useQuery({
    queryKey: ['spatial', 'density', bbox, cellSizeKm],
    queryFn: async () => {
      if (!bbox) return [];
      const { data, error } = await supabase.rpc('get_reports_hex_density', {
        min_lng: bbox[0],
        min_lat: bbox[1],
        max_lng: bbox[2],
        max_lat: bbox[3],
        cell_size_m: cellSizeKm * 1000
      });
      if (error) throw error;

      return (data || []).map((cell: any, idx: number) => ({
        id: `hex-${idx}`,
        count: cell.count,
        geometry: cell.geom, // PostGIS returns GeoJSON
        center: cell.center
      })) as DensityCell[];
    },
    enabled: !!bbox,
  });
};

/**
 * RPC: NNI Calculation
 */
export const useNNIQuery = (enabled: boolean) => {
  return useQuery({
    queryKey: ['spatial', 'nni'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_nearest_neighbor_stats');
      if (error) throw error;
      return data as SpatialStats;
    },
    enabled,
  });
};

/**
 * Legacy Turf-based helpers (keeping for fallback/immediate UI feedback)
 */
export function calculateBBox(points: [number, number][]): [number, number, number, number] {
  if (points.length === 0) return [0, 0, 0, 0];
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  points.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
  });
  return [minLng, minLat, maxLng, maxLat];
}
