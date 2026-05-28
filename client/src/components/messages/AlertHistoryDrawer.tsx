import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, MapPin, AlertCircle, AlertTriangle, Info, Bell } from 'lucide-react';
import { useToasts } from '../../hooks/useToasts';
import type { Toast, MessageSeverity } from '../../types';

const severityConfig: Record<
  MessageSeverity,
  { bar: string; icon: typeof Info; iconClass: string }
> = {
  info: { bar: 'bg-severity-info', icon: Info, iconClass: 'text-severity-info' },
  warning: {
    bar: 'bg-severity-warning',
    icon: AlertTriangle,
    iconClass: 'text-severity-warning',
  },
  critical: {
    bar: 'bg-severity-critical',
    icon: AlertCircle,
    iconClass: 'text-severity-critical',
  },
};

function formatTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

function HistoryItem({ toast }: { toast: Toast }) {
  const sev = severityConfig[toast.severity ?? 'info'];
  const SevIcon = sev.icon;
  return (
    <div className="flex gap-3 px-4 py-3 border-b border-border-subtle last:border-0 hover:bg-bg-soft transition-colors">
      <div className={`w-1 rounded-full shrink-0 self-stretch ${sev.bar}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <SevIcon size={12} className={`${sev.iconClass} shrink-0`} strokeWidth={2} />
          <span className="flex items-center gap-1 text-[11px] text-text-secondary">
            <MapPin size={10} strokeWidth={2.5} />
            {toast.city}
          </span>
          <span className="text-[11px] text-text-muted ml-auto">{formatTime(toast.timestamp)}</span>
        </div>
        <p className="text-sm text-text-primary leading-snug">{toast.message}</p>
      </div>
    </div>
  );
}

export function AlertHistoryDrawer() {
  const { history, historyOpen, setHistoryOpen, clearHistory } = useToasts();

  return (
    <AnimatePresence>
      {historyOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-text-primary/20"
            onClick={() => setHistoryOpen(false)}
          />

          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.8 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[380px] bg-bg-surface border-l border-border-subtle flex flex-col shadow-card-lg"
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-subtle shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">Alert history</span>
                {history.length > 0 && (
                  <span className="text-[10px] font-semibold text-accent-primary bg-accent-soft border border-accent-primary/15 rounded-full px-2 py-0.5 tabular-nums">
                    {history.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary transition-colors px-2 py-1 rounded-md hover:bg-bg-soft"
                  >
                    <Trash2 size={11} strokeWidth={1.75} />
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className="text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded-md hover:bg-bg-soft"
                  aria-label="Close alert history"
                >
                  <X size={15} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-accent-soft border border-accent-primary/15 flex items-center justify-center">
                    <Bell size={18} className="text-accent-primary" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm text-text-primary font-medium">No alerts yet</p>
                  <p className="text-xs text-text-secondary max-w-[260px]">
                    Anything new for cities you’re watching will land here.
                  </p>
                </div>
              ) : (
                history.map((toast) => <HistoryItem key={toast.id} toast={toast} />)
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
