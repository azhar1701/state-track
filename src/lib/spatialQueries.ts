/**
 * Spatial query utilities
 */

import * as turf from '@turf/turf';
import type { Polygon } from 'geojson';

export interface SpatialQuery {
  id: string;
  type: 'buffer' | 'within' | 'intersects' | 'near';
  geometry?: Polygon;
  radius?: number;
  point?: [number, number];
  category?: string;
  status?: string;
  severity?: string;
}

/**
 * Apply spatial queries to filter reports
 */
export function applySpatialQueries(
  reports: Array<{ id: string; coords: [number, number]; category?: string; status?: string; severity?: string }>,
  queries: SpatialQuery[]
): string[] {
  if (queries.length === 0) return reports.map(r => r.id);

  return reports
    .filter(report => {
      // All queries must match (AND logic)
      return queries.every(query => {
        // Attribute filters
        if (query.category && report.category !== query.category) return false;
        if (query.status && report.status !== query.status) return false;
        if (query.severity && report.severity !== query.severity) return false;

        // Spatial filters
        const point = turf.point([report.coords[1], report.coords[0]]);

        if (query.type === 'buffer' && query.point && query.radius) {
          const center = turf.point(query.point);
          const distance = turf.distance(center, point, { units: 'kilometers' });
          return distance <= query.radius;
        }

        if (query.type === 'near' && query.point && query.radius) {
          const center = turf.point(query.point);
          const distance = turf.distance(center, point, { units: 'kilometers' });
          return distance <= query.radius;
        }

        if (query.type === 'within' && query.geometry) {
          return turf.booleanPointInPolygon(point, query.geometry);
        }

        if (query.type === 'intersects' && query.geometry) {
          const buffer = turf.buffer(point, 0.01, { units: 'kilometers' });
          return turf.booleanIntersects(buffer, query.geometry);
        }

        return true;
      });
    })
    .map(r => r.id);
}
