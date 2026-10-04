export const CHAT_NOTICE_TITLE_MAX = 80;
export const CHAT_NOTICE_BODY_MAX = 500;

const VISIBILITY_PREFIX = 'chat-notice-visible';

const visibilityKey = (streamerId: number) => `${VISIBILITY_PREFIX}:${streamerId}`;

/** Collapsed by default; returns true only when user explicitly expanded it. */
export const isChatNoticePreferredVisible = (streamerId?: number): boolean => {
  if (typeof window === 'undefined' || !streamerId) return false;
  try {
    return window.localStorage.getItem(visibilityKey(streamerId)) === '1';
  } catch {
    return false;
  }
};

export const setChatNoticePreferredVisible = (streamerId: number, visible: boolean): void => {
  if (typeof window === 'undefined' || !streamerId) return;
  try {
    window.localStorage.setItem(visibilityKey(streamerId), visible ? '1' : '0');
  } catch {
    /* ignore quota / private mode */
  }
};

export const displayChatNoticeTitle = (title: string): string => {
  const trimmed = title.trim();
  return trimmed || 'Уведомление';
};
