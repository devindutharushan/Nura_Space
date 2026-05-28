import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToastContext } from './ToastContext';
import type { WebSocketContextValue, CityMessage, ActiveCityEntry } from '../types';

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// In dev, Vite proxies /api but Socket.IO connects directly to the server.
// In a Docker/prod build, the same origin serves the SPA and proxies /socket.io/.
const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { addToast } = useToastContext();

  // `currentCityRef` mirrors `currentCity` state but is read inside socket
  // callbacks set up in the connect effect. Using a ref avoids re-running the
  // entire effect (and tearing down the socket) every time the user switches
  // cities, while still letting the `connect` handler rejoin the latest room
  // after a reconnect.
  const socketRef = useRef<Socket | null>(null);
  const currentCityRef = useRef<string | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [currentCity, setCurrentCity] = useState<string | null>(null);
  const [currentCityCount, setCurrentCityCount] = useState(0);
  const [activeCities, setActiveCities] = useState<ActiveCityEntry[]>([]);
  const [lastBroadcast, setLastBroadcast] = useState<CityMessage | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
    });
    socketRef.current = socket;

    // On every (re)connect, rejoin the city the user was watching. The
    // server-side room membership is tied to the socket id, which changes
    // across reconnects, so without this the user would silently stop
    // receiving alerts after any transient disconnect.
    socket.on('connect', () => {
      setIsConnected(true);
      if (currentCityRef.current) {
        socket.emit('city:join', currentCityRef.current);
      }
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    socket.on('city:message', (msg: CityMessage) => {
      const ts = msg.timestamp ? new Date(msg.timestamp) : undefined;
      addToast(msg.city, msg.message, msg.severity, ts && !isNaN(ts.getTime()) ? ts : undefined);
    });

    socket.on('presence:update', ({ cities }: { cities: ActiveCityEntry[] }) => {
      setActiveCities(cities);
    });

    socket.on('city:presence', ({ city, count }: { city: string; count: number }) => {
      if (currentCityRef.current?.toLowerCase() === city.toLowerCase()) {
        setCurrentCityCount(count);
      }
    });

    socket.on('message:broadcast', (msg: CityMessage) => {
      setLastBroadcast(msg);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, addToast]);

  const subscribeToCity = useCallback((city: string) => {
    currentCityRef.current = city;
    setCurrentCity(city);
    setCurrentCityCount(0);
    socketRef.current?.emit('city:join', city);
  }, []);

  const unsubscribeFromCity = useCallback((city: string) => {
    currentCityRef.current = null;
    setCurrentCity(null);
    setCurrentCityCount(0);
    socketRef.current?.emit('city:leave', city);
  }, []);

  const subscribePresence = useCallback(() => {
    socketRef.current?.emit('presence:subscribe');
  }, []);

  const unsubscribePresence = useCallback(() => {
    socketRef.current?.emit('presence:unsubscribe');
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        subscribeToCity,
        unsubscribeFromCity,
        currentCity,
        currentCityCount,
        activeCities,
        subscribePresence,
        unsubscribePresence,
        lastBroadcast,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocketContext must be used inside WebSocketProvider');
  return ctx;
}
