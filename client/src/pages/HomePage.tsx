import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '../components/layout/AppShell';
import { useAuth } from '../context/AuthContext';
import { CitySearch } from '../components/weather/CitySearch';
import { WeatherCard } from '../components/weather/WeatherCard';
import { BroadcastDrawer } from '../components/messages/BroadcastDrawer';
import { useWeather } from '../hooks/useWeather';
import { useWebSocket } from '../hooks/useWebSocket';
import { CloudOff, MapPin, RefreshCw, Send } from 'lucide-react';

export function HomePage() {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const { data, isLoading, error, fromCache, refetch } = useWeather(selectedCity);
  const { subscribeToCity, currentCity, currentCityCount, isConnected } = useWebSocket();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const greetingName = user?.displayName?.split(' ')[0] ?? 'there';

  function handleCitySelect(city: string) {
    setSelectedCity(city);
    subscribeToCity(city);
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-accent-primary uppercase tracking-widest mb-1">
              Southbank Calm
            </p>
            <h1 className="text-2xl sm:text-[28px] font-semibold text-text-primary tracking-tight mb-1">
              Good to see you, {greetingName}.
            </h1>
            <p className="text-text-secondary text-sm sm:text-[15px]">
              {currentCity
                ? `Watching ${currentCity}. We'll let you know if anything changes.`
                : 'Pick a city to see today’s weather and stay in the loop on live alerts.'}
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setBroadcastOpen(true)}
              aria-expanded={broadcastOpen}
              aria-haspopup="dialog"
              className="shrink-0 flex items-center gap-2.5 px-4 sm:px-5 h-11 rounded-xl bg-accent-primary text-white shadow-card hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
              title="Send an alert to everyone watching this city"
            >
              <Send size={15} strokeWidth={2.25} />
              <span>Send alert</span>
              <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/20 hidden sm:inline">
                ADMIN
              </span>
            </button>
          )}
        </div>

        <div className="mb-8">
          <CitySearch onCitySelect={handleCitySelect} currentCity={currentCity} />
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 bg-severity-critical/5 border border-severity-critical/25 rounded-2xl px-5 py-4"
            >
              <CloudOff
                size={18}
                className="text-severity-critical shrink-0 mt-0.5"
                strokeWidth={1.75}
              />
              <div className="min-w-0">
                <p className="text-severity-critical text-sm font-medium">
                  We couldn’t load the weather right now.
                </p>
                <p className="text-text-secondary text-xs mt-0.5">{error}</p>
              </div>
            </motion.div>
          )}

          {(data || isLoading) && !error && (
            <motion.div
              key="card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-xs text-text-secondary font-medium truncate">
                    {selectedCity && `Watching ${selectedCity}`}
                  </p>
                  {isAdmin && isConnected && currentCityCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-accent-primary bg-accent-soft border border-accent-primary/20 rounded-full px-2 py-0.5"
                      title={`${currentCityCount} ${currentCityCount === 1 ? 'person is' : 'people are'} watching this city`}
                    >
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-accent-primary opacity-60 animate-ping" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-primary" />
                      </span>
                      {currentCityCount} watching
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={refetch}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40 shrink-0"
                >
                  <RefreshCw
                    size={12}
                    strokeWidth={2}
                    className={isLoading ? 'animate-spin' : ''}
                  />
                  Refresh
                </button>
              </div>
              <WeatherCard data={data!} isLoading={isLoading} fromCache={fromCache} />
            </motion.div>
          )}

          {!selectedCity && !isLoading && !error && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 sm:py-24 gap-4 bg-bg-surface border border-border-subtle rounded-2xl shadow-card"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent-soft border border-accent-primary/15 flex items-center justify-center">
                <MapPin size={24} className="text-accent-primary" strokeWidth={1.5} />
              </div>
              <div className="text-center px-6">
                <p className="text-text-primary font-medium">Pick a city to get started</p>
                <p className="text-text-secondary text-sm mt-1 max-w-sm">
                  Search above or use your location. We’ll show today’s weather and surface any
                  active alerts.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isAdmin && (
        <BroadcastDrawer
          open={broadcastOpen}
          onClose={() => setBroadcastOpen(false)}
          currentCity={currentCity}
        />
      )}
    </AppShell>
  );
}
