import axios from 'axios';
import type { GeocodingResult, NearbyCity } from '../types';

interface OpenMeteoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  country_code: string;
}

interface OpenMeteoResponse {
  results?: OpenMeteoResult[];
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface NominatimReverseResult {
  lat: string;
  lon: string;
  address: {
    suburb?: string;
    town?: string;
    village?: string;
    city?: string;
    municipality?: string;
    county?: string;
  };
}

// Reverse-geocode results are cached for 10 minutes keyed on coordinates
// rounded to ~11m (4 decimal places). This both honours Nominatim's fair-use
// policy (max 1 req/s) and avoids hammering them when several users in the
// same building hit "Use my location" in succession.
const reverseGeocodeCache = new Map<string, { data: NearbyCity; expiresAt: number }>();

/**
 * Resolve a city name from raw coordinates without ever storing the user's
 * exact lat/lon — only the rounded cache key and the resolved place name
 * leave this function. The User-Agent identifies the app per Nominatim's
 * acceptable-use policy; using the default UA gets the IP banned.
 */
export async function getReverseGeocode(lat: number, lon: number): Promise<NearbyCity> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = reverseGeocodeCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const res = await axios.get<NominatimReverseResult>(
    'https://nominatim.openstreetmap.org/reverse',
    {
      params: { lat, lon, format: 'json' },
      headers: { 'User-Agent': 'NuraSpace/1.0 (devindutharushan@gmail.com)' },
      timeout: 5000,
    },
  );

  const addr = res.data.address;
  const name =
    addr.suburb ??
    addr.town ??
    addr.village ??
    addr.city ??
    addr.municipality ??
    addr.county ??
    'Unknown';
  const placeLat = parseFloat(res.data.lat);
  const placeLon = parseFloat(res.data.lon);

  const result: NearbyCity = {
    name,
    distanceKm: Math.round(haversineKm(lat, lon, placeLat, placeLon) * 10) / 10,
    lat: placeLat,
    lon: placeLon,
  };

  reverseGeocodeCache.set(key, { data: result, expiresAt: Date.now() + 10 * 60_000 });
  return result;
}

// Cache search results for 10 minutes. The frontend already debounces input
// before reaching this endpoint, but multiple users typing the same prefix
// (e.g. "mel") would otherwise produce duplicate upstream calls per keystroke.
const geocodeCache = new Map<string, { data: GeocodingResult[]; expiresAt: number }>();

export async function searchLocations(query: string): Promise<GeocodingResult[]> {
  const key = query.toLowerCase().trim();
  const cached = geocodeCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const res = await axios.get<OpenMeteoResponse>('https://geocoding-api.open-meteo.com/v1/search', {
    params: { name: key, count: 6, language: 'en', format: 'json' },
    timeout: 8000,
    // Force IPv4: Open-Meteo's AAAA record is blackholed from Azure Container Apps egress
    // in australiaeast, causing 5s ETIMEDOUT before Happy Eyeballs falls back.
    family: 4,
  });

  const raw = res.data.results ?? [];
  const results: GeocodingResult[] = raw.map((r) => ({
    name: r.name,
    displayName: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    countryCode: r.country_code,
  }));

  geocodeCache.set(key, { data: results, expiresAt: Date.now() + 10 * 60_000 });
  return results;
}
