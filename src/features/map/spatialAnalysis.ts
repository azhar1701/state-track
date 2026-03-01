/**
 * Spatial Analysis Module
 * Provides buffer, proximity, density, and statistical analysis
 */

import { point, buffer, featureCollection, distance, bearing, hexGrid, booleanPointInPolygon, centroid, polygon } from '@turf/turf';
import type { Feature, Polygon, MultiPolygon, FeatureCollection } from 'geojson';

export interface BufferOptions {
  radius: number; // in kilometers
  units?: 'kilometers' | 'meters' | 'miles';
  steps?: number;
}

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
  clustered: boolean; // true if NNI < 1
}

/**
 * Create buffer zone around point(s)
 */
export function createBuffer(
  coords: [number, number] | [number, number][],
  options: BufferOptions
): FeatureCollection {
  const { radius, units = 'kilometers', steps = 64 } = options;

  if (Array.isArray(coords[0])) {
    // Multiple points
    const features = (coords as [number, number][]).map((pt, idx) => {
      const p = point(pt);
      const buffered = buffer(p, radius, { units, steps });
      if (!buffered) return null;
      return { ...buffered, id: `buffer-${idx}` } as Feature<Polygon | MultiPolygon>;
    }).filter((f): f is Feature<Polygon | MultiPolygon> => f !== null);
    return featureCollection(features);
  }

  // Single point
  const p = point(coords as [number, number]);
  const buffered = buffer(p, radius, { units, steps });
  if (!buffered) return featureCollection([]);
  return featureCollection([buffered as Feature<Polygon | MultiPolygon>]);
}

/**
 * Find points within radius of target
 */
export function findWithinRadius(
  target: [number, number],
  points: Array<{ id: string; coords: [number, number] }>,
  radius: number,
  units: 'kilometers' | 'meters' = 'kilometers'
): ProximityResult[] {
  const from = point(target);

  return points
    .map(({ id, coords }) => {
      const to = point(coords);
      const dist = distance(from, to, { units });
      const brng = bearing(from, to);
      return { id, distance: dist, bearing: brng };
    })
    .filter(r => r.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Calculate nearest neighbor for each point
 */
export function calculateNearestNeighbors(
  points: Array<{ id: string; coords: [number, number] }>
): Array<{ id: string; nearestId: string; distance: number }> {
  return points.map(({ id, coords }) => {
    const from = point(coords);
    let minDist = Infinity;
    let nearestId = '';

    points.forEach(other => {
      if (other.id === id) return;
      const to = point(other.coords);
      const dist = distance(from, to, { units: 'kilometers' });
      if (dist < minDist) {
        minDist = dist;
        nearestId = other.id;
      }
    });

    return { id, nearestId, distance: minDist };
  });
}

/**
 * Hexagonal binning for density analysis
 */
export function createHexGrid(
  bbox: [number, number, number, number],
  cellSize: number,
  units: 'kilometers' | 'meters' = 'kilometers'
): FeatureCollection {
  return hexGrid(bbox, cellSize, { units });
}

/**
 * Count points in each grid cell
 */
export function calculateDensity(
  points: [number, number][],
  grid: FeatureCollection
): DensityCell[] {
  const cells: DensityCell[] = [];

  grid.features.forEach((cell, idx) => {
    let count = 0;
    points.forEach(pt => {
      const p = point(pt);
      if (booleanPointInPolygon(p, cell as Feature<Polygon>)) {
        count++;
      }
    });

    const center = centroid(cell);
    cells.push({
      id: `cell-${idx}`,
      count,
      geometry: cell.geometry as Polygon,
      center: center.geometry.coordinates as [number, number],
    });
  });

  return cells.filter(c => c.count > 0);
}

/**
 * Nearest Neighbor Index (NNI) - measures clustering
 * NNI < 1: clustered, NNI = 1: random, NNI > 1: dispersed
 */
export function calculateNearestNeighborIndex(
  points: [number, number][],
  studyAreaKm2: number
): SpatialStats {
  if (points.length < 2) {
    return {
      nearestNeighborIndex: 0,
      meanDistance: 0,
      standardDeviation: 0,
      clustered: false,
    };
  }

  // Calculate observed mean nearest neighbor distance
  const neighbors = calculateNearestNeighbors(
    points.map((coords, i) => ({ id: `${i}`, coords }))
  );

  const distances = neighbors.map(n => n.distance);
  const observedMean = distances.reduce((a, b) => a + b, 0) / distances.length;

  // Calculate expected mean distance for random distribution
  const density = points.length / studyAreaKm2;
  const expectedMean = 0.5 / Math.sqrt(density);

  // Calculate NNI
  const nni = observedMean / expectedMean;

  // Standard deviation
  const variance = distances.reduce((sum, d) => sum + Math.pow(d - observedMean, 2), 0) / distances.length;
  const stdDev = Math.sqrt(variance);

  return {
    nearestNeighborIndex: nni,
    meanDistance: observedMean,
    standardDeviation: stdDev,
    clustered: nni < 1,
  };
}

/**
 * Calculate bounding box from points
 */
export function calculateBBox(points: [number, number][]): [number, number, number, number] {
  if (points.length === 0) return [0, 0, 0, 0];

  let minLng = Infinity, minLat = Infinity;
  let maxLng = -Infinity, maxLat = -Infinity;

  points.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Kernel Density Estimation
 */
export function kernelDensity(
  points: [number, number][],
  bandwidth: number,
  gridSize: number = 50
): DensityCell[] {
  if (points.length === 0) return [];

  const bbox = calculateBBox(points);
  const [minLng, minLat, maxLng, maxLat] = bbox;

  const lngStep = (maxLng - minLng) / gridSize;
  const latStep = (maxLat - minLat) / gridSize;

  const cells: DensityCell[] = [];

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lng = minLng + i * lngStep;
      const lat = minLat + j * latStep;
      const center: [number, number] = [lng + lngStep / 2, lat + latStep / 2];

      // Calculate density at this cell
      let density = 0;
      points.forEach(pt => {
        const dist = distance(point(center), point(pt), { units: 'kilometers' });
        // Gaussian kernel
        density += Math.exp(-0.5 * Math.pow(dist / bandwidth, 2));
      });

      if (density > 0.01) {
        const poly = polygon([[
          [lng, lat],
          [lng + lngStep, lat],
          [lng + lngStep, lat + latStep],
          [lng, lat + latStep],
          [lng, lat],
        ]]);

        cells.push({
          id: `kde-${i}-${j}`,
          count: Math.round(density * 100),
          geometry: poly.geometry as Polygon,
          center,
        });
      }
    }
  }

  return cells;
}
