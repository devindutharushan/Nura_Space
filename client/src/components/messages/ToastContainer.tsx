import { AnimatePresence } from 'framer-motion';
import { ToastNotification } from './ToastNotification';
import { useToasts } from '../../hooks/useToasts';

export function ToastContainer() {
  const { toasts, dismissToast } = useToasts();

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-80 z-50 flex flex-col-reverse gap-2.5 sm:gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastNotification toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
