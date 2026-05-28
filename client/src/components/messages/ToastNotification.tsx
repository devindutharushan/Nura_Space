import { motion } from 'framer-motion';
import { X, MapPin, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import type { Toast, MessageSeverity } from '../../types';

interface ToastNotificationProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const severityConfig: Record<
  MessageSeverity,
  {
    bar: string;
    icon: typeof Info;
    iconClass: string;
    badge: string;
    label: string;
  }
> = {
  info: {
    bar: 'from-severity-info to-blue-500',
    icon: Info,
    iconClass: 'text-severity-info',
    badge: 'text-severity-info bg-severity-info/10 border-severity-info/25',
    label: 'Info',
  },
  warning: {
    bar: 'from-severity-warning to-amber-500',
    icon: AlertTriangle,
    iconClass: 'text-severity-warning',
    badge: 'text-severity-warning bg-severity-warning/10 border-severity-warning/30',
    label: 'Warning',
  },
  critical: {
    bar: 'from-severity-critical to-red-500',
    icon: AlertCircle,
    iconClass: 'text-severity-critical',
    badge: 'text-severity-critical bg-severity-critical/10 border-severity-critical/30',
    label: 'Critical',
  },
};

const toastVariants = {
  initial: { opacity: 0, y: 16, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 380, damping: 26, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.95,
    transition: { duration: 0.18, ease: 'easeIn' as const },
  },
};

function formatTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export function ToastNotification({ toast, onDismiss }: ToastNotificationProps) {
  const sev = severityConfig[toast.severity ?? 'info'];
  const SevIcon = sev.icon;

  return (
    <motion.div
      layout
      key={toast.id}
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="relative w-80 bg-bg-surface border border-border-subtle rounded-2xl shadow-toast overflow-hidden"
      role="status"
      aria-live="polite"
    >
      {/* Severity countdown strip */}
      <motion.div
        className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${sev.bar} origin-left`}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: toast.duration / 1000, ease: 'linear' }}
      />

      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`flex items-center gap-1 border rounded-full px-2 py-0.5 shrink-0 ${sev.badge}`}
            >
              <SevIcon size={10} className={sev.iconClass} strokeWidth={2.25} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{sev.label}</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-text-secondary shrink-0">
              <MapPin size={9} strokeWidth={2.5} />
              {toast.city}
            </span>
            <span className="text-[10px] text-text-muted shrink-0">
              · {formatTime(toast.timestamp)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="text-text-secondary hover:text-text-primary transition-colors shrink-0 p-0.5 rounded hover:bg-bg-soft"
            aria-label="Dismiss alert"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>

        <p className="text-text-primary text-sm leading-relaxed">{toast.message}</p>
      </div>
    </motion.div>
  );
}
