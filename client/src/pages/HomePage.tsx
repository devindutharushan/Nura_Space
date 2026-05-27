import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '../components/layout/AppShell';
import { CitySearch } from '../components/weather/CitySearch';
import { WeatherCard } from '../components/weather/WeatherCard';
import { useWeather } from '../hooks/useWeather';
import { useWebSocket } from '../hooks/useWebSocket';
import { pushMessage } from '../services/api';
import type { MessageSeverity } from '../types';
import {
  CloudOff,
  MapPin,
  Send,
  Loader2,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

const CITIES = [
  'Melbourne',
  'Sydney',
  'Brisbane',
  'Perth',
  'Adelaide',
  'Southbank',
  'London',
  'New York',
  'Tokyo',
  'Paris',
  'Dubai',
  'Singapore',
];

const SEVERITY_OPTIONS: { value: MessageSeverity; label: string; color: string }[] = [
  { value: 'info', label: 'Info', color: 'text-sky-400' },
  { value: 'warning', label: 'Warning', color: 'text-amber-400' },
  { value: 'critical', label: 'Critical', color: 'text-red-400' },
];

function AdminPanel({ currentCity }: { currentCity: string | null }) {
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState(currentCity ?? 'Melbourne');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<MessageSeverity>('info');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ delivered: number; city: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!city.trim() || !message.trim()) return;
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const res = await pushMessage({ city: city.trim(), message: message.trim(), severity });
      setResult(res);
      setMessage('');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Failed to send message',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Send size={14} className="text-text-muted" strokeWidth={1.75} />
          <span className="text-sm font-semibold text-text-primary">Send Test Message</span>
          <span className="text-[10px] text-text-muted bg-bg-elevated border border-border-subtle rounded-full px-2 py-0.5">
            Admin
          </span>
        </div>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSend}
              className="px-5 pb-5 border-t border-border-subtle space-y-3 pt-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
                  City
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-border-strong transition-colors"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
                  Message
                </label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Severe weather alert near Southbank"
                  maxLength={500}
                  className="bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-strong transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
                  Severity
                </label>
                <div className="flex gap-2">
                  {SEVERITY_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSeverity(s.value)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all duration-150 ${
                        severity === s.value
                          ? `${s.color} border-current bg-current/10`
                          : 'text-text-muted border-border-subtle hover:border-border-muted'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    key="err"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-red-400"
                  >
                    {error}
                  </motion.p>
                )}
                {result && (
                  <motion.div
                    key="ok"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 size={13} className="text-emerald-400" strokeWidth={2} />
                    <p className="text-xs text-emerald-400">
                      Delivered to <span className="font-semibold">{result.delivered}</span> client
                      {result.delivered !== 1 ? 's' : ''} in{' '}
                      <span className="font-semibold">{result.city}</span>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={sending || !city.trim() || !message.trim()}
                className="w-full h-10 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-indigo-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Send size={13} strokeWidth={2} /> Send to {city}
                  </>
                )}
              </button>

              <p className="text-[10px] text-text-muted leading-relaxed">
                Or via curl:{' '}
                <code className="font-mono text-text-secondary">
                  POST /api/messages {'{'}"city","message","severity"{'}'}
                </code>
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HomePage() {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useWeather(selectedCity);
  const { subscribeToCity, currentCity } = useWebSocket();

  function handleCitySelect(city: string) {
    setSelectedCity(city);
    subscribeToCity(city);
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight mb-2">
            Weather
          </h1>
          <p className="text-text-muted text-sm">
            Select a city to see current conditions and receive live alerts.
          </p>
        </div>

        <div className="mb-8">
          <CitySearch onCitySelect={handleCitySelect} currentCity={currentCity} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          <div>
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 bg-red-500/8 border border-red-500/20 rounded-2xl px-5 py-4"
                >
                  <CloudOff size={18} className="text-red-400 shrink-0" strokeWidth={1.75} />
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}

              {(data || isLoading) && !error && (
                <motion.div
                  key="card"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-text-muted font-medium">{selectedCity}</p>
                    <button
                      type="button"
                      onClick={refetch}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
                    >
                      <RefreshCw
                        size={12}
                        strokeWidth={2}
                        className={isLoading ? 'animate-spin' : ''}
                      />
                      Refresh
                    </button>
                  </div>
                  <WeatherCard data={data!} isLoading={isLoading} />
                </motion.div>
              )}

              {!selectedCity && !isLoading && !error && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-24 gap-4"
                >
                  <div className="w-16 h-16 rounded-3xl bg-bg-surface border border-border-subtle flex items-center justify-center">
                    <MapPin size={28} className="text-text-muted" strokeWidth={1.25} />
                  </div>
                  <div className="text-center">
                    <p className="text-text-secondary font-medium">No city selected</p>
                    <p className="text-text-muted text-sm mt-1">Search above to get started</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <AdminPanel currentCity={currentCity} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
