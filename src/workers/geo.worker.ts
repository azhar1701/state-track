import { expose } from 'comlink';
import proj4 from 'proj4';
import type { FeatureCollection, Geometry } from 'geojson';

proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs');
proj4.defs('EPSG:32749', '+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs +type=crs');

const transformCoord = (pt: number[], fromCrs: string): [number, number] => {
  const [x, y] = pt;
  const [lon, lat] = proj4(fromCrs, 'EPSG:4326', [x, y]);
  return [lon, lat];
};

const reprojectGeometry = (geom: Geometry, fromCrs: string): Geometry => {
  if (!geom) return geom;
  const t = geom.type;
  const coords = (geom as { coordinates?: unknown }).coordinates;
  
  const mapCoords = (arr: unknown): unknown => {
    if (!Array.isArray(arr)) return arr;
    if (arr.length > 0 && typeof arr[0] === 'number') return transformCoord(arr as number[], fromCrs);
    return (arr as unknown[]).map((a) => mapCoords(a));
  };
  
  if (t === 'GeometryCollection') {
    return { type: 'GeometryCollection', geometries: (geom as { geometries: Geometry[] }).geometries.map((g: Geometry) => reprojectGeometry(g, fromCrs)) };
  }
  return { type: t, coordinates: mapCoords(coords) } as Geometry;
};

const detectCRS = (data: FeatureCollection<Geometry>): string | null => {
  const embeddedCrsName = (data as { crs?: { properties?: { name?: string } } })?.crs?.properties?.name || '';
  const srcName = embeddedCrsName.toUpperCase();
  
  if (srcName.includes('EPSG:4326')) return null;
  if (srcName.includes('EPSG:3857') || srcName.includes('EPSG:900913')) return 'EPSG:3857';
  if (srcName.includes('EPSG:32749') || srcName.includes('32749')) return 'EPSG:32749';
  
  const sample = data.features?.find((f) => f.geometry && 'coordinates' in f.geometry);
  if (!sample) return null;
  
  const peek = (coords: unknown): [number, number] | null => {
    if (!Array.isArray(coords)) return null;
    if (coords.length > 0 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      return [coords[0], coords[1]];
    }
    for (const c of coords) {
      const p = peek(c);
      if (p) return p;
    }
    return null;
  };
  
  const coord = peek((sample.geometry as { coordinates?: unknown }).coordinates);
  if (coord && (Math.abs(coord[0]) > 1000 || Math.abs(coord[1]) > 1000)) {
    return 'EPSG:32749';
  }
  
  return null;
};

const geoWorker = {
  async parseAndReproject(data: FeatureCollection<Geometry>): Promise<FeatureCollection<Geometry>> {
    const sourceCrs = detectCRS(data);
    
    if (!sourceCrs) return data;
    
    return {
      type: 'FeatureCollection',
      features: data.features.map((f) => ({
        type: 'Feature',
        properties: f.properties || {},
        geometry: reprojectGeometry(f.geometry, sourceCrs),
      })),
    };
  },
};

expose(geoWorker);

export type GeoWorker = typeof geoWorker;
