import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MapPin, Search, X, Loader2, Navigation, Clock, Eye } from 'lucide-react';
import { searchLocations, getNearbyCity } from '../../services/api';
import type { LocationResult } from '../../types';

const MAX_RECENT = 5;
const RECENT_KEY = 'nura_recent_cities';

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function saveRecent(city: string): void {
  const next = [city, ...loadRecent().filter((c) => c !== city)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

type GeoState = 'idle' | 'locating' | 'denied' | 'error';

interface CitySearchProps {
  onCitySelect: (city: string) => void;
  currentCity: string | null;
}

const dropdownVariants = {
  hidden: { opacity: 0, y: -6, scaleY: 0.95, transformOrigin: 'top' as const },
  visible: {
    opacity: 1,
    y: 0,
    scaleY: 1,
    transition: { duration: 0.15, ease: 'easeOut' as const },
  },
  exit: { opacity: 0, y: -4, scaleY: 0.95, transition: { duration: 0.1 } },
};

export function CitySearch({ onCitySelect, currentCity }: CitySearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [recent, setRecent] = useState<string[]>(loadRecent);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function handleSelect(city: string) {
    onCitySelect(city);
    saveRecent(city);
    setRecent(loadRecent());
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.blur();
  }

  // Debounce 300ms and abort any in-flight request on each new keystroke.
  // Together this keeps upstream geocoder load proportional to *finished*
  // queries, not every individual character typed, and guarantees that a
  // slow response for an earlier prefix can't race a faster one for the
  // current prefix and overwrite the dropdown with stale results.
  function handleQueryChange(val: string) {
    setQuery(val);
    setIsOpen(true);
    setHighlighted(0);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (!val.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const data = await searchLocations(val.trim(), controller.signal);
        if (!controller.signal.aborted) {
          setResults(data);
          setIsSearching(false);
        }
      } catch (err) {
        if (axios.isCancel(err)) return;
        setResults([]);
        setIsSearching(false);
      }
    }, 300);
  }

  // Geolocation is intentionally low-precision (enableHighAccuracy: false) and
  // the raw coordinates only ever leave the browser as a single reverse-
  // geocode lookup — the resolved city name is what we store and broadcast,
  // never the user's actual lat/lon.
  function handleUseLocation() {
    if (!navigator.geolocation) {
      setGeoState('error');
      setTimeout(() => setGeoState('idle'), 4000);
      return;
    }
    setGeoState('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const nearest = await getNearbyCity(pos.coords.latitude, pos.coords.longitude);
          setGeoState('idle');
          handleSelect(nearest.name);
        } catch {
          setGeoState('error');
          setTimeout(() => setGeoState('idle'), 4000);
        }
      },
      (err) => {
        setGeoState(err.code === 1 ? 'denied' : 'error');
        setTimeout(() => setGeoState('idle'), 4000);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  }

  const showingSearchResults = query.trim().length > 0;
  const dropdownItems: Array<
    { type: 'result'; item: LocationResult } | { type: 'recent'; name: string }
  > = showingSearchResults
    ? results.map((r) => ({ type: 'result' as const, item: r }))
    : recent.map((n) => ({ type: 'recent' as const, name: n }));

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || dropdownItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, dropdownItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      const item = dropdownItems[highlighted];
      if (item) handleSelect(item.type === 'result' ? item.item.name : item.name);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setIsOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const geoLabel =
    geoState === 'locating'
      ? 'Finding your location…'
      : geoState === 'denied'
        ? 'Location permission needed'
        : geoState === 'error'
          ? 'Couldn’t detect location'
          : 'Use my location';

  const showDropdown =
    isOpen &&
    (isSearching ||
      dropdownItems.length > 0 ||
      (showingSearchResults && !isSearching && results.length === 0));

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="relative w-full">
        <div
          className={`flex items-center gap-3 bg-bg-surface border rounded-2xl px-4 sm:px-5 h-12 sm:h-14 shadow-card transition-colors duration-150 ${
            isOpen
              ? 'border-accent-primary/40 ring-2 ring-accent-primary/15'
              : 'border-border-subtle hover:border-border-muted'
          }`}
        >
          <MapPin size={16} className="text-accent-primary shrink-0" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search for a city…"
            aria-label="Search for a city"
            className="flex-1 bg-transparent outline-none text-text-primary text-sm placeholder:text-text-secondary min-w-0"
          />
          {isSearching && (
            <Loader2
              size={15}
              className="text-text-secondary shrink-0 animate-spin"
              strokeWidth={1.5}
            />
          )}
          {!isSearching && query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className="text-text-secondary hover:text-text-primary transition-colors shrink-0 p-0.5"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
          {!isSearching && !query && (
            <Search size={15} className="text-text-secondary shrink-0" strokeWidth={1.5} />
          )}
        </div>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-bg-surface border border-border-subtle rounded-2xl shadow-card-lg overflow-hidden"
            >
              <div className="py-1.5 max-h-64 overflow-y-auto">
                {!showingSearchResults && recent.length > 0 && (
                  <p className="px-4 sm:px-5 pt-2 pb-1 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">
                    Recent
                  </p>
                )}

                {dropdownItems.map((item, i) => {
                  const name = item.type === 'result' ? item.item.name : item.name;
                  const sub = item.type === 'result' ? item.item.displayName : null;
                  const isActive = name === currentCity;
                  return (
                    <button
                      key={`${item.type}-${name}-${i}`}
                      type="button"
                      onMouseDown={() => handleSelect(name)}
                      onMouseEnter={() => setHighlighted(i)}
                      className={`w-full text-left px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-3 transition-colors duration-100 ${
                        i === highlighted ? 'bg-bg-soft' : ''
                      }`}
                    >
                      {item.type === 'recent' ? (
                        <Clock size={13} className="text-text-secondary shrink-0" strokeWidth={2} />
                      ) : (
                        <MapPin
                          size={13}
                          className="text-text-secondary shrink-0"
                          strokeWidth={2}
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span
                          className={`text-sm block truncate ${isActive ? 'text-accent-primary font-medium' : 'text-text-primary'}`}
                        >
                          {name}
                        </span>
                        {sub && sub !== name && (
                          <span className="text-[11px] text-text-secondary block truncate">
                            {sub}
                          </span>
                        )}
                      </span>
                      {isActive && (
                        <span className="ml-auto text-[10px] text-accent-primary font-semibold uppercase tracking-wide shrink-0">
                          watching
                        </span>
                      )}
                    </button>
                  );
                })}

                {showingSearchResults && !isSearching && results.length === 0 && (
                  <div className="px-4 sm:px-5 py-5 text-center">
                    <p className="text-sm text-text-primary">
                      No cities matched &ldquo;{query}&rdquo;
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      Try a different spelling or a nearby city.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={geoState === 'locating'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 disabled:cursor-not-allowed ${
            geoState === 'denied' || geoState === 'error'
              ? 'text-severity-critical border-severity-critical/30 bg-severity-critical/5'
              : 'text-text-secondary border-border-subtle bg-bg-surface hover:border-accent-primary/30 hover:text-accent-primary hover:bg-accent-soft'
          }`}
        >
          {geoState === 'locating' ? (
            <Loader2 size={11} strokeWidth={2} className="animate-spin" />
          ) : (
            <Navigation size={11} strokeWidth={2} />
          )}
          {geoLabel}
        </button>

        {currentCity && (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-accent-primary/20 bg-accent-soft text-accent-primary text-xs font-medium max-w-full"
            aria-label={`Currently watching ${currentCity}`}
          >
            <Eye size={11} strokeWidth={2} className="shrink-0" />
            <span className="truncate">
              <span className="text-text-secondary font-normal">Watching</span> {currentCity}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
