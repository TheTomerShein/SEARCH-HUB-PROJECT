import { useCallback, useState } from 'react';

export type ToastSeverity = 'success' | 'error' | 'info' | 'warning';

/** Shared snackbar state for list / top bar actions. */
export function useToast() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<ToastSeverity>('success');

  const showToast = useCallback((msg: string, sev: ToastSeverity = 'success') => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  }, []);

  const hideToast = useCallback(() => setOpen(false), []);

  return { open, message, severity, showToast, hideToast, setOpen };
}
