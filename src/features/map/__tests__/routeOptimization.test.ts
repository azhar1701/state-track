import { describe, it, expect, vi } from 'vitest';
import {
  optimizeRouteOrder,
  improve2OptOrder,
  calculateOptimizedRoute,
  generateGoogleMapsRouteUrl,
  generateDirections,
  getCardinalDirection,
  type RoutePoint,
} from '../routeOptimization';

describe('routeOptimization', () => {
  const samplePoints: RoutePoint[] = [
    { id: 'p1', title: 'Titik Alun-Alun Ciamis', coords: [-7.327, 108.355], priority: 1, category: 'jalan' },
    { id: 'p2', title: 'Jembatan Cirahong', coords: [-7.355, 108.341], priority: 5, category: 'jembatan' },
    { id: 'p3', title: 'Tanggul Citanduy', coords: [-7.375, 108.535], priority: 3, category: 'sungai' },
  ];

  it('calculates direction name correctly', () => {
    expect(getCardinalDirection(0)).toBe('Utara');
    expect(getCardinalDirection(90)).toBe('Timur');
    expect(getCardinalDirection(180)).toBe('Selatan');
    expect(getCardinalDirection(270)).toBe('Barat');
  });

  it('orders points starting with specified startPoint or userLocation', () => {
    const pointsWithUser: RoutePoint[] = [
      ...samplePoints,
      { id: 'user', title: 'Lokasi Saya', coords: [-7.33, 108.35], isUserLocation: true },
    ];
    const ordered = optimizeRouteOrder(pointsWithUser, [-7.33, 108.35]);
    expect(ordered[0].id).toBe('user');
  });

  it('supports round trip returning to origin', () => {
    const ordered = optimizeRouteOrder(samplePoints, undefined, true);
    expect(ordered.length).toBe(samplePoints.length + 1);
    expect(ordered[ordered.length - 1].id).toContain('-return');
  });

  it('optimizes order with 2-opt without dropping points', () => {
    const points: RoutePoint[] = [
      { id: '1', coords: [0, 0] },
      { id: '2', coords: [1, 1] },
      { id: '3', coords: [0, 1] },
      { id: '4', coords: [1, 0] },
    ];
    const improved = improve2OptOrder(points);
    expect(improved.length).toBe(4);
    expect(new Set(improved.map((p) => p.id)).size).toBe(4);
  });

  it('generates a valid Google Maps driving navigation URL', () => {
    const url = generateGoogleMapsRouteUrl(samplePoints);
    expect(url).toContain('https://www.google.com/maps/dir/?api=1');
    expect(url).toContain('origin=-7.327,108.355');
    expect(url).toContain('destination=-7.375,108.535');
    expect(url).toContain('travelmode=driving');
  });

  it('generates human-readable directions without raw UUIDs', async () => {
    // Mock global fetch to test fallback or mocked OSRM
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const route = await calculateOptimizedRoute(samplePoints, { use2Opt: false });
    expect(route.points.length).toBe(samplePoints.length);
    expect(route.segments.length).toBe(samplePoints.length - 1);

    const directions = generateDirections(route);
    expect(directions.length).toBe(samplePoints.length - 1);
    expect(directions[0]).toContain('Titik Alun-Alun Ciamis');
    expect(directions[0]).not.toContain('undefined');

    globalThis.fetch = originalFetch;
  });
});
