import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ToastNotification } from './ToastNotification';
import { useToasts } from '../../hooks/useToasts';

const MOBILE_QUERY = '(max-width: 639px)';

export function ToastContainer() {
  const { toasts, dismissToast } = useToasts();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const visible = isMobile ? toasts.slice(-1) : toasts;

  return (
    <div className="fixed top-[72px] left-3 right-3 sm:top-auto sm:bottom-6 sm:left-auto sm:right-6 sm:w-80 z-50 flex flex-col sm:flex-col-reverse gap-2.5 sm:gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visible.map((toast) => (
          <div key={toast.id} className="pointer-events-auto w-full">
            <ToastNotification toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
