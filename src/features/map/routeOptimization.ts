/**
 * Route Optimization Module
 * Provides TSP solving, OSRM road geometry fetching, and inspection route planning
 */

import { point, distance, bearing } from '@turf/turf';

export interface RoutePoint {
  id: string;
  coords: [number, number]; // [lat, lon]
  priority?: number; // 1-5, higher = more urgent
  category?: string;
  title?: string;
  status?: string;
  severity?: 'ringan' | 'sedang' | 'berat';
  isUserLocation?: boolean;
}

export interface RouteLeg {
  fromId: string;
  toId: string;
  fromTitle: string;
  toTitle: string;
  fromCoords: [number, number];
  toCoords: [number, number];
  fromCategory?: string;
  toCategory?: string;
  fromSeverity?: 'ringan' | 'sedang' | 'berat';
  toSeverity?: 'ringan' | 'sedang' | 'berat';
  distanceKm: number;
  durationMinutes: number;
  summary: string;
  bearing: number;
  steps?: string[];
}

export interface OptimizedRoute {
  points: RoutePoint[];
  totalDistance: number; // in kilometers
  totalDurationMinutes: number; // in minutes
  geometry: Array<[number, number]>; // [lat, lon] coordinates for Leaflet polyline
  segments: RouteLeg[];
  isFallbackGeometry?: boolean;
  algorithmSummary?: string;
}

export interface OptimizationOptions {
  startPoint?: [number, number];
  use2Opt?: boolean;
  prioritizeSeverity?: boolean;
  roundTrip?: boolean;
  avgSpeedKmh?: number;
}

/**
 * Greedy Nearest Neighbor TSP
 * Approximates optimal stop visit sequence
 */
export function optimizeRouteOrder(
  points: RoutePoint[],
  startPoint?: [number, number],
  roundTrip: boolean = false
): RoutePoint[] {
  if (points.length <= 1) {
    return [...points];
  }

  const unvisited = new Set(points.map((p) => p.id));
  const route: RoutePoint[] = [];

  // Determine starting point
  let current: RoutePoint;
  if (startPoint) {
    // Check if startPoint matches a designated userLocation or find the closest point
    const userPt = points.find((p) => p.isUserLocation);
    if (userPt) {
      current = userPt;
    } else {
      let minDist = Infinity;
      let closest = points[0];
      for (const p of points) {
        const dist = distance(point(startPoint), point(p.coords));
        if (dist < minDist) {
          minDist = dist;
          closest = p;
        }
      }
      current = closest;
    }
  } else {
    current = points[0];
  }

  route.push(current);
  unvisited.delete(current.id);

  // Greedy nearest neighbor traversal
  while (unvisited.size > 0) {
    let nearest: RoutePoint | null = null;
    let minWeightedDist = Infinity;

    for (const p of points) {
      if (!unvisited.has(p.id)) continue;

      const dist = distance(
        point(current.coords),
        point(p.coords),
        { units: 'kilometers' }
      );

      // Factor in priority (higher priority = effectively shorter distance in selection)
      const adjustedDist = p.priority && p.priority > 0 ? dist / p.priority : dist;

      if (adjustedDist < minWeightedDist) {
        minWeightedDist = adjustedDist;
        nearest = p;
      }
    }

    if (nearest) {
      route.push(nearest);
      unvisited.delete(nearest.id);
      current = nearest;
    } else {
      break;
    }
  }

  // If round trip requested and points > 1, return back to origin
  if (roundTrip && route.length > 1) {
    const origin = route[0];
    route.push({
      ...origin,
      id: `${origin.id}-return`,
      title: `${origin.title || 'Titik Awal'} (Kembali)`,
    });
  }

  return route;
}

/**
 * 2-opt improvement for TSP
 * Swaps edges to eliminate crossings and reduce overall travel distance
 */
export function improve2OptOrder(
  points: RoutePoint[],
  maxIterations: number = 80,
  preserveEnds: boolean = false
): RoutePoint[] {
  if (points.length < 4) return points;

  let currentRoute = [...points];
  let improved = true;
  let iteration = 0;

  const endIndex = preserveEnds ? currentRoute.length - 2 : currentRoute.length - 1;

  while (improved && iteration < maxIterations) {
    improved = false;
    iteration++;

    for (let i = 1; i < endIndex - 1; i++) {
      for (let j = i + 1; j < endIndex; j++) {
        const d1 = distance(
          point(currentRoute[i - 1].coords),
          point(currentRoute[i].coords)
        );
        const d2 = distance(
          point(currentRoute[j].coords),
          point(currentRoute[j + 1].coords)
        );
        const currentDist = d1 + d2;

        const d3 = distance(
          point(currentRoute[i - 1].coords),
          point(currentRoute[j].coords)
        );
        const d4 = distance(
          point(currentRoute[i].coords),
          point(currentRoute[j + 1].coords)
        );
        const newDist = d3 + d4;

        if (newDist < currentDist - 0.001) {
          const segment = currentRoute.slice(i, j + 1).reverse();
          currentRoute = [
            ...currentRoute.slice(0, i),
            ...segment,
            ...currentRoute.slice(j + 1),
          ];
          improved = true;
        }
      }
    }
  }

  return currentRoute;
}

/**
 * Fetch real road geometry and leg metrics from OSRM
 */
export async function fetchOSRMRouteData(
  orderedPoints: RoutePoint[],
  timeoutMs: number = 7000
): Promise<{
  geometry: Array<[number, number]>;
  legs: RouteLeg[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  isFallback: boolean;
}> {
  if (orderedPoints.length < 2) {
    return {
      geometry: orderedPoints.map((p) => p.coords),
      legs: [],
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
      isFallback: false,
    };
  }

  // Construct coordinate query: lon,lat;lon,lat;...
  const coordString = orderedPoints
    .map((p) => `${p.coords[1]},${p.coords[0]}`)
    .join(';');

  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=true`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM HTTP status: ${res.status}`);
    }

    const data = await res.json() as {
      code?: string;
      routes?: Array<{
        distance: number;
        duration: number;
        geometry: {
          coordinates: Array<[number, number]>;
        };
        legs?: Array<{
          distance: number;
          duration: number;
          summary: string;
          steps?: Array<{ name?: string }>;
        }>;
      }>;
    };

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const bestRoute = data.routes[0];
      // Convert [lon, lat] -> [lat, lon] for Leaflet
      const geometry: Array<[number, number]> = bestRoute.geometry.coordinates.map(
        (c) => [c[1], c[0]]
      );

      const totalDistanceKm = bestRoute.distance / 1000;
      const totalDurationMinutes = Math.max(1, Math.round(bestRoute.duration / 60));

      const legs: RouteLeg[] = [];
      const osrmLegs = bestRoute.legs || [];

      for (let i = 0; i < orderedPoints.length - 1; i++) {
        const from = orderedPoints[i];
        const to = orderedPoints[i + 1];
        const osrmLeg = osrmLegs[i];

        const legDistKm = osrmLeg
          ? osrmLeg.distance / 1000
          : distance(point(from.coords), point(to.coords), { units: 'kilometers' });

        const legDurationMin = osrmLeg
          ? Math.max(1, Math.round(osrmLeg.duration / 60))
          : Math.max(1, Math.round((legDistKm / 40) * 60));

        const brng = bearing(point(from.coords), point(to.coords));
        const cardinal = getCardinalDirection(brng);

        const summaryText = osrmLeg?.summary?.trim()
          ? `Melalui ${osrmLeg.summary}`
          : `Menuju arah ${cardinal}`;

        legs.push({
          fromId: from.id,
          toId: to.id,
          fromTitle: from.title || `Titik ${i + 1}`,
          toTitle: to.title || `Titik ${i + 2}`,
          fromCoords: from.coords,
          toCoords: to.coords,
          fromCategory: from.category,
          toCategory: to.category,
          fromSeverity: from.severity,
          toSeverity: to.severity,
          distanceKm: Number(legDistKm.toFixed(2)),
          durationMinutes: legDurationMin,
          summary: summaryText,
          bearing: brng,
          steps: osrmLeg?.steps?.map((s) => s.name).filter(Boolean) as string[] | undefined,
        });
      }

      return {
        geometry,
        legs,
        totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
        totalDurationMinutes,
        isFallback: false,
      };
    }
  } catch {
    // Graceful fallback to Turf haversine calculation
  }

  // Fallback calculation
  return buildFallbackRouteData(orderedPoints);
}

/**
 * Builds fallback straight-line geometry and haversine distances
 */
function buildFallbackRouteData(orderedPoints: RoutePoint[]): {
  geometry: Array<[number, number]>;
  legs: RouteLeg[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  isFallback: boolean;
} {
  const geometry: Array<[number, number]> = orderedPoints.map((p) => p.coords);
  const legs: RouteLeg[] = [];
  let totalDistanceKm = 0;

  for (let i = 0; i < orderedPoints.length - 1; i++) {
    const from = orderedPoints[i];
    const to = orderedPoints[i + 1];

    const d = distance(point(from.coords), point(to.coords), { units: 'kilometers' });
    const brng = bearing(point(from.coords), point(to.coords));
    const cardinal = getCardinalDirection(brng);
    const durationMin = Math.max(1, Math.round((d / 40) * 60));

    totalDistanceKm += d;

    legs.push({
      fromId: from.id,
      toId: to.id,
      fromTitle: from.title || `Titik ${i + 1}`,
      toTitle: to.title || `Titik ${i + 2}`,
      fromCoords: from.coords,
      toCoords: to.coords,
      fromCategory: from.category,
      toCategory: to.category,
      fromSeverity: from.severity,
      toSeverity: to.severity,
      distanceKm: Number(d.toFixed(2)),
      durationMinutes: durationMin,
      summary: `Arah ${cardinal} (Estimasi Garis Lurus)`,
      bearing: brng,
    });
  }

  const totalDurationMinutes = Math.max(1, Math.round((totalDistanceKm / 40) * 60));

  return {
    geometry,
    legs,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    totalDurationMinutes,
    isFallback: true,
  };
}

/**
 * Main function: calculate fully optimized route with OSRM road geometry
 */
export async function calculateOptimizedRoute(
  points: RoutePoint[],
  options: OptimizationOptions = {}
): Promise<OptimizedRoute> {
  if (points.length === 0) {
    return {
      points: [],
      totalDistance: 0,
      totalDurationMinutes: 0,
      geometry: [],
      segments: [],
    };
  }

  if (points.length === 1) {
    return {
      points,
      totalDistance: 0,
      totalDurationMinutes: 0,
      geometry: [points[0].coords],
      segments: [],
    };
  }

  // 1. Calculate optimal sequence using Greedy Nearest Neighbor
  let ordered = optimizeRouteOrder(points, options.startPoint, options.roundTrip);

  // 2. Apply 2-opt edge crossing improvements if requested
  if (options.use2Opt !== false && ordered.length >= 4) {
    const isRound = !!options.roundTrip;
    ordered = improve2OptOrder(ordered, 100, isRound);
  }

  // 3. Fetch real road geometry and leg metrics from OSRM
  const routeData = await fetchOSRMRouteData(ordered);

  const algorithmSummary = [
    'Nearest Neighbor Heuristic',
    options.use2Opt !== false ? '+ 2-Opt Optimizer' : '',
    routeData.isFallback ? '(Fallback Geodesik)' : '(OSRM Real-Road Routing)',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    points: ordered,
    totalDistance: routeData.totalDistanceKm,
    totalDurationMinutes: routeData.totalDurationMinutes,
    geometry: routeData.geometry,
    segments: routeData.legs,
    isFallbackGeometry: routeData.isFallback,
    algorithmSummary,
  };
}

/**
 * Backward compatibility synchronous wrapper
 */
export function optimizeRoute(
  points: RoutePoint[],
  startPoint?: [number, number]
): OptimizedRoute {
  const ordered = optimizeRouteOrder(points, startPoint, false);
  const fallback = buildFallbackRouteData(ordered);

  return {
    points: ordered,
    totalDistance: fallback.totalDistanceKm,
    totalDurationMinutes: fallback.totalDurationMinutes,
    geometry: fallback.geometry,
    segments: fallback.legs,
    isFallbackGeometry: true,
  };
}

/**
 * Backward compatibility 2-opt wrapper
 */
export function improve2Opt(route: OptimizedRoute, maxIterations = 100): OptimizedRoute {
  if (route.points.length < 4) return route;
  const ordered = improve2OptOrder(route.points, maxIterations, false);
  const fallback = buildFallbackRouteData(ordered);

  return {
    ...route,
    points: ordered,
    totalDistance: fallback.totalDistanceKm,
    totalDurationMinutes: fallback.totalDurationMinutes,
    geometry: fallback.geometry,
    segments: fallback.legs,
  };
}

/**
 * Generate human-readable directions in Bahasa Indonesia
 */
export function generateDirections(route: OptimizedRoute): string[] {
  if (!route.segments || route.segments.length === 0) {
    return ['Tidak ada petunjuk jalan yang tersedia.'];
  }

  return route.segments.map((seg, idx) => {
    const distText = `${seg.distanceKm} km`;
    const durText = `~${seg.durationMinutes} menit`;
    const summaryText = seg.summary ? ` (${seg.summary})` : '';

    return `Pemberhentian ${idx + 1} ➔ ${idx + 2}: Dari "${seg.fromTitle}" menuju "${seg.toTitle}"${summaryText} • ${distText} [${durText}]`;
  });
}

/**
 * Generate Google Maps Navigation URL for multi-stop route
 */
export function generateGoogleMapsRouteUrl(points: RoutePoint[]): string {
  if (points.length < 2) return '';

  const origin = `${points[0].coords[0]},${points[0].coords[1]}`;
  const destination = `${points[points.length - 1].coords[0]},${points[points.length - 1].coords[1]}`;

  if (points.length === 2) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  }

  // Middle waypoints
  const waypoints = points
    .slice(1, points.length - 1)
    .map((p) => `${p.coords[0]},${p.coords[1]}`)
    .join('|');

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(
    waypoints
  )}&travelmode=driving`;
}

export function getCardinalDirection(bearingVal: number): string {
  const normalized = ((bearingVal % 360) + 360) % 360;

  if (normalized >= 337.5 || normalized < 22.5) return 'Utara';
  if (normalized >= 22.5 && normalized < 67.5) return 'Timur Laut';
  if (normalized >= 67.5 && normalized < 112.5) return 'Timur';
  if (normalized >= 112.5 && normalized < 157.5) return 'Tenggara';
  if (normalized >= 157.5 && normalized < 202.5) return 'Selatan';
  if (normalized >= 202.5 && normalized < 247.5) return 'Barat Daya';
  if (normalized >= 247.5 && normalized < 292.5) return 'Barat';
  return 'Barat Laut';
}

/**
 * Calculate estimated time based on average speed
 */
export function estimateTime(
  distanceKm: number,
  avgSpeedKmh: number = 40
): { hours: number; minutes: number } {
  const hours = distanceKm / avgSpeedKmh;
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  return { hours: wholeHours, minutes };
}

