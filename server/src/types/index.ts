import type { Request } from 'express';

export type UserRole = 'admin' | 'demo';

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  avatarInitials: string;
  role: UserRole;
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; username: string; role: UserRole };
}

export type MessageSeverity = 'info' | 'warning' | 'critical';

export interface PushMessageBody {
  city: string;
  message: string;
  severity?: MessageSeverity;
}

export interface CityMessage {
  city: string;
  message: string;
  severity: MessageSeverity;
  timestamp: string;
}

export interface HourlyForecast {
  dt: number;
  temp: number;
  feelsLike: number;
  pop: number;
  iconCode: string;
  lucideIconName: string;
  condition: string;
}

export interface DailyForecast {
  dt: number;
  tempMin: number;
  tempMax: number;
  pop: number;
  uvi: number;
  iconCode: string;
  lucideIconName: string;
  condition: string;
  summary: string;
}

export interface WeatherAlert {
  senderName: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
}

export interface WeatherData {
  city: string;
  country: string;
  lat: number;
  lon: number;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windGust: number | null;
  windDeg: number;
  uvIndex: number | null;
  pressure: number;
  visibility: number;
  dewPoint: number;
  clouds: number;
  condition: string;
  conditionDescription: string;
  iconCode: string;
  lucideIconName: string;
  rain: number | null;
  snow: number | null;
  sunrise: number;
  sunset: number;
  timestamp: number;
  overview: string | null;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  alerts: WeatherAlert[];
}

export interface OWMGeoResponse {
  name: string;
  local_names?: Record<string, string>;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export interface OWMOneCallCurrentWeather {
  dt: number;
  sunrise: number;
  sunset: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust?: number;
  weather: Array<{ id: number; main: string; description: string; icon: string }>;
  rain?: { '1h': number };
  snow?: { '1h': number };
}

export interface OWMOneCallHourly {
  dt: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust?: number;
  weather: Array<{ id: number; main: string; description: string; icon: string }>;
  pop: number;
}

export interface OWMOneCallDaily {
  dt: number;
  sunrise: number;
  sunset: number;
  moonrise: number;
  moonset: number;
  moon_phase: number;
  summary?: string;
  temp: { day: number; min: number; max: number; night: number; eve: number; morn: number };
  feels_like: { day: number; night: number; eve: number; morn: number };
  pressure: number;
  humidity: number;
  dew_point: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust?: number;
  weather: Array<{ id: number; main: string; description: string; icon: string }>;
  clouds: number;
  pop: number;
  rain?: number;
  snow?: number;
  uvi: number;
}

export interface OWMOneCallAlert {
  sender_name: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
}

export interface GeocodingResult {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  country: string;
  countryCode: string;
}

export interface NearbyCity {
  name: string;
  distanceKm: number;
  lat: number;
  lon: number;
}

export interface OWMOneCallResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: OWMOneCallCurrentWeather;
  minutely?: Array<{ dt: number; precipitation: number }>;
  hourly?: OWMOneCallHourly[];
  daily?: OWMOneCallDaily[];
  alerts?: OWMOneCallAlert[];
}
