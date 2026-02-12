import type { FeatureCollection, Geometry, Feature } from 'geojson';
import * as turf from '@turf/turf';

export const geoOptimizer = {
  /**
   * Simplify geometri untuk mengurangi ukuran data
   */
  simplifyFeatureCollection: (
    fc: FeatureCollection<Geometry>,
    tolerance = 0.0001,
    highQuality = false
  ): FeatureCollection<Geometry> => {
    try {
      const simplified = turf.simplify(fc, {
        tolerance,
        highQuality,
        mutate: false
      });
      return simplified as FeatureCollection<Geometry>;
    } catch {
      return fc;
    }
  },

  /**
   * Reduce properties untuk mengurangi ukuran
   */
  reduceProperties: (
    fc: FeatureCollection<Geometry>,
    keepFields?: string[]
  ): FeatureCollection<Geometry> => {
    return {
      ...fc,
      features: fc.features.map(f => ({
        ...f,
        properties: keepFields
          ? Object.fromEntries(
              Object.entries(f.properties || {}).filter(([k]) => keepFields.includes(k))
            )
          : f.properties
      }))
    };
  },

  /**
   * Clip features by bounds untuk load hanya area visible
   */
  clipByBounds: (
    fc: FeatureCollection<Geometry>,
    bounds: [number, number, number, number]
  ): FeatureCollection<Geometry> => {
    try {
      const bbox = turf.bboxPolygon(bounds);
      const clipped = fc.features
        .map(f => {
          try {
            if (f.geometry.type === 'Point' || f.geometry.type === 'MultiPoint') {
              return f;
            }
            const intersection = turf.intersect(
              turf.featureCollection([f, bbox]) as Parameters<typeof turf.intersect>[0]
            );
            return intersection ? { ...f, geometry: intersection.geometry } : null;
          } catch {
            return f;
          }
        })
        .filter(Boolean) as Feature<Geometry>[];

      return { ...fc, features: clipped };
    } catch {
      return fc;
    }
  },

  /**
   * Decimate features berdasarkan zoom level
   */
  decimateByZoom: (
    fc: FeatureCollection<Geometry>,
    zoom: number
  ): FeatureCollection<Geometry> => {
    if (zoom >= 12) return fc;
    
    const ratio = zoom < 8 ? 0.1 : zoom < 10 ? 0.3 : 0.6;
    const step = Math.ceil(1 / ratio);
    
    return {
      ...fc,
      features: fc.features.filter((_, i) => i % step === 0)
    };
  },

  /**
   * Compress data dengan menghapus koordinat duplikat
   */
  removeDuplicateCoordinates: (
    fc: FeatureCollection<Geometry>
  ): FeatureCollection<Geometry> => {
    return {
      ...fc,
      features: fc.features.map(f => {
        if (f.geometry.type === 'Polygon') {
          const coords = f.geometry.coordinates as number[][][];
          const cleaned = coords.map(ring => {
            const unique: number[][] = [];
            ring.forEach((coord, i) => {
              if (i === 0 || coord[0] !== ring[i-1][0] || coord[1] !== ring[i-1][1]) {
                unique.push(coord);
              }
            });
            return unique;
          });
          return { ...f, geometry: { ...f.geometry, coordinates: cleaned } };
        }
        return f;
      })
    };
  },

  /**
   * Get size estimate in bytes
   */
  estimateSize: (fc: FeatureCollection<Geometry>): number => {
    return JSON.stringify(fc).length;
  },

  /**
   * Optimize complete pipeline
   */
  optimize: (
    fc: FeatureCollection<Geometry>,
    options?: {
      simplify?: boolean;
      tolerance?: number;
      reduceProps?: boolean;
      keepFields?: string[];
      bounds?: [number, number, number, number];
      zoom?: number;
    }
  ): FeatureCollection<Geometry> => {
    let result = fc;

    if (options?.bounds) {
      result = geoOptimizer.clipByBounds(result, options.bounds);
    }

    if (options?.zoom !== undefined) {
      result = geoOptimizer.decimateByZoom(result, options.zoom);
    }

    if (options?.simplify) {
      result = geoOptimizer.simplifyFeatureCollection(
        result,
        options.tolerance || 0.0001
      );
    }

    if (options?.reduceProps) {
      result = geoOptimizer.reduceProperties(result, options.keepFields);
    }

    result = geoOptimizer.removeDuplicateCoordinates(result);

    return result;
  }
};
