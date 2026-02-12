import type { FeatureCollection, Geometry, Feature } from 'geojson';
import * as turf from '@turf/turf';

export interface FixOptions {
  fixInvalidGeometry?: boolean;
  removeInvalidFeatures?: boolean;
  fixPolygonRings?: boolean;
  removeDuplicates?: boolean;
  normalizeProperties?: boolean;
  standardizeFieldNames?: boolean;
  fixOutOfBounds?: boolean;
}

export interface FixResult {
  fixed: FeatureCollection<Geometry>;
  changes: {
    invalidGeometriesFixed: number;
    invalidFeaturesRemoved: number;
    polygonRingsFixed: number;
    duplicatesRemoved: number;
    propertiesNormalized: number;
    fieldsStandardized: number;
    outOfBoundsFixed: number;
  };
  errors: string[];
}

const FIELD_MAPPING: Record<string, string> = {
  'nama': 'name',
  'kode': 'code',
  'kategori': 'category',
  'keterangan': 'description',
  'alamat': 'address',
  'lokasi': 'location',
  'status': 'status',
  'tipe': 'type',
  'jenis': 'type',
};

export const geoFixer = {
  /**
   * Fix polygon rings (close unclosed rings, remove invalid rings)
   */
  fixPolygonRing: (coordinates: number[][][]): number[][][] => {
    return coordinates.map(ring => {
      if (ring.length < 4) return ring;
      
      const first = ring[0];
      const last = ring[ring.length - 1];
      
      if (first[0] !== last[0] || first[1] !== last[1]) {
        return [...ring, first];
      }
      
      return ring;
    }).filter(ring => ring.length >= 4);
  },

  /**
   * Fix out of bounds coordinates
   */
  fixCoordinates: (coords: number[]): number[] => {
    let [lng, lat] = coords;
    
    // Wrap longitude
    while (lng > 180) lng -= 360;
    while (lng < -180) lng += 360;
    
    // Clamp latitude
    lat = Math.max(-90, Math.min(90, lat));
    
    return [lng, lat];
  },

  /**
   * Normalize property values
   */
  normalizeProperties: (props: Record<string, unknown>): Record<string, unknown> => {
    const normalized: Record<string, unknown> = {};
    
    Object.entries(props).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      
      if (typeof value === 'string') {
        normalized[key] = value.trim();
      } else {
        normalized[key] = value;
      }
    });
    
    return normalized;
  },

  /**
   * Standardize field names
   */
  standardizeFieldNames: (props: Record<string, unknown>): Record<string, unknown> => {
    const standardized: Record<string, unknown> = {};
    
    Object.entries(props).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      const mappedKey = FIELD_MAPPING[lowerKey] || key;
      standardized[mappedKey] = value;
    });
    
    return standardized;
  },

  /**
   * Fix invalid geometry
   */
  fixGeometry: (geometry: Geometry): Geometry | null => {
    try {
      if (!geometry || !geometry.type) return null;
      
      if (geometry.type === 'Polygon') {
        const coords = geometry.coordinates as number[][][];
        const fixed = geoFixer.fixPolygonRing(coords);
        
        if (fixed.length === 0) return null;
        
        return {
          type: 'Polygon',
          coordinates: fixed
        };
      }
      
      if (geometry.type === 'MultiPolygon') {
        const coords = geometry.coordinates as number[][][][];
        const fixed = coords.map(poly => geoFixer.fixPolygonRing(poly)).filter(p => p.length > 0);
        
        if (fixed.length === 0) return null;
        
        return {
          type: 'MultiPolygon',
          coordinates: fixed
        };
      }
      
      if (geometry.type === 'Point') {
        const coords = geometry.coordinates as number[];
        return {
          type: 'Point',
          coordinates: geoFixer.fixCoordinates(coords)
        };
      }
      
      if (geometry.type === 'LineString') {
        const coords = geometry.coordinates as number[][];
        return {
          type: 'LineString',
          coordinates: coords.map(c => geoFixer.fixCoordinates(c))
        };
      }
      
      return geometry;
    } catch {
      return null;
    }
  },

  /**
   * Remove duplicate features
   */
  removeDuplicates: (features: Feature<Geometry>[]): Feature<Geometry>[] => {
    const seen = new Set<string>();
    const unique: Feature<Geometry>[] = [];
    
    features.forEach(f => {
      const key = JSON.stringify(f.geometry);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(f);
      }
    });
    
    return unique;
  },

  /**
   * Auto-fix entire FeatureCollection
   */
  autoFix: (
    fc: FeatureCollection<Geometry>,
    options: FixOptions = {}
  ): FixResult => {
    const {
      fixInvalidGeometry = true,
      removeInvalidFeatures = true,
      fixPolygonRings = true,
      removeDuplicates = true,
      normalizeProperties = true,
      standardizeFieldNames = true,
      fixOutOfBounds = true,
    } = options;

    const changes = {
      invalidGeometriesFixed: 0,
      invalidFeaturesRemoved: 0,
      polygonRingsFixed: 0,
      duplicatesRemoved: 0,
      propertiesNormalized: 0,
      fieldsStandardized: 0,
      outOfBoundsFixed: 0,
    };

    const errors: string[] = [];
    let features = [...fc.features];

    // Fix geometries
    if (fixInvalidGeometry || fixPolygonRings || fixOutOfBounds) {
      features = features.map((f, idx) => {
        try {
          let geom = f.geometry;
          
          if (!geom) {
            if (removeInvalidFeatures) {
              changes.invalidFeaturesRemoved++;
              return null;
            }
            return f;
          }
          
          const fixed = geoFixer.fixGeometry(geom);
          
          if (!fixed) {
            if (removeInvalidFeatures) {
              changes.invalidFeaturesRemoved++;
              return null;
            }
            return f;
          }
          
          if (JSON.stringify(fixed) !== JSON.stringify(geom)) {
            changes.invalidGeometriesFixed++;
          }
          
          return { ...f, geometry: fixed };
        } catch (e) {
          errors.push(`Feature ${idx}: ${e instanceof Error ? e.message : 'Unknown error'}`);
          if (removeInvalidFeatures) {
            changes.invalidFeaturesRemoved++;
            return null;
          }
          return f;
        }
      }).filter(Boolean) as Feature<Geometry>[];
    }

    // Remove duplicates
    if (removeDuplicates) {
      const before = features.length;
      features = geoFixer.removeDuplicates(features);
      changes.duplicatesRemoved = before - features.length;
    }

    // Normalize properties
    if (normalizeProperties || standardizeFieldNames) {
      features = features.map(f => {
        let props = f.properties || {};
        
        if (normalizeProperties) {
          props = geoFixer.normalizeProperties(props);
          changes.propertiesNormalized++;
        }
        
        if (standardizeFieldNames) {
          props = geoFixer.standardizeFieldNames(props);
          changes.fieldsStandardized++;
        }
        
        return { ...f, properties: props };
      });
    }

    return {
      fixed: {
        type: 'FeatureCollection',
        features,
      },
      changes,
      errors,
    };
  },
};
