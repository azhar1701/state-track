/**
 * Route Optimization Module
 * Provides TSP solving for optimal inspection routes
 */

import * as turf from '@turf/turf';

export interface RoutePoint {
  id: string;
  coords: [number, number];
  priority?: number; // 1-5, higher = more urgent
  category?: string;
}

export interface OptimizedRoute {
  points: RoutePoint[];
  totalDistance: number; // in kilometers
  segments: Array<{
    from: string;
    to: string;
    distance: number;
    bearing: number;
  }>;
}

/**
 * Greedy Nearest Neighbor TSP
 * Fast approximation for route optimization
 */
export function optimizeRoute(
  points: RoutePoint[],
  startPoint?: [number, number]
): OptimizedRoute {
  if (points.length === 0) {
    return { points: [], totalDistance: 0, segments: [] };
  }
  
  if (points.length === 1) {
    return { points, totalDistance: 0, segments: [] };
  }
  
  const unvisited = new Set(points.map(p => p.id));
  const route: RoutePoint[] = [];
  const segments: OptimizedRoute['segments'] = [];
  let totalDistance = 0;
  
  // Start from specified point or first point
  let current: RoutePoint;
  if (startPoint) {
    // Find closest point to start
    let minDist = Infinity;
    let closest = points[0];
    points.forEach(p => {
      const dist = turf.distance(turf.point(startPoint), turf.point(p.coords));
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    });
    current = closest;
  } else {
    current = points[0];
  }
  
  route.push(current);
  unvisited.delete(current.id);
  
  // Greedy nearest neighbor
  while (unvisited.size > 0) {
    let nearest: RoutePoint | null = null;
    let minDist = Infinity;
    
    points.forEach(p => {
      if (!unvisited.has(p.id)) return;
      
      const dist = turf.distance(
        turf.point(current.coords),
        turf.point(p.coords),
        { units: 'kilometers' }
      );
      
      // Factor in priority (higher priority = effectively shorter distance)
      const adjustedDist = p.priority ? dist / p.priority : dist;
      
      if (adjustedDist < minDist) {
        minDist = adjustedDist;
        nearest = p;
      }
    });
    
    if (nearest) {
      const actualDist = turf.distance(
        turf.point(current.coords),
        turf.point(nearest.coords),
        { units: 'kilometers' }
      );
      
      const bearing = turf.bearing(
        turf.point(current.coords),
        turf.point(nearest.coords)
      );
      
      segments.push({
        from: current.id,
        to: nearest.id,
        distance: actualDist,
        bearing,
      });
      
      totalDistance += actualDist;
      route.push(nearest);
      unvisited.delete(nearest.id);
      current = nearest;
    }
  }
  
  return { points: route, totalDistance, segments };
}

/**
 * 2-opt improvement for TSP
 * Improves existing route by swapping edges
 */
export function improve2Opt(route: OptimizedRoute, maxIterations = 100): OptimizedRoute {
  if (route.points.length < 4) return route;
  
  let improved = true;
  let iteration = 0;
  let currentRoute = [...route.points];
  
  while (improved && iteration < maxIterations) {
    improved = false;
    iteration++;
    
    for (let i = 1; i < currentRoute.length - 2; i++) {
      for (let j = i + 1; j < currentRoute.length - 1; j++) {
        // Calculate current distance
        const d1 = turf.distance(
          turf.point(currentRoute[i - 1].coords),
          turf.point(currentRoute[i].coords)
        );
        const d2 = turf.distance(
          turf.point(currentRoute[j].coords),
          turf.point(currentRoute[j + 1].coords)
        );
        const currentDist = d1 + d2;
        
        // Calculate new distance after swap
        const d3 = turf.distance(
          turf.point(currentRoute[i - 1].coords),
          turf.point(currentRoute[j].coords)
        );
        const d4 = turf.distance(
          turf.point(currentRoute[i].coords),
          turf.point(currentRoute[j + 1].coords)
        );
        const newDist = d3 + d4;
        
        if (newDist < currentDist) {
          // Reverse segment between i and j
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
  
  // Rebuild segments
  const segments: OptimizedRoute['segments'] = [];
  let totalDistance = 0;
  
  for (let i = 0; i < currentRoute.length - 1; i++) {
    const from = currentRoute[i];
    const to = currentRoute[i + 1];
    const distance = turf.distance(
      turf.point(from.coords),
      turf.point(to.coords),
      { units: 'kilometers' }
    );
    const bearing = turf.bearing(
      turf.point(from.coords),
      turf.point(to.coords)
    );
    
    segments.push({ from: from.id, to: to.id, distance, bearing });
    totalDistance += distance;
  }
  
  return { points: currentRoute, totalDistance, segments };
}

/**
 * Generate turn-by-turn directions
 */
export function generateDirections(route: OptimizedRoute): string[] {
  const directions: string[] = [];
  
  route.segments.forEach((seg, idx) => {
    const fromPoint = route.points.find(p => p.id === seg.from);
    const toPoint = route.points.find(p => p.id === seg.to);
    
    if (!fromPoint || !toPoint) return;
    
    const direction = getCardinalDirection(seg.bearing);
    const distKm = seg.distance.toFixed(2);
    
    directions.push(
      `${idx + 1}. Dari ${fromPoint.id} menuju ${direction} ke ${toPoint.id} (${distKm} km)`
    );
  });
  
  return directions;
}

function getCardinalDirection(bearing: number): string {
  const normalized = ((bearing % 360) + 360) % 360;
  
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
