import { useEffect, useMemo, useState } from 'react';
import { MapContainer, GeoJSON as RLGeoJSON, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import proj4 from 'proj4';
import type { FeatureCollection, Geometry, Feature } from 'geojson';

type LayerPreviewProps = {
  data: unknown; // can be wrapper { featureCollection, crs } or direct FC or nested
  height?: number | string;
  className?: string;
};

// Reuse minimal CRS setup
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs');
proj4.defs('EPSG:32749', '+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs +type=crs');

const coerceFeatureCollection = (raw: unknown): { fc: FeatureCollection<Geometry> | null; crs?: string } => {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return coerceFeatureCollection(parsed);
    } catch {
      return { fc: null };
    }
  }
  // Preferred: wrapper { featureCollection, crs }
  if (raw && typeof raw === 'object' && 'featureCollection' in (raw as Record<string, unknown>)) {
    const wrapper = raw as { featureCollection?: unknown; crs?: string };
    if (wrapper.featureCollection && (wrapper.featureCollection as { type?: string }).type === 'FeatureCollection') {
      return { fc: wrapper.featureCollection as FeatureCollection<Geometry>, crs: wrapper.crs };
    }
  }
  // Direct FC
  if (raw && typeof raw === 'object' && (raw as { type?: string }).type === 'FeatureCollection') {
    return { fc: raw as FeatureCollection<Geometry> };
  }
  // Search nested values for FC
  if (raw && typeof raw === 'object') {
    const vals = Object.values(raw as Record<string, unknown>);
    const found = vals.find((v) => !!v && typeof v === 'object' && (v as { type?: string }).type === 'FeatureCollection');
    if (found) return { fc: found as FeatureCollection<Geometry> };
  }
  return { fc: null };
};

const reprojectIfNeeded = (fc: FeatureCollection<Geometry>, srcCrs?: string): FeatureCollection<Geometry> => {
  const embedded = (fc as unknown as { crs?: { properties?: { name?: string } } })?.crs?.properties?.name;
  const src = (srcCrs || embedded || '').toUpperCase();
  const isEPSG4326 = src.includes('EPSG:4326');
  const isEPSG3857 = src.includes('EPSG:3857') || src.includes('EPSG:900913');
  const isEPSG32749 = src.includes('EPSG:32749') || src.includes('EPSG::32749') || src.includes('32749');

  // Peek coordinate for heuristic when CRS is unknown
  const sample = (() => {
    const f = fc.features?.find((f) => f.geometry && 'coordinates' in f.geometry);
    if (!f) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const peek = (coords: any): [number, number] | null => {
      if (!Array.isArray(coords)) return null;
      if (coords.length > 0 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        return [coords[0] as number, coords[1] as number];
      }
      for (const c of coords as unknown[]) {
        const p = peek(c);
        if (p) return p;
      }
      return null;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return peek((f.geometry as any).coordinates);
  })();
  const looksProjected = sample ? Math.abs(sample[0]) > 1000 || Math.abs(sample[1]) > 1000 : false;

  if (isEPSG4326 || (!isEPSG3857 && !isEPSG32749 && !looksProjected)) return fc;

  const from = isEPSG3857 ? 'EPSG:3857' : (isEPSG32749 ? 'EPSG:32749' : 'EPSG:32749');
  const transformCoord = (pt: number[]): [number, number] => {
    const [x, y] = pt;
    const [lon, lat] = proj4(from, 'EPSG:4326', [x, y]);
    return [lon, lat];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reprojectGeometry = (geom: any): any => {
    if (!geom) return geom;
    const t = geom.type;
    const coords = geom.coordinates;
    const mapCoords = (arr: unknown): unknown => {
      if (!Array.isArray(arr)) return arr;
      if (arr.length > 0 && typeof arr[0] === 'number') return transformCoord(arr as number[]);
      return (arr as unknown[]).map((a) => mapCoords(a));
    };
    if (t === 'GeometryCollection') {
      return { type: 'GeometryCollection', geometries: geom.geometries.map((g: unknown) => reprojectGeometry(g)) };
    }
    return { type: t, coordinates: mapCoords(coords) };
  };

  return {
    type: 'FeatureCollection',
    features: fc.features.map((f) => ({
      type: 'Feature',
      properties: f.properties || {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      geometry: reprojectGeometry((f as any).geometry),
    })) as unknown as Feature<Geometry>[],
  } as FeatureCollection<Geometry>;
};

export const LayerPreview = ({ data, height = 320, className }: LayerPreviewProps) => {
  const { fc, crs } = useMemo(() => coerceFeatureCollection(data), [data]);
  const processed = useMemo(() => (fc ? reprojectIfNeeded(fc, crs) : null), [fc, crs]);
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    if (!map || !processed) return;
    try {
      const tmp = L.geoJSON(processed);
      const b = tmp.getBounds();
      if (b.isValid()) map.fitBounds(b.pad(0.05));
      tmp.remove();
    } catch {
      // ignore
    }
  }, [map, processed]);

  useEffect(() => {
    if (!map) return;
    const timeout = window.setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // ignore
      }
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [map, processed]);

  return (
    <div className={className}>
      <div className="relative rounded border overflow-hidden" style={{ height: typeof height === 'number' ? `${height}px` : String(height) }}>
        <MapContainer center={[ -7.325, 108.353 ]} zoom={12} className="h-full w-full" zoomControl={false} ref={setMap}>
          {/* Base via Leaflet default OSM */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          />
          {processed && (
            <RLGeoJSON data={processed} style={(feat) => {
              const t = feat?.geometry?.type;
              if (t === 'LineString' || t === 'MultiLineString') return { color: '#334155', weight: 2, opacity: 0.9 };
              if (t === 'Point' || t === 'MultiPoint') return { color: '#16a34a', weight: 2, opacity: 0.9 };
              return { color: '#475569', weight: 1, opacity: 0.8, fillColor: '#cbd5e1', fillOpacity: 0.2 };
            }} />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default LayerPreview;
