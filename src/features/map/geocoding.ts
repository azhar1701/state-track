import { logger } from "@/lib/logger";

// Use multiple free geocoding providers for better accuracy
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const PHOTON_BASE_URL = 'https://photon.komoot.io';

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
    village?: string;
    town?: string;
    amenity?: string;
  };
  type?: string;
  importance?: number;
}

export interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
  address?: GeocodingResultRaw['address'];
  type?: string;
  importance?: number;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    village?: string;
    town?: string;
    type?: string;
  };
}

const fetchPhoton = async (query: string): Promise<GeocodingResult[]> => {
  try {
    const response = await fetch(
      `${PHOTON_BASE_URL}/api/?` +
      `q=${encodeURIComponent(query)}&` +
      `limit=10&` +
      `lat=-7.325&lon=108.353`, // Ciamis center for local bias
      { headers: { 'Accept': 'application/json' } }
    );
    if (!response.ok) return [];
    const data = await response.json() as { features: PhotonFeature[] };
    return (data.features || []).map((f: PhotonFeature) => ({
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      display_name: f.properties.name || f.properties.street || '',
      address: {
        road: f.properties.street,
        city: f.properties.city,
        state: f.properties.state,
        country: f.properties.country,
        village: f.properties.village,
        town: f.properties.town,
      },
      type: f.properties.type,
    })).filter((r: GeocodingResult) => Number.isFinite(r.lat) && Number.isFinite(r.lon));
  } catch (error) {
    console.debug('Photon geocoding error:', error);
    return [];
  }
};

const fetchNominatim = async (query: string): Promise<GeocodingResult[]> => {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?` +
      `format=json&` +
      `q=${encodeURIComponent(query)}&` +
      `addressdetails=1&` +
      `limit=10&` +
      `countrycodes=id&` +
      `viewbox=95,-11,141,6&` +
      `bounded=1&` +
      `accept-language=id`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'StateTrackApp/1.0',
        },
      }
    );
    if (!response.ok) return [];
    const raw: GeocodingResultRaw[] = await response.json();
    return raw
      .map((r) => ({
        lat: Number(r.lat),
        lon: Number(r.lon),
        display_name: r.display_name,
        address: r.address,
        type: r.type,
        importance: r.importance,
      }))
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon));
  } catch (error) {
    console.debug('Nominatim geocoding error:', error);
    return [];
  }
};

export const geocodeAddress = async (query: string): Promise<GeocodingResult[]> => {
  const key = `geo:q:${query.trim().toLowerCase()}`;
  const now = Date.now();
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { t, v } = JSON.parse(cached) as { t: number; v: GeocodingResult[] };
      if (now - t < 7 * 24 * 60 * 60 * 1000) return v;
    }
  } catch (error) {
    // Ignore cache read errors
    console.debug('Cache read error:', error);
  }

  // Fetch from both providers in parallel
  const [photonResults, nominatimResults] = await Promise.all([
    fetchPhoton(query),
    fetchNominatim(query),
  ]);

  // Merge and deduplicate results (prefer Photon for POI, Nominatim for addresses)
  const merged = new Map<string, GeocodingResult>();

  // Add Photon results first (better for landmarks/POI)
  photonResults.forEach((r) => {
    const key = `${r.lat.toFixed(4)},${r.lon.toFixed(4)}`;
    if (!merged.has(key)) merged.set(key, r);
  });

  // Add Nominatim results (better for detailed addresses)
  nominatimResults.forEach((r) => {
    const key = `${r.lat.toFixed(4)},${r.lon.toFixed(4)}`;
    if (!merged.has(key)) merged.set(key, r);
  });

  const results = Array.from(merged.values())
    .sort((a, b) => (b.importance || 0) - (a.importance || 0))
    .slice(0, 10);

  try { localStorage.setItem(key, JSON.stringify({ t: now, v: results })); } catch (error) {
    // Ignore cache write errors
    console.debug('Cache write error:', error);
  }
  return results;
};

export const reverseGeocode = async (lat: number, lon: number): Promise<GeocodingResult | null> => {
  const key = `geo:r:${lat.toFixed(5)},${lon.toFixed(5)}`;
  const now = Date.now();
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { t, v } = JSON.parse(cached) as { t: number; v: GeocodingResult };
      if (now - t < 14 * 24 * 60 * 60 * 1000) return v;
    }
  } catch (error) {
    // Ignore cache read errors
    console.debug('Cache read error:', error);
  }
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=id`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'StateTrackApp/1.0',
        },
      }
    );

    if (!response.ok) throw new Error('Reverse geocoding failed');
    const raw: GeocodingResultRaw = await response.json();
    const latNum = Number(raw.lat);
    const lonNum = Number(raw.lon);
    const result = {
      lat: Number.isFinite(latNum) ? latNum : lat,
      lon: Number.isFinite(lonNum) ? lonNum : lon,
      display_name: raw.display_name,
      address: raw.address,
    };
    try { localStorage.setItem(key, JSON.stringify({ t: now, v: result })); } catch (error) {
      // Ignore cache write errors
      console.debug('Cache write error:', error);
    }
    return result;
  } catch (error) {
    logger.error('Reverse geocoding error:', error);
    return null;
  }
};

export const formatAddress = (result: GeocodingResult): string => {
  if (result.display_name) {
    return result.display_name;
  }

  const parts: string[] = [];
  if (result.address?.amenity) parts.push(result.address.amenity);
  if (result.address?.road) parts.push(result.address.road);
  if (result.address?.village) parts.push(result.address.village);
  if (result.address?.suburb) parts.push(result.address.suburb);
  if (result.address?.town) parts.push(result.address.town);
  if (result.address?.city) parts.push(result.address.city);
  if (result.address?.state) parts.push(result.address.state);

  return parts.join(', ') || `${result.lat.toFixed(6)}, ${result.lon.toFixed(6)}`;
};
