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
  }
> = {
  info: {
    bar: 'from-sky-400 to-sky-500',
    icon: Info,
    iconClass: 'text-sky-400',
    badge: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  },
  warning: {
    bar: 'from-amber-500 to-orange-400',
    icon: AlertTriangle,
    iconClass: 'text-amber-400',
    badge: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  },
  critical: {
    bar: 'from-red-500 to-rose-500',
    icon: AlertCircle,
    iconClass: 'text-red-400',
    badge: 'text-red-300 bg-red-500/10 border-red-500/25',
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
      className="relative w-80 bg-bg-elevated border border-border-muted rounded-2xl shadow-toast overflow-hidden"
    >
      {/* Severity countdown strip */}
      <motion.div
        className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${sev.bar} origin-left`}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: toast.duration / 1000, ease: 'linear' }}
      />

      <div className="px-4 pt-5 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`flex items-center gap-1 border rounded-full px-2 py-0.5 shrink-0 ${sev.badge}`}
            >
              <MapPin size={9} strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{toast.city}</span>
            </div>
            <SevIcon size={12} className={`${sev.iconClass} shrink-0`} strokeWidth={2} />
            <span className="text-[10px] text-text-muted shrink-0">
              {formatTime(toast.timestamp)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="text-text-muted hover:text-text-secondary transition-colors shrink-0"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>

        {/* Message */}
        <p className="text-text-primary text-sm leading-relaxed">{toast.message}</p>
      </div>
    </motion.div>
  );
}
