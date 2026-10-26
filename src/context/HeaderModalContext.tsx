import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertType, ModalContextType } from '../types/share';
import { ToastItemData, ToastStack, toastDurationMs } from '../components/toast/ToastAlert';

const HeaderModalContext = createContext<ModalContextType | undefined>(undefined);

const MAX_TOASTS = 4;

export const HeaderModalProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItemData[]>([]);
  const idRef = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showAlert = useCallback((message: string, type: AlertType = 'info', title?: string, link?: string) => {
    const id = idRef.current++;
    const next: ToastItemData = {
      id,
      type,
      title,
      message,
      link: link || undefined,
      durationMs: toastDurationMs(type),
    };
    setToasts((prev) => [next, ...prev].slice(0, MAX_TOASTS));
  }, []);

  const value = useMemo(() => ({ showAlert }), [showAlert]);

  return (
    <HeaderModalContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onClose={dismissToast} />
    </HeaderModalContext.Provider>
  );
};

export const useHeaderModal = () => {
  const ctx = useContext(HeaderModalContext);
  if (!ctx) throw new Error('useHeaderModal must be used within HeaderModalProvider');
  return ctx;
};
