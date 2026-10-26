/** Frontend-static default avatar (served from `public/img/avatars`). */
export const DEFAULT_AVATARS = ['/img/avatars/default.png'] as const;

export type DefaultAvatarPath = (typeof DEFAULT_AVATARS)[number];

export const DEFAULT_AVATAR: DefaultAvatarPath = DEFAULT_AVATARS[0];

export const pickDefaultAvatar = (_seed?: number) => DEFAULT_AVATAR;
