import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import type { WeatherData } from '../types';

interface UseWeatherResult {
  data: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  fromCache: boolean;
  refetch: () => void;
}

export function useWeather(city: string | null): UseWeatherResult {
  const [data, setData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    if (city) setTick((t) => t + 1);
  }, [city]);

  // `cancelled` guards against a fast city switch where an older response
  // arrives after a newer one has been issued — without it the stale payload
  // would overwrite the fresh data and the UI would flicker back.
  useEffect(() => {
    if (!city) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .get<WeatherData>('/weather', { params: { city } })
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setFromCache(res.headers['x-cache'] === 'HIT');
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err?.response?.data?.error ?? 'Unable to fetch weather data';
          setError(msg);
          setData(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [city, tick]);

  return { data, isLoading, error, fromCache, refetch };
}
