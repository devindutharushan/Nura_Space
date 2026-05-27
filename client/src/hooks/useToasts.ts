import { useToastContext } from '../context/ToastContext';

export function useToasts() {
  return useToastContext();
}
