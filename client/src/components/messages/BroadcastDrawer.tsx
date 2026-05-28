import {
  useState,
  useEffect,
  useRef,
  useId,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  X,
  Loader2,
  CheckCircle2,
  Users,
  History,
  AlertCircle,
  AlertTriangle,
  Info,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { pushMessage, getCityHistory, searchLocations } from '../../services/api';
import type { MessageSeverity, CityMessage, LocationResult } from '../../types';

const SEVERITY_ICON = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
} as const;

const SEVERITY_COLOR = {
  info: 'text-severity-info',
  warning: 'text-severity-warning',
  critical: 'text-severity-critical',
} as const;

const SEVERITY_OPTIONS: {
  value: MessageSeverity;
  label: string;
  text: string;
  bg: string;
  border: string;
}[] = [
  {
    value: 'info',
    label: 'Info',
    text: 'text-severity-info',
    bg: 'bg-severity-info/10',
    border: 'border-severity-info',
  },
  {
    value: 'warning',
    label: 'Warning',
    text: 'text-severity-warning',
    bg: 'bg-severity-warning/10',
    border: 'border-severity-warning',
  },
  {
    value: 'critical',
    label: 'Critical',
    text: 'text-severity-critical',
    bg: 'bg-severity-critical/10',
    border: 'border-severity-critical',
  },
];

const MESSAGE_TEMPLATES = [
  { label: 'Severe weather', text: 'Severe weather warning in effect. Please seek shelter.' },
  { label: 'Road closure', text: 'A major road closure has been reported. Expect delays.' },
  { label: 'Emergency', text: 'Emergency services are active in the area. Please avoid the zone.' },
  {
    label: 'Service disruption',
    text: 'Public transport services are disrupted. Check for updates before travelling.',
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

interface BroadcastDrawerProps {
  open: boolean;
  onClose: () => void;
  currentCity: string | null;
}

export function BroadcastDrawer({ open, onClose, currentCity }: BroadcastDrawerProps) {
  const titleId = useId();
  const { activeCities, subscribePresence, unsubscribePresence, lastBroadcast } = useWebSocket();

  const [city, setCity] = useState(currentCity ?? '');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<MessageSeverity>('info');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ delivered: number; city: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cityHistory, setCityHistory] = useState<CityMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);

  const messageRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [typeResults, setTypeResults] = useState<LocationResult[]>([]);
  const [typeSearching, setTypeSearching] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [typeHighlight, setTypeHighlight] = useState(0);
  const typeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeAbortRef = useRef<AbortController | null>(null);
  const typeContainerRef = useRef<HTMLDivElement>(null);

  const cityKey = city.trim().toLowerCase();

  useEffect(() => {
    if (open) {
      triggerRef.current = (document.activeElement as HTMLElement) ?? null;
      const t = setTimeout(() => messageRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
    if (triggerRef.current) {
      triggerRef.current.focus?.();
      triggerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handler);
    };
  }, [open, onClose]);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current && currentCity) {
      setCity((prev) => prev || currentCity);
    }
    wasOpenRef.current = open;
  }, [open, currentCity]);

  useEffect(() => {
    if (!open) return;
    subscribePresence();
    return () => unsubscribePresence();
  }, [open, subscribePresence, unsubscribePresence]);

  // The admin-meta WS channel echoes every broadcast — including the one this
  // tab just sent — so other open admin sessions stay in sync. Dedup against
  // the timestamp+message tuple to avoid a duplicate entry when our own POST
  // response and the echoed event both arrive.
  useEffect(() => {
    if (!lastBroadcast) return;
    if (lastBroadcast.city.toLowerCase() !== cityKey) return;
    setCityHistory((prev) => {
      const exists = prev.some(
        (m) => m.timestamp === lastBroadcast.timestamp && m.message === lastBroadcast.message,
      );
      if (exists) return prev;
      return [lastBroadcast, ...prev].slice(0, 10);
    });
  }, [lastBroadcast, cityKey]);

  useEffect(() => {
    const key = city.trim();
    if (!key || !open) {
      setCityHistory([]);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    getCityHistory(key)
      .then((res) => {
        if (!cancelled) setCityHistory([...res.messages].reverse());
      })
      .catch(() => {
        if (!cancelled) setCityHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city, open]);

  useEffect(() => {
    if (!result) return;
    resultTimer.current = setTimeout(() => setResult(null), 4000);
    return () => {
      if (resultTimer.current) clearTimeout(resultTimer.current);
    };
  }, [result]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (typeContainerRef.current && !typeContainerRef.current.contains(e.target as Node)) {
        setTypeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (typeDebounceRef.current) clearTimeout(typeDebounceRef.current);
      typeAbortRef.current?.abort();
    };
  }, []);

  function handleCityType(val: string) {
    setCity(val);
    setTypeDropdownOpen(true);
    setTypeHighlight(0);
    if (typeDebounceRef.current) clearTimeout(typeDebounceRef.current);
    typeAbortRef.current?.abort();
    if (!val.trim()) {
      setTypeResults([]);
      setTypeSearching(false);
      return;
    }
    setTypeSearching(true);
    typeDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      typeAbortRef.current = controller;
      try {
        const data = await searchLocations(val.trim(), controller.signal);
        if (!controller.signal.aborted) {
          setTypeResults(data);
          setTypeSearching(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setTypeResults([]);
          setTypeSearching(false);
        }
      }
    }, 300);
  }

  function selectTypeResult(name: string) {
    setCity(name);
    setTypeResults([]);
    setTypeDropdownOpen(false);
    setTypeHighlight(0);
  }

  function handleCityKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (!typeDropdownOpen || typeResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setTypeHighlight((h) => Math.min(h + 1, typeResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setTypeHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = typeResults[typeHighlight];
      if (item) selectTypeResult(item.name);
    } else if (e.key === 'Escape') {
      setTypeDropdownOpen(false);
    }
  }

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    if (!city.trim() || !message.trim()) return;
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const res = await pushMessage({ city: city.trim(), message: message.trim(), severity });
      setResult(res);
      const sent: CityMessage = {
        city: city.trim(),
        message: message.trim(),
        severity,
        timestamp: res.timestamp,
      };
      // Dedup against the entire visible history: the WS echo may have already
      // prepended this same broadcast before the HTTP response resolved.
      setCityHistory((prev) => {
        const exists = prev.some(
          (m) => m.timestamp === sent.timestamp && m.message === sent.message,
        );
        if (exists) return prev;
        return [sent, ...prev].slice(0, 10);
      });
      setMessage('');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'We couldn’t send that alert. Try again.',
      );
    } finally {
      setSending(false);
    }
  }

  function handleMessageKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-text-primary/25"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.8 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[440px] bg-bg-surface border-l border-border-subtle flex flex-col shadow-card-lg"
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-accent-soft border border-accent-primary/15 flex items-center justify-center shrink-0">
                  <Send size={14} strokeWidth={2} className="text-accent-primary" />
                </div>
                <div className="min-w-0">
                  <h2 id={titleId} className="text-sm font-semibold text-text-primary truncate">
                    Send alert
                  </h2>
                  <p className="text-[11px] text-text-secondary">
                    Admin · reaches everyone watching the city
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close send alert panel"
                className="text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/30"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </header>

            <form
              id="broadcast-form"
              onSubmit={handleSend}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
            >
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    Active cities
                  </label>
                  <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        activeCities.length > 0 ? 'bg-severity-success' : 'bg-border-muted'
                      }`}
                    />
                    {activeCities.length === 0
                      ? 'No one online right now'
                      : `${activeCities.length} ${activeCities.length === 1 ? 'city' : 'cities'} live`}
                  </span>
                </div>

                {activeCities.length > 0 ? (
                  <div className="rounded-xl border border-border-subtle overflow-hidden bg-bg-surface">
                    {activeCities.map((entry) => {
                      const selected = cityKey === entry.city;
                      return (
                        <button
                          key={entry.city}
                          type="button"
                          onClick={() => {
                            setCity(titleCase(entry.city));
                            setTypeDropdownOpen(false);
                            setTypeResults([]);
                          }}
                          aria-pressed={selected}
                          className={`w-full grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-3 py-3 text-left transition-colors border-b border-border-subtle last:border-0 focus-visible:outline-none focus-visible:bg-bg-soft ${
                            selected ? 'bg-accent-soft' : 'hover:bg-bg-soft'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              selected ? 'bg-accent-primary' : 'bg-severity-success'
                            }`}
                          />
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-medium truncate ${
                                selected ? 'text-accent-primary' : 'text-text-primary'
                              }`}
                            >
                              {titleCase(entry.city)}
                            </p>
                            {entry.lastBroadcast ? (
                              <p className="text-[11px] text-text-secondary truncate">
                                Last alert {formatRelative(entry.lastBroadcast)}
                              </p>
                            ) : (
                              <p className="text-[11px] text-text-muted truncate">No alerts yet</p>
                            )}
                          </div>
                          <span className="flex items-center gap-1 text-[11px] tabular-nums text-text-secondary shrink-0 bg-bg-soft border border-border-subtle rounded-full px-2 py-0.5">
                            <Users size={10} strokeWidth={2} />
                            {entry.count}
                          </span>
                          <span
                            className={`text-[10px] font-semibold shrink-0 ${
                              selected ? 'text-accent-primary' : 'text-text-muted'
                            }`}
                          >
                            {selected ? 'SELECTED' : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-bg-soft border border-border-subtle border-dashed">
                    <Users size={13} className="text-text-secondary shrink-0" strokeWidth={1.75} />
                    <p className="text-xs text-text-secondary">
                      No one’s connected yet. You can still type a city below.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <div className="h-px flex-1 bg-border-subtle" />
                  <span className="text-[10px] text-text-secondary uppercase tracking-wide font-medium">
                    or type
                  </span>
                  <div className="h-px flex-1 bg-border-subtle" />
                </div>

                <div ref={typeContainerRef} className="relative">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => handleCityType(e.target.value)}
                    onFocus={() => {
                      if (city.trim() && typeResults.length > 0) setTypeDropdownOpen(true);
                    }}
                    onKeyDown={handleCityKeyDown}
                    placeholder="e.g. Melbourne, Sydney…"
                    aria-label="City name"
                    aria-autocomplete="list"
                    aria-expanded={typeDropdownOpen && typeResults.length > 0}
                    autoComplete="off"
                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-3 py-2.5 pr-9 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-primary/40 focus-visible:ring-2 focus-visible:ring-accent-primary/20 transition-all"
                  />
                  {typeSearching && (
                    <Loader2
                      size={13}
                      strokeWidth={2}
                      className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-text-secondary pointer-events-none"
                    />
                  )}
                  <AnimatePresence>
                    {typeDropdownOpen &&
                      city.trim() &&
                      (typeSearching || typeResults.length > 0) && (
                        <motion.div
                          key="type-dropdown"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.12 }}
                          className="absolute top-[calc(100%+4px)] left-0 right-0 z-10 bg-bg-surface border border-border-subtle rounded-xl shadow-card-lg overflow-hidden"
                        >
                          <ul
                            role="listbox"
                            className="max-h-56 overflow-y-auto py-1 divide-y divide-border-subtle"
                          >
                            {typeResults.map((r, i) => (
                              <li key={`${r.name}-${r.latitude}-${r.longitude}-${i}`}>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={i === typeHighlight}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    selectTypeResult(r.name);
                                  }}
                                  onMouseEnter={() => setTypeHighlight(i)}
                                  className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                                    i === typeHighlight ? 'bg-bg-soft' : ''
                                  }`}
                                >
                                  <MapPin
                                    size={11}
                                    strokeWidth={2}
                                    className="text-text-secondary shrink-0"
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-xs text-text-primary truncate">
                                      {r.name}
                                    </span>
                                    {r.displayName && r.displayName !== r.name && (
                                      <span className="block text-[10px] text-text-secondary truncate">
                                        {r.displayName}
                                      </span>
                                    )}
                                  </span>
                                </button>
                              </li>
                            ))}
                            {typeSearching && typeResults.length === 0 && (
                              <li className="px-3 py-2 text-[11px] text-text-secondary">
                                Searching…
                              </li>
                            )}
                          </ul>
                        </motion.div>
                      )}
                  </AnimatePresence>
                </div>

                {currentCity && currentCity.toLowerCase() !== city.toLowerCase() && (
                  <button
                    type="button"
                    onClick={() => {
                      setCity(currentCity);
                      setTypeDropdownOpen(false);
                      setTypeResults([]);
                    }}
                    className="flex items-center gap-1 text-[11px] text-accent-primary hover:underline transition-colors"
                  >
                    <MapPin size={11} strokeWidth={2} />
                    Use my city: {currentCity}
                  </button>
                )}
              </section>

              {city.trim() && (
                <section>
                  <button
                    type="button"
                    onClick={() => setHistoryExpanded((v) => !v)}
                    aria-expanded={historyExpanded}
                    className="w-full flex items-center justify-between py-1 focus-visible:outline-none"
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                      <History size={11} strokeWidth={2} />
                      Recent alerts
                      {cityHistory.length > 0 && (
                        <span className="text-[10px] text-text-muted normal-case tracking-normal font-medium">
                          ({cityHistory.length})
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      size={13}
                      strokeWidth={2}
                      className={`text-text-secondary transition-transform duration-200 ${historyExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {historyExpanded && (
                      <motion.div
                        key="hist"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-1.5">
                          {historyLoading ? (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-soft border border-border-subtle">
                              <Loader2 size={12} className="animate-spin text-text-secondary" />
                              <span className="text-xs text-text-secondary">
                                Loading recent alerts…
                              </span>
                            </div>
                          ) : cityHistory.length === 0 ? (
                            <p className="text-[12px] text-text-secondary px-1 py-2">
                              No alerts for this city yet.
                            </p>
                          ) : (
                            <ul className="rounded-xl border border-border-subtle overflow-hidden max-h-40 overflow-y-auto divide-y divide-border-subtle">
                              {cityHistory.map((msg, i) => {
                                const SevIcon = SEVERITY_ICON[msg.severity ?? 'info'];
                                return (
                                  <li
                                    key={`${msg.timestamp}-${i}`}
                                    className="flex gap-2.5 px-3 py-2.5 hover:bg-bg-soft transition-colors"
                                  >
                                    <SevIcon
                                      size={12}
                                      className={`${SEVERITY_COLOR[msg.severity ?? 'info']} shrink-0 mt-0.5`}
                                      strokeWidth={2}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-text-primary leading-snug truncate">
                                        {msg.message}
                                      </p>
                                      <span className="text-[10px] text-text-secondary">
                                        {formatRelative(msg.timestamp)}
                                      </span>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              )}

              <section className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                  Quick templates
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MESSAGE_TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => setMessage(t.text)}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg border border-border-subtle bg-bg-surface text-text-secondary hover:text-accent-primary hover:border-accent-primary/30 hover:bg-accent-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/25"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="broadcast-msg"
                    className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary"
                  >
                    Message
                  </label>
                  <span
                    className={`text-[10px] tabular-nums ${
                      message.length > MAX_MESSAGE * 0.9
                        ? 'text-severity-warning'
                        : 'text-text-secondary'
                    }`}
                  >
                    {message.length} / {MAX_MESSAGE}
                  </span>
                </div>
                <textarea
                  id="broadcast-msg"
                  ref={messageRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleMessageKeyDown}
                  placeholder="Write a clear, calm message…"
                  maxLength={MAX_MESSAGE}
                  rows={4}
                  className="w-full bg-bg-surface border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-primary/40 focus-visible:ring-2 focus-visible:ring-accent-primary/20 transition-all resize-none leading-relaxed"
                />
                <p className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                  <kbd className="px-1.5 py-0.5 rounded border border-border-subtle bg-bg-soft font-mono text-[9px] text-text-primary">
                    {isMac ? '⌘' : 'Ctrl'} + Enter
                  </kbd>
                  to send
                </p>
              </section>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    key="err"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    role="alert"
                    className="flex items-center gap-2 text-xs text-severity-critical px-3 py-2.5 bg-severity-critical/8 border border-severity-critical/25 rounded-xl"
                  >
                    <AlertCircle size={13} strokeWidth={2} className="shrink-0" />
                    {error}
                  </motion.p>
                )}
                {result && (
                  <motion.div
                    key="ok"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    role="status"
                    className="flex items-center gap-2 text-xs text-severity-success px-3 py-2.5 bg-severity-success/8 border border-severity-success/25 rounded-xl"
                  >
                    <CheckCircle2 size={13} strokeWidth={2} className="shrink-0" />
                    <span>
                      Alert sent to <span className="font-semibold">{result.delivered}</span> active{' '}
                      {result.delivered === 1 ? 'user' : 'users'} in{' '}
                      <span className="font-semibold">{result.city}</span>
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            <footer className="border-t border-border-subtle p-4 space-y-3 shrink-0 bg-bg-surface">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary mb-1.5 block">
                  Severity
                </label>
                <div className="flex gap-1.5" role="radiogroup" aria-label="Severity">
                  {SEVERITY_OPTIONS.map((s) => {
                    const selected = severity === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setSeverity(s.value)}
                        className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/25 ${
                          selected
                            ? `${s.text} ${s.bg} ${s.border}`
                            : 'text-text-secondary border-border-subtle bg-bg-surface hover:border-border-muted hover:bg-bg-soft'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="submit"
                form="broadcast-form"
                disabled={sending || !city.trim() || !message.trim()}
                className="w-full h-11 rounded-xl bg-accent-primary text-white text-sm font-semibold shadow-card hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent-primary transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
              >
                {sending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Sending alert…
                  </>
                ) : (
                  <>
                    <Send size={13} strokeWidth={2.25} />
                    {city.trim() ? `Send alert to ${city.trim()}` : 'Send alert'}
                  </>
                )}
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
