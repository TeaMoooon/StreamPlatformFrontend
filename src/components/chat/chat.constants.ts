export const CHAT_SLOW_MODE_COLOR = '#56cb27';
export const CHAT_SLOW_MODE_COLOR_RGB = '86, 203, 39';

export const CHAT_MAX_MESSAGE_LENGTH = 500;

export const CHAT_SLOW_MODE_PRESETS = [0, 3, 5, 10, 15, 30, 60, 120, 300] as const;

export const CHAT_EMOJIS = [
  '😀',
  '😂',
  '😍',
  '🥰',
  '😎',
  '🤔',
  '😢',
  '😡',
  '👍',
  '👎',
  '👏',
  '🙏',
  '🔥',
  '💯',
  '❤️',
  '💜',
  '🎉',
  '⭐',
  '✅',
  '❌',
  '🤣',
  '😭',
  '😱',
  '🤝',
  '👀',
  '🍿',
  '🎮',
  '🏆',
  '⚡',
  '🚀',
  '💀',
  '🫡',
];

export type ChatMode = 'normal' | 'emote_only' | 'subscribers_only';

export const CHAT_MODE_OPTIONS: ReadonlyArray<{
  value: ChatMode;
  label: string;
  hint: string;
}> = [
  { value: 'normal', label: 'Обычный чат', hint: 'Все зрители могут писать текст' },
  { value: 'emote_only', label: 'Только эмодзи', hint: 'Зрители могут отправлять только эмодзи' },
  {
    value: 'subscribers_only',
    label: 'Только подписчики',
    hint: 'Писать могут подписчики канала, стример и команда',
  },
];

export const CHAT_TIMEOUT_PRESETS = [
  { seconds: 60, label: '1 мин' },
  { seconds: 300, label: '5 мин' },
  { seconds: 600, label: '10 мин' },
  { seconds: 1800, label: '30 мин' },
  { seconds: 3600, label: '1 ч' },
] as const;
