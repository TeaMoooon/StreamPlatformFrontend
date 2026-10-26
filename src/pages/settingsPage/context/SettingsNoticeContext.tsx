import { createContext, ReactNode, useCallback, useContext } from 'react';
import { AlertType } from '../../../types/share';
import { useHeaderModal } from '../../../context/HeaderModalContext';

type SettingsNoticeContextType = {
  showNotice: (message: string, type?: AlertType) => void;
  clearNotice: () => void;
};

const SettingsNoticeContext = createContext<SettingsNoticeContextType | undefined>(undefined);

/** Settings feedback uses the same top-right toast as the rest of the site. */
export const SettingsNoticeProvider = ({ children }: { children: ReactNode }) => {
  const { showAlert } = useHeaderModal();

  const showNotice = useCallback(
    (message: string, type: AlertType = 'info') => {
      showAlert(message, type);
    },
    [showAlert]
  );

  const clearNotice = useCallback(() => undefined, []);

  return (
    <SettingsNoticeContext.Provider value={{ showNotice, clearNotice }}>{children}</SettingsNoticeContext.Provider>
  );
};

export const useSettingsNotice = () => {
  const ctx = useContext(SettingsNoticeContext);
  if (!ctx) throw new Error('useSettingsNotice must be used within SettingsNoticeProvider');
  return ctx;
};
