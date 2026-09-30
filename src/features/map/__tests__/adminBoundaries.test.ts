import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import L from 'leaflet';

describe('Admin Boundaries GeoJSON and Leaflet Integration', () => {
  it('loads adm_ciamis.geojson and validates WGS84 coordinates', () => {
    const filePath = path.resolve(__dirname, '../../../../public/data/adm_ciamis.geojson');
    expect(fs.existsSync(filePath)).toBe(true);

    const raw = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(raw);

    expect(json.type).toBe('FeatureCollection');
    expect(json.features.length).toBeGreaterThan(0);

    const firstFeature = json.features[0];
    expect(firstFeature.geometry.type).toBe('MultiPolygon');

    const firstCoord = firstFeature.geometry.coordinates[0][0][0];
    expect(Array.isArray(firstCoord)).toBe(true);
    expect(firstCoord.length).toBeGreaterThanOrEqual(2);

    // Longitude should be ~108.4, latitude should be ~-7.3
    const [lon, lat] = firstCoord;
    expect(lon).toBeGreaterThan(107);
    expect(lon).toBeLessThan(110);
    expect(lat).toBeGreaterThan(-9);
    expect(lat).toBeLessThan(-6);
  });

  it('can be mounted into Leaflet GeoJSON layer and produces valid bounds', () => {
    const filePath = path.resolve(__dirname, '../../../../public/data/adm_ciamis.geojson');
    const raw = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(raw);

    const layer = L.geoJSON(json);
    expect(layer.getLayers().length).toBe(json.features.length);

    const bounds = layer.getBounds();
    expect(bounds.isValid()).toBe(true);

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    expect(sw.lat).toBeLessThan(ne.lat);
    expect(sw.lng).toBeLessThan(ne.lng);
    expect(sw.lng).toBeGreaterThan(108);
    expect(ne.lng).toBeLessThan(109);
  });
});
