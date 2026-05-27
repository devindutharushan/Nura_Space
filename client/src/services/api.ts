import axios from 'axios';

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

export async function pushMessage(payload: import('../types').PushMessagePayload) {
  const res = await api.post<import('../types').PushMessageResult>('/messages', payload);
  return res.data;
}

export async function searchLocations(q: string): Promise<import('../types').LocationResult[]> {
  const res = await api.get<{ results: import('../types').LocationResult[] }>('/locations/search', {
    params: { q },
  });
  return res.data.results;
}

export async function getNearbyCity(
  lat: number,
  lon: number,
): Promise<import('../types').NearbyCity> {
  const res = await api.get<import('../types').NearbyCity>('/locations/nearby', {
    params: { lat, lon },
  });
  return res.data;
}

export default api;
