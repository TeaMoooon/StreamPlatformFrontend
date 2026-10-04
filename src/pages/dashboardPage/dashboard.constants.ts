export type DashboardSection = 'stream' | 'team' | 'chat';

export type DashboardMode = 'own' | 'delegated';

export type DashboardNavItem = {
  value: DashboardSection;
  title: string;
  description: string;
  path: string;
  streamerOnly?: boolean;
};

export const DASHBOARD_DEFAULT_SECTION: DashboardSection = 'stream';

export const getDashboardBasePath = (mode: DashboardMode, channelNickname?: string) =>
  mode === 'own' ? '/dashboard' : `/${channelNickname}/manage`;

export const getDashboardNavItems = (basePath: string): DashboardNavItem[] => [
  {
    value: 'stream',
    title: 'Эфир',
    description: 'Как выглядит эфир',
    path: `${basePath}/stream`,
  },
  {
    value: 'team',
    title: 'Команда',
    description: 'Кто помогает вести канал',
    path: `${basePath}/team`,
    streamerOnly: true,
  },
  {
    value: 'chat',
    title: 'Чат',
    description: 'Режим и правила',
    path: `${basePath}/chat`,
  },
];

export const isDashboardSection = (value?: string): value is DashboardSection =>
  value === 'stream' || value === 'team' || value === 'chat';
