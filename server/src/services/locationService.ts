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

export const SUPPORTED_CITIES: Array<{ name: string; lat: number; lon: number }> = [
  { name: 'Melbourne', lat: -37.8136, lon: 144.9631 },
  { name: 'Southbank', lat: -37.8236, lon: 144.9631 },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { name: 'Brisbane', lat: -27.4698, lon: 153.0251 },
  { name: 'Perth', lat: -31.9523, lon: 115.8613 },
  { name: 'Adelaide', lat: -34.9285, lon: 138.6007 },
  { name: 'London', lat: 51.5074, lon: -0.1278 },
  { name: 'New York', lat: 40.7128, lon: -74.006 },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getNearestCity(lat: number, lon: number): NearbyCity {
  let nearest = SUPPORTED_CITIES[0];
  let minDist = haversineKm(lat, lon, nearest.lat, nearest.lon);
  for (const city of SUPPORTED_CITIES.slice(1)) {
    const d = haversineKm(lat, lon, city.lat, city.lon);
    if (d < minDist) {
      minDist = d;
      nearest = city;
    }
  }
  return {
    name: nearest.name,
    distanceKm: Math.round(minDist * 10) / 10,
    lat: nearest.lat,
    lon: nearest.lon,
  };
}

const geocodeCache = new Map<string, { data: GeocodingResult[]; expiresAt: number }>();

export async function searchLocations(query: string): Promise<GeocodingResult[]> {
  const key = query.toLowerCase().trim();
  const cached = geocodeCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const res = await axios.get<OpenMeteoResponse>('https://geocoding-api.open-meteo.com/v1/search', {
    params: { name: key, count: 6, language: 'en', format: 'json' },
    timeout: 5000,
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
