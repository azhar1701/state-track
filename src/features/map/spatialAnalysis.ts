import { supabase } from '@/services/client';
import { useQuery } from '@tanstack/react-query';
import { 
  point, buffer, featureCollection, distance, bearing, hexGrid, 
  booleanPointInPolygon, centroid, polygon 
} from '@turf/turf';
import type { Feature, Polygon, MultiPolygon, FeatureCollection } from 'geojson';

export interface BufferOptions {
  radius: number;
  units?: 'kilometers' | 'meters' | 'miles';
  steps?: number;
}

export interface ProximityResult {
  id: string;
  distance: number;
  bearing: number;
}

export interface DensityCell {
  id: string;
  count: number;
  geometry: Polygon;
  center: [number, number];
}

export interface SpatialStats {
  nearestNeighborIndex: number;
  nni: number; // alias for UI compatibility
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
      return (Array.isArray(data) ? data : []).map((r) => ({
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

      return (Array.isArray(data) ? data : []).map((cell, idx: number) => ({
        id: `hex-${idx}`,
        count: cell.count,
        geometry: cell.geom as unknown as Polygon,
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

/* --- Legacy & Modern Turf-based helpers for SpatialAnalysisPanel.tsx --- */

export interface ImpactedReport {
  id: string;
  title: string;
  category: string;
  severity?: 'ringan' | 'sedang' | 'berat';
  status: string;
  distanceKm: number;
  bearing: number;
  coords: [number, number];
}

export interface BufferAnalysisResult {
  geojson: FeatureCollection<Polygon | MultiPolygon>;
  center: [number, number];
  radius: number;
  units: 'kilometers' | 'meters' | 'miles';
  radiusKm: number;
  areaKm2: number;
  areaHectares: number;
  perimeterKm: number;
  impactedReports: ImpactedReport[];
  severityBreakdown: {
    berat: number;
    sedang: number;
    ringan: number;
    lainnya: number;
  };
}

/**
 * Creates buffer polygon(s) around coordinates [lat, lon]
 * Note: Converts Leaflet [lat, lon] to Turf GeoJSON [lon, lat]
 */
export function createBuffer(
  coords: [number, number] | [number, number][],
  options: BufferOptions
): FeatureCollection<Polygon | MultiPolygon> {
  const { radius, units = 'kilometers', steps = 64 } = options;

  if (Array.isArray(coords[0])) {
    const features = (coords as [number, number][])
      .map((pt, idx) => {
        const turfPt = point([pt[1], pt[0]]);
        const buffered = buffer(turfPt, radius, { units, steps });
        return buffered
          ? ({ ...buffered, id: `buffer-${idx}` } as Feature<Polygon | MultiPolygon>)
          : null;
      })
      .filter((f): f is Feature<Polygon | MultiPolygon> => f !== null);
    return featureCollection(features);
  }

  const [lat, lon] = coords as [number, number];
  const turfPt = point([lon, lat]);
  const buffered = buffer(turfPt, radius, { units, steps });
  return buffered
    ? featureCollection([buffered as Feature<Polygon | MultiPolygon>])
    : featureCollection([]);
}

/**
 * Perform impact assessment of buffer zone on reported infrastructure
 */
export function analyzeBufferImpact(
  center: [number, number], // [lat, lon]
  options: BufferOptions,
  reports: Array<{
    id: string;
    title: string;
    coords: [number, number]; // [lat, lon]
    category: string;
    status: string;
    severity?: 'ringan' | 'sedang' | 'berat';
  }>
): BufferAnalysisResult {
  const geojson = createBuffer(center, options);
  const radiusKm = options.units === 'meters' ? options.radius / 1000 : options.radius;

  const areaKm2 = Number((Math.PI * Math.pow(radiusKm, 2)).toFixed(3));
  const areaHectares = Number((areaKm2 * 100).toFixed(1));
  const perimeterKm = Number((2 * Math.PI * radiusKm).toFixed(2));

  const centerTurf = point([center[1], center[0]]);
  const impactedReports: ImpactedReport[] = [];
  const severityBreakdown = {
    berat: 0,
    sedang: 0,
    ringan: 0,
    lainnya: 0,
  };

  reports.forEach((r) => {
    const reportTurf = point([r.coords[1], r.coords[0]]);
    const dist = distance(centerTurf, reportTurf, { units: 'kilometers' });

    if (dist <= radiusKm + 0.005) {
      const brng = bearing(centerTurf, reportTurf);
      impactedReports.push({
        id: r.id,
        title: r.title,
        category: r.category,
        severity: r.severity,
        status: r.status,
        distanceKm: Number(dist.toFixed(2)),
        bearing: brng,
        coords: r.coords,
      });

      if (r.severity === 'berat') severityBreakdown.berat++;
      else if (r.severity === 'sedang') severityBreakdown.sedang++;
      else if (r.severity === 'ringan') severityBreakdown.ringan++;
      else severityBreakdown.lainnya++;
    }
  });

  impactedReports.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    geojson,
    center,
    radius: options.radius,
    units: options.units || 'kilometers',
    radiusKm,
    areaKm2,
    areaHectares,
    perimeterKm,
    impactedReports,
    severityBreakdown,
  };
}

export function findWithinRadius(
  target: [number, number],
  points: Array<{ id: string; coords: [number, number] }>,
  radius: number,
  units: 'kilometers' | 'meters' = 'kilometers'
): ProximityResult[] {
  const from = point([target[1], target[0]]);
  return points
    .map(({ id, coords }) => {
      const to = point([coords[1], coords[0]]);
      return {
        id,
        distance: distance(from, to, { units }),
        bearing: bearing(from, to),
      };
    })
    .filter((r) => r.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
}

export function calculateNearestNeighbors(
  points: Array<{ id: string; coords: [number, number] }>
): Array<{ id: string; nearestId: string; distance: number }> {
  return points.map(({ id, coords }) => {
    let minDist = Infinity, nearestId = '';
    const from = point([coords[1], coords[0]]);
    points.forEach((other) => {
      if (other.id === id) return;
      const to = point([other.coords[1], other.coords[0]]);
      const d = distance(from, to, { units: 'kilometers' });
      if (d < minDist) {
        minDist = d;
        nearestId = other.id;
      }
    });
    return { id, nearestId, distance: minDist };
  });
}

export function createHexGrid(
  bbox: [number, number, number, number],
  cellSize: number,
  units: 'kilometers' | 'meters' = 'kilometers'
): FeatureCollection {
  return hexGrid(bbox, cellSize, { units });
}

export function calculateDensity(
  points: [number, number][],
  grid: FeatureCollection
): DensityCell[] {
  return grid.features
    .map((cell, idx) => {
      let count = 0;
      points.forEach(([lat, lng]) => {
        if (booleanPointInPolygon(point([lng, lat]), cell as Feature<Polygon>)) count++;
      });
      return {
        id: `cell-${idx}`,
        count,
        geometry: cell.geometry as Polygon,
        center: centroid(cell).geometry.coordinates as [number, number],
      };
    })
    .filter((c) => c.count > 0);
}

export function calculateNearestNeighborIndex(
  points: [number, number][],
  studyAreaKm2: number
): SpatialStats {
  if (points.length < 2) {
    return {
      nearestNeighborIndex: 0,
      nni: 0,
      meanDistance: 0,
      standardDeviation: 0,
      clustered: false,
    };
  }
  const neighbors = calculateNearestNeighbors(
    points.map((coords, i) => ({ id: `${i}`, coords }))
  );
  const distances = neighbors.map((n) => n.distance);
  const observedMean = distances.reduce((a, b) => a + b, 0) / distances.length;
  const expectedMean = 0.5 / Math.sqrt(points.length / studyAreaKm2);
  const nni = observedMean / expectedMean;
  const variance =
    distances.reduce((sum, d) => sum + Math.pow(d - observedMean, 2), 0) /
    distances.length;
  return {
    nearestNeighborIndex: nni,
    nni,
    meanDistance: observedMean,
    standardDeviation: Math.sqrt(variance),
    clustered: nni < 1,
  };
}

export function calculateBBox(
  points: [number, number][],
  padding: number = 0.05
): [number, number, number, number] {
  if (points.length === 0) return [0, 0, 0, 0];
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  points.forEach(([lat, lng]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
  if (minLng >= maxLng) {
    minLng -= padding;
    maxLng += padding;
  }
  if (minLat >= maxLat) {
    minLat -= padding;
    maxLat += padding;
  }
  return [minLng, minLat, maxLng, maxLat];
}

export function kernelDensity(
  points: [number, number][],
  bandwidth: number,
  gridSize: number = 50
): DensityCell[] {
  if (points.length === 0) return [];
  const [minLng, minLat, maxLng, maxLat] = calculateBBox(points);
  const lngStep = (maxLng - minLng) / gridSize,
    latStep = (maxLat - minLat) / gridSize,
    cells: DensityCell[] = [];
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lng = minLng + i * lngStep,
        lat = minLat + j * latStep,
        center: [number, number] = [lng + lngStep / 2, lat + latStep / 2];
      let density = 0;
      points.forEach(([pLat, pLng]) => {
        density += Math.exp(
          -0.5 *
            Math.pow(
              distance(point(center), point([pLng, pLat]), { units: 'kilometers' }) /
                bandwidth,
              2
            )
        );
      });
      if (density > 0.01) {
        cells.push({
          id: `kde-${i}-${j}`,
          count: Math.round(density * 100),
          center,
          geometry: polygon([
            [
              [lng, lat],
              [lng + lngStep, lat],
              [lng + lngStep, lat + latStep],
              [lng, lat + latStep],
              [lng, lat],
            ],
          ]).geometry as Polygon,
        });
      }
    }
  }
  return cells;
}
