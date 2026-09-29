import { describe, it, expect } from 'vitest';
import {
  createBuffer,
  analyzeBufferImpact,
  findWithinRadius,
  calculateNearestNeighborIndex,
} from '../spatialAnalysis';
import * as turf from '@turf/turf';

describe('spatialAnalysis module', () => {
  // Sample data in Ciamis, West Java: Latitude around -7.32, Longitude around 108.35
  const ciamisCenter: [number, number] = [-7.327, 108.355]; // [lat, lon]

  const sampleReports = [
    {
      id: 'rep-1',
      title: 'Tanggul Jebol Citanduy',
      coords: [-7.328, 108.356] as [number, number], // ~0.15 km from center
      category: 'sungai',
      status: 'baru',
      severity: 'berat' as const,
    },
    {
      id: 'rep-2',
      title: 'Jembatan Rusak Cirahong',
      coords: [-7.335, 108.362] as [number, number], // ~1.2 km from center
      category: 'jembatan',
      status: 'diproses',
      severity: 'sedang' as const,
    },
    {
      id: 'rep-3',
      title: 'Longsor Pangandaran (Jauh)',
      coords: [-7.650, 108.650] as [number, number], // ~40 km away
      category: 'jalan',
      status: 'baru',
      severity: 'berat' as const,
    },
  ];

  it('createBuffer creates a valid GeoJSON polygon centered in Ciamis (longitude ~108, latitude ~-7)', () => {
    const fc = createBuffer(ciamisCenter, { radius: 1, units: 'kilometers' });
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features.length).toBe(1);

    const poly = fc.features[0];
    const bbox = turf.bbox(poly); // [minLng, minLat, maxLng, maxLat]
    // Verify longitude is around 108.35, latitude is around -7.32
    expect(bbox[0]).toBeGreaterThan(108.34);
    expect(bbox[2]).toBeLessThan(108.37);
    expect(bbox[1]).toBeGreaterThan(-7.34);
    expect(bbox[3]).toBeLessThan(-7.31);
  });

  it('analyzeBufferImpact correctly computes area, perimeter, and impacted reports', () => {
    // 2 km buffer around center: rep-1 and rep-2 should be inside, rep-3 outside
    const result = analyzeBufferImpact(ciamisCenter, { radius: 2, units: 'kilometers' }, sampleReports);

    expect(result.radiusKm).toBe(2);
    expect(result.areaKm2).toBeCloseTo(Math.PI * 4, 1);
    expect(result.impactedReports.length).toBe(2);
    expect(result.impactedReports[0].id).toBe('rep-1');
    expect(result.impactedReports[1].id).toBe('rep-2');

    expect(result.severityBreakdown.berat).toBe(1);
    expect(result.severityBreakdown.sedang).toBe(1);
    expect(result.severityBreakdown.ringan).toBe(0);
  });

  it('findWithinRadius filters and sorts points by distance correctly', () => {
    const points = sampleReports.map(r => ({ id: r.id, coords: r.coords }));
    const within1km = findWithinRadius(ciamisCenter, points, 1, 'kilometers');

    expect(within1km.length).toBe(1);
    expect(within1km[0].id).toBe('rep-1');
    expect(within1km[0].distance).toBeLessThan(0.5);
  });

  it('calculateNearestNeighborIndex calculates cluster statistics without NaN', () => {
    const points = sampleReports.map(r => r.coords);
    const stats = calculateNearestNeighborIndex(points, 500);

    expect(stats.nearestNeighborIndex).toBeGreaterThan(0);
    expect(isNaN(stats.nni)).toBe(false);
    expect(stats.meanDistance).toBeGreaterThan(0);
  });
});
