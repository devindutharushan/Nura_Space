import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, Loader2, Navigation, Clock } from 'lucide-react';
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

  function handleSelect(city: string) {
    onCitySelect(city);
    saveRecent(city);
    setRecent(loadRecent());
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.blur();
  }

  function handleQueryChange(val: string) {
    setQuery(val);
    setIsOpen(true);
    setHighlighted(0);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchLocations(val.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }

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
    };
  }, []);

  const geoLabel =
    geoState === 'locating'
      ? 'Getting location…'
      : geoState === 'denied'
        ? 'Location permission denied'
        : geoState === 'error'
          ? 'Could not detect location'
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
          className={`flex items-center gap-3 bg-bg-elevated border rounded-xl px-4 sm:px-5 h-12 sm:h-14 transition-colors duration-150 ${
            isOpen
              ? 'border-border-strong'
              : 'border-border-subtle hover:border-border-muted'
          }`}
        >
          <MapPin size={16} className="text-text-muted shrink-0" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={currentCity ? `Current: ${currentCity}` : 'Search for a city…'}
            className="flex-1 bg-transparent outline-none text-text-primary text-sm placeholder:text-text-muted min-w-0"
          />
          {isSearching && (
            <Loader2
              size={15}
              className="text-text-muted shrink-0 animate-spin"
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
              className="text-text-muted hover:text-text-secondary transition-colors shrink-0 p-0.5"
            >
              <X size={15} />
            </button>
          )}
          {!isSearching && !query && (
            <Search size={15} className="text-text-muted shrink-0" strokeWidth={1.5} />
          )}
        </div>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-bg-surface border border-border-muted rounded-xl shadow-card-lg overflow-hidden"
            >
              <div className="py-1.5 max-h-64 overflow-y-auto">
                {!showingSearchResults && recent.length > 0 && (
                  <p className="px-4 sm:px-5 pt-2 pb-1 text-[10px] font-semibold text-text-muted uppercase tracking-widest">
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
                        i === highlighted ? 'bg-bg-elevated' : ''
                      }`}
                    >
                      {item.type === 'recent' ? (
                        <Clock size={12} className="text-text-muted shrink-0" strokeWidth={2} />
                      ) : (
                        <MapPin
                          size={12}
                          className="text-text-muted shrink-0"
                          strokeWidth={2}
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span
                          className={`text-sm block truncate ${isActive ? 'text-text-primary font-medium' : 'text-text-primary'}`}
                        >
                          {name}
                        </span>
                        {sub && sub !== name && (
                          <span className="text-[11px] text-text-muted block truncate">{sub}</span>
                        )}
                      </span>
                      {isActive && (
                        <span className="ml-auto text-[10px] text-text-muted font-medium shrink-0">
                          active
                        </span>
                      )}
                    </button>
                  );
                })}

                {showingSearchResults && !isSearching && results.length === 0 && (
                  <p className="px-4 sm:px-5 py-4 text-sm text-text-muted text-center">
                    No cities found for &ldquo;{query}&rdquo;
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={geoState === 'locating'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all duration-150 disabled:cursor-not-allowed ${
            geoState === 'denied' || geoState === 'error'
              ? 'text-red-400 border-red-500/25 bg-red-500/5'
              : 'text-text-muted border-border-subtle bg-bg-elevated hover:border-border-muted hover:text-text-secondary'
          }`}
        >
          {geoState === 'locating' ? (
            <Loader2 size={10} strokeWidth={2} className="animate-spin" />
          ) : (
            <Navigation size={10} strokeWidth={2} />
          )}
          {geoLabel}
        </button>
      </div>
    </div>
  );
}
