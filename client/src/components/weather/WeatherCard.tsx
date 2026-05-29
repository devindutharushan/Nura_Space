import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Wind,
  Tornado,
  Sunrise,
  Sunset,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { WeatherMetric } from './WeatherMetric';
import type {
  WeatherData,
  WeatherIconName,
  HourlyForecast,
  DailyForecast,
  WeatherAlert,
} from '../../types';

const weatherIcons = {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Wind,
  Tornado,
} as const;

const conditionTheme: Record<WeatherIconName, { strip: string; iconColor: string; bg: string }> = {
  Sun: {
    strip: 'from-amber-300 via-amber-400 to-orange-400',
    iconColor: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  Cloud: {
    strip: 'from-slate-300 via-slate-400 to-slate-500',
    iconColor: 'text-slate-500',
    bg: 'bg-slate-50',
  },
  CloudRain: {
    strip: 'from-blue-400 via-blue-500 to-indigo-500',
    iconColor: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  CloudSnow: {
    strip: 'from-cyan-300 via-blue-300 to-indigo-400',
    iconColor: 'text-cyan-500',
    bg: 'bg-cyan-50',
  },
  CloudLightning: {
    strip: 'from-purple-400 via-violet-500 to-indigo-500',
    iconColor: 'text-violet-500',
    bg: 'bg-violet-50',
  },
  CloudDrizzle: {
    strip: 'from-teal-400 via-cyan-400 to-blue-500',
    iconColor: 'text-teal-500',
    bg: 'bg-teal-50',
  },
  CloudFog: {
    strip: 'from-gray-300 via-gray-400 to-gray-500',
    iconColor: 'text-gray-500',
    bg: 'bg-gray-50',
  },
  Wind: {
    strip: 'from-cyan-400 via-sky-400 to-blue-500',
    iconColor: 'text-sky-600',
    bg: 'bg-sky-50',
  },
  Tornado: {
    strip: 'from-slate-400 via-gray-400 to-slate-600',
    iconColor: 'text-slate-600',
    bg: 'bg-slate-50',
  },
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function formatClockTime(dt: number): string {
  const d = new Date(dt * 1000);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m} ${ampm}`;
}

function formatHour(dt: number): string {
  const d = new Date(dt * 1000);
  const h = d.getHours();
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function formatDay(dt: number): string {
  const d = new Date(dt * 1000);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (d.getDay() === new Date().getDay()) return 'Today';
  return days[d.getDay()];
}

function windDegToDir(deg: number): string {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
}

function twoSentences(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  return sentences.slice(0, 2).join(' ').trim() || text.slice(0, 160).trimEnd() + '…';
}

function uvCategory(uvi: number): string {
  if (uvi <= 2) return 'Low';
  if (uvi <= 5) return 'Moderate';
  if (uvi <= 7) return 'High';
  if (uvi <= 10) return 'Very High';
  return 'Extreme';
}

function AlertBanner({ alert }: { alert: WeatherAlert }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 bg-severity-critical/5 border border-severity-critical/25 rounded-2xl overflow-hidden"
    >
      <button
        type="button"
        className="w-full px-5 py-3.5 flex items-start gap-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <AlertTriangle
          size={16}
          className="text-severity-critical shrink-0 mt-0.5"
          strokeWidth={1.75}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-severity-critical leading-tight">
            {alert.event}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5 truncate">{alert.senderName}</p>
        </div>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`text-text-secondary shrink-0 mt-0.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-severity-critical/15">
              <p className="text-xs text-text-secondary leading-relaxed mt-3 whitespace-pre-line">
                {alert.description}
              </p>
              <p className="text-[10px] text-text-muted mt-2 font-mono">
                Until {new Date(alert.end * 1000).toLocaleString()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SunriseSunsetRow({ sunrise, sunset }: { sunrise: number; sunset: number }) {
  return (
    <div className="flex items-center justify-around py-3 sm:py-3.5 mb-4 sm:mb-5 bg-bg-soft rounded-2xl border border-border-subtle">
      <div className="flex items-center gap-2.5">
        <Sunrise size={18} className="text-amber-500 shrink-0" strokeWidth={1.5} />
        <div>
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">
            Sunrise
          </p>
          <p className="text-sm font-semibold text-text-primary">{formatClockTime(sunrise)}</p>
        </div>
      </div>
      <div className="w-px h-8 bg-border-subtle" />
      <div className="flex items-center gap-2.5">
        <Sunset size={18} className="text-orange-500 shrink-0" strokeWidth={1.5} />
        <div>
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">
            Sunset
          </p>
          <p className="text-sm font-semibold text-text-primary">{formatClockTime(sunset)}</p>
        </div>
      </div>
    </div>
  );
}

function HourlyStrip({ hourly }: { hourly: HourlyForecast[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-2.5">
        Next 24 hours
      </p>
      <div className="overflow-x-auto -mx-4 sm:-mx-8 px-4 sm:px-8">
        <div className="flex gap-0.5 min-w-max pb-1">
          {hourly.map((h) => {
            const Icon = weatherIcons[h.lucideIconName as WeatherIconName] ?? Cloud;
            return (
              <div
                key={h.dt}
                className="flex flex-col items-center gap-1.5 min-w-[48px] px-1 py-2 rounded-xl hover:bg-bg-soft transition-colors"
              >
                <span className="text-[10px] text-text-secondary font-medium tabular-nums">
                  {formatHour(h.dt)}
                </span>
                <Icon size={14} className="text-text-secondary shrink-0" strokeWidth={1.5} />
                <span className="text-xs font-semibold text-text-primary tabular-nums">
                  {h.temp}°
                </span>
                {h.pop > 0.05 ? (
                  <span className="text-[9px] text-severity-info font-medium tabular-nums">
                    {Math.round(h.pop * 100)}%
                  </span>
                ) : (
                  <span className="h-3.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DailyForecastList({ daily }: { daily: DailyForecast[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-1 mt-5">
        Next 8 days
      </p>
      <div className="divide-y divide-border-subtle">
        {daily.map((d) => {
          const Icon = weatherIcons[d.lucideIconName as WeatherIconName] ?? Cloud;
          return (
            <div key={d.dt} className="flex items-center gap-3 py-2.5">
              <span className="w-11 text-xs font-medium text-text-secondary shrink-0">
                {formatDay(d.dt)}
              </span>
              <Icon size={14} className="text-text-secondary shrink-0" strokeWidth={1.5} />
              <span className="flex-1 text-xs text-text-secondary truncate">{d.condition}</span>
              {d.pop > 0.05 && (
                <span className="text-[10px] text-severity-info font-medium tabular-nums min-w-[28px] text-right">
                  {Math.round(d.pop * 100)}%
                </span>
              )}
              <div className="flex items-center gap-1 min-w-[54px] justify-end">
                <span className="text-xs text-text-secondary tabular-nums">{d.tempMin}°</span>
                <span className="text-[10px] text-border-muted">/</span>
                <span className="text-xs font-semibold text-text-primary tabular-nums">
                  {d.tempMax}°
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeatherSkeleton() {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-card animate-pulse">
      <div className="h-1 bg-bg-soft" />
      <div className="p-4 sm:p-8 space-y-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-6 w-28 bg-bg-soft rounded-lg" />
            <div className="h-3.5 w-12 bg-bg-soft rounded-lg" />
          </div>
          <div className="w-14 h-14 bg-bg-soft rounded-2xl" />
        </div>
        <div className="h-20 w-36 bg-bg-soft rounded-xl" />
        <div className="h-4 w-44 bg-bg-soft rounded-lg" />
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-bg-soft rounded-2xl h-[88px]" />
          ))}
        </div>
        <div className="h-14 bg-bg-soft rounded-2xl" />
        <div className="h-20 bg-bg-soft rounded-2xl" />
      </div>
      <p className="sr-only">Loading weather…</p>
    </div>
  );
}

interface WeatherCardProps {
  data: WeatherData;
  isLoading: boolean;
  fromCache?: boolean;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.07 },
  },
};

export function WeatherCard({ data, isLoading, fromCache = false }: WeatherCardProps) {
  if (isLoading) return <WeatherSkeleton />;

  const iconName = data.lucideIconName as WeatherIconName;
  const theme = conditionTheme[iconName] ?? conditionTheme.Cloud;
  const Icon = weatherIcons[iconName] ?? Cloud;

  return (
    <motion.div key={data.city} variants={cardVariants} initial="hidden" animate="visible">
      {data.alerts.map((alert) => (
        <AlertBanner key={`${alert.event}-${alert.start}`} alert={alert} />
      ))}

      <div className="bg-bg-surface border border-border-subtle rounded-2xl shadow-card overflow-hidden">
        <div className={`h-1 bg-gradient-to-r ${theme.strip}`} />

        <div className="p-4 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-3 sm:mb-6">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-semibold text-text-primary tracking-tight truncate">
                {data.city}
              </h2>
              <span className="text-[11px] font-medium text-text-secondary tracking-widest uppercase mt-0.5 block">
                {data.country}
              </span>
            </div>
            <div
              className={`p-2.5 sm:p-3.5 ${theme.bg} border border-border-subtle rounded-2xl shrink-0`}
            >
              <Icon
                size={22}
                className={`${theme.iconColor} sm:!w-[26px] sm:!h-[26px]`}
                strokeWidth={1.5}
              />
            </div>
          </div>

          <div className="flex items-start gap-1 mb-1">
            <span className="text-[52px] sm:text-[72px] font-light text-text-primary leading-none tracking-tight">
              {data.temperature}
            </span>
            <span className="text-xl sm:text-2xl font-light text-text-secondary mt-2.5 sm:mt-4">
              °C
            </span>
          </div>

          <p className="text-text-secondary text-sm sm:text-base -mt-1">
            {data.conditionDescription}
          </p>

          {data.overview && (
            <p className="text-text-secondary text-xs leading-relaxed mt-1.5 mb-4 sm:mb-6 italic">
              {twoSentences(data.overview)}
            </p>
          )}
          {!data.overview && <div className="mb-3 sm:mb-6" />}

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-5">
            <WeatherMetric icon="Thermometer" label="Feels like" value={data.feelsLike} unit="°C" />
            <WeatherMetric icon="Droplets" label="Humidity" value={data.humidity} unit="%" />
            <WeatherMetric
              icon="Wind"
              label="Wind"
              value={data.windSpeed}
              unit={`km/h · ${windDegToDir(data.windDeg)}`}
            />
            <WeatherMetric
              icon="Sun"
              label="UV Index"
              value={data.uvIndex ?? '—'}
              unit={data.uvIndex != null ? uvCategory(data.uvIndex) : ''}
            />
            <WeatherMetric icon="Gauge" label="Pressure" value={data.pressure} unit="hPa" />
            <WeatherMetric icon="Eye" label="Visibility" value={data.visibility} unit="km" />
          </div>

          {(data.windGust != null ||
            (data.rain != null && data.rain > 0) ||
            (data.snow != null && data.snow > 0)) && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-text-secondary mb-3 sm:mb-5 -mt-1 sm:-mt-2">
              {data.windGust != null && (
                <span>
                  Gusts up to{' '}
                  <span className="font-semibold text-text-primary">{data.windGust} km/h</span>
                </span>
              )}
              {data.rain != null && data.rain > 0 && (
                <span>
                  Rain{' '}
                  <span className="font-semibold text-severity-info">
                    {data.rain.toFixed(1)} mm/h
                  </span>
                </span>
              )}
              {data.snow != null && data.snow > 0 && (
                <span>
                  Snow{' '}
                  <span className="font-semibold text-sky-600">{data.snow.toFixed(1)} mm/h</span>
                </span>
              )}
            </div>
          )}

          <SunriseSunsetRow sunrise={data.sunrise} sunset={data.sunset} />

          {data.hourly.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <HourlyStrip hourly={data.hourly} />
            </div>
          )}

          {data.daily.length > 0 && <DailyForecastList daily={data.daily} />}

          <div className="mt-5 pt-4 sm:pt-5 border-t border-border-subtle flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] text-text-secondary">
                Updated {timeAgo(data.timestamp)}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide border ${
                  fromCache
                    ? 'bg-severity-warning/10 text-severity-warning border-severity-warning/25'
                    : 'bg-accent-soft text-accent-primary border-accent-primary/20'
                }`}
                title={
                  fromCache ? 'Served from server cache (60 s TTL)' : 'Fresh from OpenWeatherMap'
                }
              >
                {fromCache ? 'Cached' : 'Live'}
              </span>
            </div>
            <span className="text-[11px] text-text-secondary font-mono shrink-0">
              {data.lat.toFixed(2)}, {data.lon.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
