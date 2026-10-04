export type StaffSection = 'reports' | 'tickets' | 'appeals' | 'users' | 'audit';

export type StaffNavItem = {
  value: StaffSection;
  title: string;
  description: string;
  path: string;
  /** If true, only platform moderators/admins see this nav item. */
  requiresPlatformMod?: boolean;
};

/** Start on users so mute/ban is the first obvious action for moderators. */
export const STAFF_DEFAULT_SECTION: StaffSection = 'users';

export const getStaffNavItems = (canModeratePlatform = true): StaffNavItem[] =>
  [
    {
      value: 'users' as const,
      title: 'Мут и бан',
      description: 'Найти человека и выдать наказание',
      path: '/staff/users',
    },
    {
      value: 'reports' as const,
      title: 'Жалобы',
      description: 'Жалобы зрителей с сайта',
      path: '/staff/reports',
      requiresPlatformMod: true,
    },
    {
      value: 'appeals' as const,
      title: 'Просьбы снять бан',
      description: 'Пользователь просит отменить наказание',
      path: '/staff/appeals',
      requiresPlatformMod: true,
    },
    {
      value: 'tickets' as const,
      title: 'Вопросы в поддержку',
      description: 'Вопросы пользователей',
      path: '/staff/tickets',
    },
    {
      value: 'audit' as const,
      title: 'История действий',
      description: 'Кто что сделал в этой панели',
      path: '/staff/audit',
    },
  ].filter((item) => (item.requiresPlatformMod ? canModeratePlatform : true));

export const isStaffSection = (value?: string): value is StaffSection =>
  value === 'reports' || value === 'tickets' || value === 'appeals' || value === 'users' || value === 'audit';
