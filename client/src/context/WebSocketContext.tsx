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
import type { WebSocketContextValue, CityMessage } from '../types';

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

const SOCKET_URL = 'http://localhost:3001';

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { addToast } = useToastContext();

  const socketRef = useRef<Socket | null>(null);
  const currentCityRef = useRef<string | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [currentCity, setCurrentCity] = useState<string | null>(null);

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

    socket.on('connect', () => {
      setIsConnected(true);
      if (currentCityRef.current) {
        socket.emit('join-city', currentCityRef.current);
      }
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    socket.on('city-message', (msg: CityMessage) => {
      addToast(msg.city, msg.message, msg.severity);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, addToast]);

  const subscribeToCity = useCallback((city: string) => {
    currentCityRef.current = city;
    setCurrentCity(city);
    socketRef.current?.emit('join-city', city);
  }, []);

  const unsubscribeFromCity = useCallback((city: string) => {
    currentCityRef.current = null;
    setCurrentCity(null);
    socketRef.current?.emit('leave-city', city);
  }, []);

  return (
    <WebSocketContext.Provider
      value={{ isConnected, subscribeToCity, unsubscribeFromCity, currentCity }}
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
