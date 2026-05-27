export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarInitials: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export type WeatherIconName =
  | 'Sun'
  | 'Cloud'
  | 'CloudRain'
  | 'CloudSnow'
  | 'CloudLightning'
  | 'CloudDrizzle'
  | 'CloudFog'
  | 'Wind'
  | 'Tornado';

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
  lucideIconName: WeatherIconName;
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

export type MessageSeverity = 'info' | 'warning' | 'critical';

export interface CityMessage {
  city: string;
  message: string;
  severity: MessageSeverity;
  timestamp: string;
}

export interface Toast {
  id: string;
  city: string;
  message: string;
  severity: MessageSeverity;
  timestamp: Date;
  duration: number;
}

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (city: string, message: string, severity?: MessageSeverity) => void;
  dismissToast: (id: string) => void;
}

export interface WebSocketContextValue {
  isConnected: boolean;
  subscribeToCity: (city: string) => void;
  unsubscribeFromCity: (city: string) => void;
  currentCity: string | null;
}

export interface WsServerMessage {
  type: 'message' | 'auth_error' | 'subscribed';
  city?: string;
  text?: string;
  timestamp?: string;
  error?: string;
}

export interface PushMessagePayload {
  city: string;
  message: string;
  severity: MessageSeverity;
}

export interface PushMessageResult {
  delivered: number;
  city: string;
  severity: MessageSeverity;
}

export interface LocationResult {
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
