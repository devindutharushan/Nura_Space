import axios from 'axios';
import type {
  PushMessagePayload,
  PushMessageResult,
  LocationResult,
  NearbyCity,
  CityMessage,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nura_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Any 401 — token expired or revoked server-side — is treated as a hard
// session loss: we wipe the stored token and bounce to /login rather than
// quietly let the user keep clicking around in a broken state. The hard
// navigation also tears down the WebSocket connection and any in-flight
// requests holding the stale token in memory.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      localStorage.removeItem('nura_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export async function pushMessage(payload: PushMessagePayload): Promise<PushMessageResult> {
  const res = await api.post<PushMessageResult>('/messages', payload);
  return res.data;
}

export async function searchLocations(q: string, signal?: AbortSignal): Promise<LocationResult[]> {
  const res = await api.get<{ results: LocationResult[] }>('/locations/search', {
    params: { q },
    signal,
  });
  return res.data.results;
}

export async function getNearbyCity(lat: number, lon: number): Promise<NearbyCity> {
  const res = await api.get<NearbyCity>('/locations/nearby', { params: { lat, lon } });
  return res.data;
}

export async function getCityHistory(
  city: string,
): Promise<{ city: string; messages: CityMessage[] }> {
  const res = await api.get<{ city: string; messages: CityMessage[] }>(
    `/messages/${encodeURIComponent(city.toLowerCase().trim())}/history`,
  );
  return res.data;
}

export default api;
