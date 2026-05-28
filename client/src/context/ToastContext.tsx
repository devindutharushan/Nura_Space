import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import type { Toast, ToastContextValue, MessageSeverity } from '../types';

const ToastContext = createContext<ToastContextValue | null>(null);

// On-screen toasts are capped; older ones drop off the bottom of the stack
// when the cap is hit. The full sequence still lives in `history` so users
// can review what they missed without us blocking the viewport with a wall
// of overlapping notifications during a burst of broadcasts.
const TOAST_DURATION = 6000;
const MAX_TOASTS = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [history, setHistory] = useState<Toast[]>([]);
  const [historyOpen, setHistoryOpenState] = useState(false);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (city: string, message: string, severity: MessageSeverity = 'info', timestamp?: Date) => {
      const id = crypto.randomUUID();
      // Prefer the server-supplied timestamp so reconnect-replay of recent
      // history shows the original time the alert was sent, not the time the
      // socket re-delivered it. Falls back to `now` for client-originated
      // toasts that don't have a server timestamp.
      const toast: Toast = {
        id,
        city,
        message,
        severity,
        timestamp: timestamp ?? new Date(),
        duration: TOAST_DURATION,
      };

      setToasts((prev) => {
        const next = [...prev, toast];
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
      });

      setHistory((prev) => [toast, ...prev]);

      const timer = setTimeout(() => dismissToast(id), TOAST_DURATION);
      timers.current.set(id, timer);
    },
    [dismissToast],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    setLastSeenCount(0);
  }, []);

  const setHistoryOpen = useCallback(
    (open: boolean) => {
      setHistoryOpenState(open);
      if (open) setLastSeenCount(history.length);
    },
    [history.length],
  );

  const unreadCount = history.length - lastSeenCount;

  return (
    <ToastContext.Provider
      value={{
        toasts,
        history,
        historyOpen,
        unreadCount,
        addToast,
        dismissToast,
        clearHistory,
        setHistoryOpen,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used inside ToastProvider');
  return ctx;
}
