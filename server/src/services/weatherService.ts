import axios from 'axios';
import type {
  WeatherData,
  HourlyForecast,
  DailyForecast,
  WeatherAlert,
  OWMGeoResponse,
  OWMOneCallResponse,
} from '../types';

// One-minute TTL is a deliberate tradeoff: OpenWeather charges per call and
// alert payloads rarely change minute-to-minute, but anything longer would
// risk admins broadcasting against stale conditions. Cache key is the
// normalised city name so casing differences don't fragment the cache.
const weatherCache = new Map<string, { data: WeatherData; cachedAt: number }>();
const CACHE_TTL = 60_000;

export function getCachedWeather(city: string): WeatherData | null {
  const cached = weatherCache.get(city.toLowerCase());
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) return cached.data;
  return null;
}

function getLucideIconName(weatherId: number): string {
  if (weatherId >= 200 && weatherId <= 232) return 'CloudLightning';
  if (weatherId >= 300 && weatherId <= 321) return 'CloudDrizzle';
  if (weatherId >= 500 && weatherId <= 531) return 'CloudRain';
  if (weatherId >= 600 && weatherId <= 622) return 'CloudSnow';
  if (weatherId >= 701 && weatherId <= 741) return 'CloudFog';
  if (weatherId >= 751 && weatherId <= 771) return 'Wind';
  if (weatherId === 781) return 'Tornado';
  if (weatherId === 800) return 'Sun';
  if (weatherId >= 801 && weatherId <= 804) return 'Cloud';
  return 'Cloud';
}

async function geocodeCity(
  city: string,
  apiKey: string,
): Promise<{ lat: number; lon: number; name: string; country: string }> {
  const res = await axios.get<OWMGeoResponse[]>('https://api.openweathermap.org/geo/1.0/direct', {
    params: { q: city, limit: 1, appid: apiKey },
    timeout: 8000,
  });
  if (!res.data.length) {
    throw Object.assign(new Error('City not found'), { code: 'CITY_NOT_FOUND' });
  }
  const { lat, lon, name, country } = res.data[0];
  return { lat, lon, name, country };
}

function transformOneCall(
  data: OWMOneCallResponse,
  cityName: string,
  country: string,
  overview: string | null = null,
): WeatherData {
  const cur = data.current;
  const weather = cur.weather[0];
  const now = Date.now();

  const hourly: HourlyForecast[] = (data.hourly ?? []).slice(0, 24).map((h) => ({
    dt: h.dt,
    temp: Math.round(h.temp),
    feelsLike: Math.round(h.feels_like),
    pop: h.pop,
    iconCode: h.weather[0].icon,
    lucideIconName: getLucideIconName(h.weather[0].id),
    condition: h.weather[0].main,
  }));

  const daily: DailyForecast[] = (data.daily ?? []).slice(0, 8).map((d) => ({
    dt: d.dt,
    tempMin: Math.round(d.temp.min),
    tempMax: Math.round(d.temp.max),
    pop: d.pop,
    uvi: Math.round(d.uvi),
    iconCode: d.weather[0].icon,
    lucideIconName: getLucideIconName(d.weather[0].id),
    condition: d.weather[0].main,
    summary: d.summary ?? '',
  }));

  // Drop alerts whose end time has already passed — the upstream feed
  // sometimes lags clearing expired warnings, and we'd otherwise rebroadcast
  // them when a fresh socket joins the room.
  const alerts: WeatherAlert[] = (data.alerts ?? [])
    .filter((a) => a.end * 1000 > now)
    .map((a) => ({
      senderName: a.sender_name,
      event: a.event,
      start: a.start,
      end: a.end,
      description: a.description,
      tags: a.tags ?? [],
    }));

  return {
    city: cityName,
    country,
    lat: data.lat,
    lon: data.lon,
    temperature: Math.round(cur.temp),
    feelsLike: Math.round(cur.feels_like),
    humidity: cur.humidity,
    windSpeed: Math.round(cur.wind_speed * 3.6),
    windGust: cur.wind_gust != null ? Math.round(cur.wind_gust * 3.6) : null,
    windDeg: cur.wind_deg,
    uvIndex: cur.uvi != null ? Math.round(cur.uvi * 10) / 10 : null,
    pressure: cur.pressure,
    visibility: Math.round(cur.visibility / 100) / 10,
    dewPoint: Math.round(cur.dew_point),
    clouds: cur.clouds,
    condition: weather.main,
    conditionDescription:
      weather.description.charAt(0).toUpperCase() + weather.description.slice(1),
    iconCode: weather.icon,
    lucideIconName: getLucideIconName(weather.id),
    rain: cur.rain?.['1h'] ?? null,
    snow: cur.snow?.['1h'] ?? null,
    sunrise: cur.sunrise,
    sunset: cur.sunset,
    timestamp: cur.dt * 1000,
    overview,
    hourly,
    daily,
    alerts,
  };
}

export async function getWeatherByCity(city: string): Promise<WeatherData> {
  const cacheKey = city.toLowerCase();
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) return cached.data;

  const apiKey = process.env.OWM_API_KEY;
  if (!apiKey)
    throw Object.assign(new Error('Weather service not configured'), { code: 'NO_API_KEY' });

  const { lat, lon, name, country } = await geocodeCity(city, apiKey);

  // The narrative overview endpoint is a nice-to-have. Use Promise.allSettled
  // so an overview outage or rate-limit doesn't take down the core weather
  // card — only the primary One Call response is mandatory.
  const [oneCallRes, overviewRes] = await Promise.allSettled([
    axios.get<OWMOneCallResponse>('https://api.openweathermap.org/data/3.0/onecall', {
      params: { lat, lon, units: 'metric', appid: apiKey, exclude: 'minutely' },
      timeout: 8000,
    }),
    axios.get<{ weather_overview: string }>(
      'https://api.openweathermap.org/data/3.0/onecall/overview',
      { params: { lat, lon, units: 'metric', appid: apiKey }, timeout: 5000 },
    ),
  ]);

  if (oneCallRes.status === 'rejected') throw oneCallRes.reason;
  const overview =
    overviewRes.status === 'fulfilled' ? overviewRes.value.data.weather_overview : null;

  const weatherData = transformOneCall(oneCallRes.value.data, name, country, overview);
  weatherCache.set(cacheKey, { data: weatherData, cachedAt: Date.now() });
  return weatherData;
}
