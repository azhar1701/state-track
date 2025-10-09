import { LatLng } from 'leaflet';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

export interface GeocodingResultRaw {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
  address?: GeocodingResultRaw['address'];
}

export const geocodeAddress = async (query: string): Promise<GeocodingResult[]> => {
  const key = `geo:q:${query.trim().toLowerCase()}`;
  const now = Date.now();
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { t, v } = JSON.parse(cached) as { t: number; v: GeocodingResult[] };
      if (now - t < 7 * 24 * 60 * 60 * 1000) return v; // 7 days
    }
  } catch {
    // ignore cache read errors
  }
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }
    const raw: GeocodingResultRaw[] = await response.json();
    const results = raw
      .map((r) => ({
        lat: Number(r.lat),
        lon: Number(r.lon),
        display_name: r.display_name,
        address: r.address,
      }))
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon));
    try { localStorage.setItem(key, JSON.stringify({ t: now, v: results })); } catch {
      // ignore cache write errors
    }
    return results;
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
};

export const reverseGeocode = async (lat: number, lon: number): Promise<GeocodingResult | null> => {
  const key = `geo:r:${lat.toFixed(5)},${lon.toFixed(5)}`;
  const now = Date.now();
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { t, v } = JSON.parse(cached) as { t: number; v: GeocodingResult };
      if (now - t < 14 * 24 * 60 * 60 * 1000) return v; // 14 days
    }
  } catch {
    // ignore cache read errors
  }
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }
    const raw: GeocodingResultRaw = await response.json();
    const latNum = Number(raw.lat);
    const lonNum = Number(raw.lon);
    const result = {
      lat: Number.isFinite(latNum) ? latNum : lat,
      lon: Number.isFinite(lonNum) ? lonNum : lon,
      display_name: raw.display_name,
      address: raw.address,
    };
    try { localStorage.setItem(key, JSON.stringify({ t: now, v: result })); } catch {
      // ignore cache write errors
    }
    return result;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

export const formatAddress = (result: GeocodingResult): string => {
  if (result.display_name) {
    return result.display_name;
  }

  const parts: string[] = [];
  if (result.address?.road) parts.push(result.address.road);
  if (result.address?.suburb) parts.push(result.address.suburb);
  if (result.address?.city) parts.push(result.address.city);
  if (result.address?.state) parts.push(result.address.state);

  return parts.join(', ') || `${result.lat.toFixed(6)}, ${result.lon.toFixed(6)}`;
};
