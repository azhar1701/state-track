import { LatLng } from 'leaflet';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

export interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export const geocodeAddress = async (query: string): Promise<GeocodingResult[]> => {
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

    return await response.json();
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
};

export const reverseGeocode = async (lat: number, lon: number): Promise<GeocodingResult | null> => {
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

    return await response.json();
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
