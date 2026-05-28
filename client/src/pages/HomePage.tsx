import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '../components/layout/AppShell';
import { useAuth } from '../context/AuthContext';
import { CitySearch } from '../components/weather/CitySearch';
import { WeatherCard } from '../components/weather/WeatherCard';
import { useWeather } from '../hooks/useWeather';
import { useWebSocket } from '../hooks/useWebSocket';
import { pushMessage, getCityHistory } from '../services/api';
import type { MessageSeverity, CityMessage } from '../types';
import {
  CloudOff,
  MapPin,
  Send,
  Loader2,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  Users,
  History,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';

const SEVERITY_ICON = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
} as const;

const SEVERITY_COLOR = {
  info: 'text-sky-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
} as const;

const SEVERITY_OPTIONS: { value: MessageSeverity; label: string; color: string }[] = [
  { value: 'info', label: 'Info', color: 'text-sky-400' },
  { value: 'warning', label: 'Warning', color: 'text-amber-400' },
  { value: 'critical', label: 'Critical', color: 'text-red-400' },
];

const MESSAGE_TEMPLATES = [
  { label: 'Severe weather', text: 'Severe weather warning in effect. Seek shelter immediately.' },
  { label: 'Road closure', text: 'Major road closure reported. Expect significant delays.' },
  { label: 'Emergency', text: 'Emergency services active in the area. Avoid the affected zone.' },
  {
    label: 'Service disruption',
    text: 'Public transport services are disrupted. Check for updates.',
  },
];

const MAX_MESSAGE = 500;

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function AdminPanel({ currentCity }: { currentCity: string | null }) {
  const { activeCities, subscribePresence, unsubscribePresence, lastBroadcast } = useWebSocket();

  const [open, setOpen] = useState(false);
  const [city, setCity] = useState(currentCity ?? '');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<MessageSeverity>('info');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ delivered: number; city: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cityHistory, setCityHistory] = useState<CityMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cityKey = city.trim().toLowerCase();

  useEffect(() => {
    if (currentCity) setCity(currentCity);
  }, [currentCity]);

  // Subscribe to aggregate presence updates while panel is open
  useEffect(() => {
    if (!open) return;
    subscribePresence();
    return () => unsubscribePresence();
  }, [open, subscribePresence, unsubscribePresence]);

  // Sync history when another admin session broadcasts to the targeted city
  useEffect(() => {
    if (!lastBroadcast) return;
    if (lastBroadcast.city.toLowerCase() !== cityKey) return;
    setCityHistory((prev) => {
      // Avoid duplicates if this admin sent it (already prepended in handleSend)
      if (prev[0]?.timestamp === lastBroadcast.timestamp) return prev;
      return [lastBroadcast, ...prev].slice(0, 10);
    });
  }, [lastBroadcast, cityKey]);

  // Fetch broadcast history whenever the targeted city changes
  useEffect(() => {
    const key = city.trim();
    if (!key || !open) {
      setCityHistory([]);
      return;
    }
    setHistoryLoading(true);
    getCityHistory(key)
      .then((res) => setCityHistory([...res.messages].reverse()))
      .catch(() => setCityHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [city, open]);

  useEffect(() => {
    if (result) {
      resultTimer.current = setTimeout(() => setResult(null), 4000);
      return () => {
        if (resultTimer.current) clearTimeout(resultTimer.current);
      };
    }
  }, [result]);

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    if (!city.trim() || !message.trim()) return;
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const res = await pushMessage({ city: city.trim(), message: message.trim(), severity });
      setResult(res);
      // Prepend to local history — no round-trip needed, we already have all the data
      const sent: CityMessage = {
        city: city.trim(),
        message: message.trim(),
        severity,
        timestamp: res.timestamp, // use server timestamp so dedup against message:broadcast event works
      };
      setCityHistory((prev) => [sent, ...prev].slice(0, 10));
      setMessage('');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Failed to send',
      );
    } finally {
      setSending(false);
    }
  }

  function handleMessageKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
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
          <span className="text-sm font-semibold text-text-primary">Broadcast Alert</span>
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
              {/* Live city list */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-text-secondary">Target city</label>
                  <span className="flex items-center gap-1 text-[10px] text-text-muted">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${activeCities.length > 0 ? 'bg-emerald-400' : 'bg-border-subtle'}`}
                    />
                    {activeCities.length === 0
                      ? 'No cities online'
                      : `${activeCities.length} ${activeCities.length === 1 ? 'city' : 'cities'} online`}
                  </span>
                </div>

                {activeCities.length > 0 ? (
                  <div className="rounded-lg border border-border-subtle overflow-hidden">
                    {activeCities.map((entry) => {
                      const selected = cityKey === entry.city;
                      return (
                        <button
                          key={entry.city}
                          type="button"
                          onClick={() => setCity(titleCase(entry.city))}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-border-subtle last:border-0 ${
                            selected ? 'bg-accent-primary/10' : 'hover:bg-bg-elevated'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                              selected ? 'bg-accent-primary' : 'bg-emerald-400'
                            }`}
                          />
                          <span
                            className={`flex-1 text-sm truncate ${
                              selected ? 'text-accent-primary font-medium' : 'text-text-primary'
                            }`}
                          >
                            {titleCase(entry.city)}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] tabular-nums text-text-muted shrink-0">
                            <Users size={9} strokeWidth={2} />
                            {entry.count}
                          </span>
                          {entry.lastBroadcast && (
                            <span className="text-[10px] text-text-muted shrink-0">
                              {formatRelative(entry.lastBroadcast)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-3 rounded-lg bg-bg-elevated border border-border-subtle border-dashed">
                    <Users size={12} className="text-text-muted shrink-0" strokeWidth={1.75} />
                    <p className="text-xs text-text-muted">
                      No users connected yet. Type a city below to broadcast anyway.
                    </p>
                  </div>
                )}

                {/* Divider + manual input */}
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="h-px flex-1 bg-border-subtle" />
                  <span className="text-[10px] text-text-muted">or type</span>
                  <div className="h-px flex-1 bg-border-subtle" />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Melbourne, Fitzroy, Sydney…"
                    className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-strong transition-colors"
                  />
                </div>

                {/* Quick-fill subscribed city */}
                {currentCity && currentCity.toLowerCase() !== city.toLowerCase() && (
                  <button
                    type="button"
                    onClick={() => setCity(currentCity)}
                    className="self-start flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary transition-colors"
                  >
                    <MapPin size={9} strokeWidth={2} />
                    Use my city: {currentCity}
                  </button>
                )}
              </div>

              {/* Past broadcasts for selected city */}
              {city.trim() && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <History size={11} className="text-text-muted" strokeWidth={1.75} />
                    <label className="text-xs font-medium text-text-secondary">
                      Past broadcasts
                    </label>
                  </div>
                  {historyLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-bg-elevated border border-border-subtle">
                      <Loader2 size={11} className="animate-spin text-text-muted" />
                      <span className="text-xs text-text-muted">Loading…</span>
                    </div>
                  ) : cityHistory.length === 0 ? (
                    <p className="text-[10px] text-text-muted px-0.5">
                      No broadcasts sent to {titleCase(city.trim())} yet.
                    </p>
                  ) : (
                    <div className="rounded-lg border border-border-subtle overflow-hidden max-h-40 overflow-y-auto">
                      {cityHistory.map((msg, i) => {
                        const SevIcon = SEVERITY_ICON[msg.severity ?? 'info'];
                        return (
                          <div
                            key={i}
                            className="flex gap-2.5 px-3 py-2 border-b border-border-subtle last:border-0 hover:bg-bg-elevated transition-colors"
                          >
                            <SevIcon
                              size={11}
                              className={`${SEVERITY_COLOR[msg.severity ?? 'info']} shrink-0 mt-0.5`}
                              strokeWidth={2}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-text-primary leading-snug truncate">
                                {msg.message}
                              </p>
                              <span className="text-[10px] text-text-muted">
                                {formatRelative(msg.timestamp)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Message templates */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Templates</label>
                <div className="flex flex-wrap gap-1.5">
                  {MESSAGE_TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => setMessage(t.text)}
                      className="text-[10px] px-2 py-1 rounded border border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-muted transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message field with char counter */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-text-secondary">Message</label>
                  <span
                    className={`text-[10px] tabular-nums ${
                      message.length > MAX_MESSAGE * 0.9 ? 'text-amber-400' : 'text-text-muted'
                    }`}
                  >
                    {message.length} / {MAX_MESSAGE}
                  </span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleMessageKeyDown}
                  placeholder="Type an alert message…"
                  maxLength={MAX_MESSAGE}
                  rows={3}
                  className="bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-strong transition-colors resize-none leading-relaxed"
                />
                <p className="text-[10px] text-text-muted">⌘ Enter to send</p>
              </div>

              {/* Severity */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Severity</label>
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
                      Delivered to <span className="font-semibold">{result.delivered}</span>{' '}
                      {result.delivered === 1 ? 'client' : 'clients'} in{' '}
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
                    <Send size={13} strokeWidth={2} />
                    {city.trim() ? `Broadcast to ${city.trim()}` : 'Broadcast'}
                  </>
                )}
              </button>
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
  const { user } = useAuth();

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
                  <div className="w-16 h-16 rounded-2xl bg-bg-surface border border-border-subtle flex items-center justify-center">
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

          {user?.role === 'admin' && (
            <div>
              <AdminPanel currentCity={currentCity} />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
