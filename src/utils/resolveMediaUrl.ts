/** Static assets from CRA `public/` — do not prefix with API host. */
const isFrontendStaticPath = (path: string) =>
  path.startsWith('/img/') || path.startsWith('/default') || path.startsWith('/favicon');

export const resolveMediaUrl = (path?: string | null) => {
  if (!path?.trim()) return '';
  const trimmed = path.trim();
  if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('./')) return trimmed;
  if (isFrontendStaticPath(trimmed)) return trimmed;

  const base = process.env.REACT_APP_API_LOCAL ?? '';
  return `${base}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
};
