import { Fragment, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Link as RouterLink } from 'react-router-dom';
import { AlertType } from '../../types/share';

export type ToastItemData = {
  id: number;
  type: AlertType;
  title?: string;
  message: string;
  durationMs: number;
  /** Deep-link (e.g. /settings/support?sanction=12) — keywords in text become clickable. */
  link?: string;
};

type ToastAlertProps = {
  toast: ToastItemData;
  onClose: (id: number) => void;
};

const palette = (type: AlertType) => {
  switch (type) {
    case 'success':
      return {
        accent: 'var(--success)',
        soft: 'rgba(111, 255, 121, 0.1)',
      };
    case 'warning':
      return {
        accent: '#ffb74d',
        soft: 'rgba(255, 183, 77, 0.1)',
      };
    case 'error':
      return {
        accent: '#ff8a80',
        soft: 'rgba(255, 138, 128, 0.1)',
      };
    default:
      return {
        accent: '#8e7bff',
        soft: 'rgba(142, 123, 255, 0.1)',
      };
  }
};

const defaultTitle = (type: AlertType) => {
  switch (type) {
    case 'error':
      return 'Ошибка';
    case 'warning':
      return 'Внимание';
    case 'success':
      return 'Готово';
    default:
      return 'Уведомление';
  }
};

/** Total lifetime for every toast (hang + short fade), until hovered. */
export const toastDurationMs = (_type?: AlertType) => 5000;

/** After mouse leaves the toast — close in this many ms. */
const AFTER_HOVER_MS = 3000;

/** Last N ms of a lifetime: opacity goes 1 → 0. */
const FADE_OUT_MS = 350;

/** Longer phrases first so "бан стрима" wins over bare matches. */
const LINKABLE_PHRASES = [
  'Настройки → Поддержка',
  'Настройки → поддержка',
  'полный бан',
  'бан стрима',
  'бан входа',
  'мут чата',
  'предупреждение',
  'апелляцию',
  'апелляции',
  'апелляция',
  'тикет',
];

const LINKABLE_RE = new RegExp(
  `(${LINKABLE_PHRASES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  'gi'
);

/** Brand accent used across dashboard/settings chips and highlights. */
const linkSx = {
  color: '#8e7bff',
  fontWeight: 600,
  textDecoration: 'none',
  cursor: 'pointer',
  '&:hover': {
    color: '#cfc5ff',
  },
} as const;

/** Turns the first sanction/support keyword into a deep-link; rest stays plain. */
const LinkedMessage = ({ text, link, onNavigate }: { text: string; link?: string; onNavigate?: () => void }) => {
  if (!link || !text) return <>{text}</>;

  const parts = text.split(LINKABLE_RE);
  if (parts.length <= 1) return <>{text}</>;

  let linkedOnce = false;
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        const isPhrase = LINKABLE_PHRASES.some((p) => p.toLowerCase() === part.toLowerCase());
        if (isPhrase && !linkedOnce) {
          linkedOnce = true;
          return (
            <Box key={`${i}-${part}`} component={RouterLink} to={link} onClick={onNavigate} sx={linkSx}>
              {part}
            </Box>
          );
        }
        return <Fragment key={`${i}-${part.slice(0, 12)}`}>{part}</Fragment>;
      })}
    </>
  );
};
export const ToastAlert = ({ toast, onClose }: ToastAlertProps) => {
  const colors = palette(toast.type);
  const [opacity, setOpacity] = useState(1);
  const remainingRef = useRef(toast.durationMs);
  const pausedRef = useRef(false);
  const lastTickRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const tick = (now: number) => {
      if (lastTickRef.current == null) lastTickRef.current = now;
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      if (!pausedRef.current) {
        remainingRef.current = Math.max(0, remainingRef.current - delta);
        const remaining = remainingRef.current;
        setOpacity(remaining > FADE_OUT_MS ? 1 : remaining / FADE_OUT_MS);
        if (remaining <= 0) {
          onCloseRef.current(toast.id);
          return;
        }
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [toast.id]);

  const titleText = toast.title?.trim() || defaultTitle(toast.type);
  const handleNavigate = () => onClose(toast.id);

  return (
    <Box
      role="status"
      aria-live="polite"
      onMouseEnter={() => {
        pausedRef.current = true;
        setOpacity(1);
        lastTickRef.current = null;
      }}
      onMouseLeave={() => {
        // Leave → fully visible again, then 3s countdown to close.
        remainingRef.current = AFTER_HOVER_MS;
        setOpacity(1);
        pausedRef.current = false;
        lastTickRef.current = null;
      }}
      sx={{
        position: 'relative',
        width: 'min(340px, calc(100vw - 24px))',
        overflow: 'hidden',
        borderRadius: '12px',
        border: 'none',
        opacity,
        pointerEvents: 'auto',
        background: `
          linear-gradient(105deg, ${colors.soft} 0%, transparent 55%),
          var(--background-header-menu)
        `,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.38)',
        // Transform only — opacity is controlled by state (hover/fade).
        animation: 'toastSlideIn 0.26s ease-out',
        '@keyframes toastSlideIn': {
          from: { transform: 'translateX(12px)' },
          to: { transform: 'translateX(0)' },
        },
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, pl: 1.75, pr: 1.25, pt: 1.5, pb: 1.5, alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.3,
              color: '#fff',
            }}
          >
            {titleText}
          </Typography>
          <Typography
            component="div"
            sx={{
              fontSize: 13,
              lineHeight: 1.45,
              color: 'rgba(255,255,255,0.68)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            <LinkedMessage text={toast.message} link={toast.link} onNavigate={handleNavigate} />
          </Typography>
        </Box>
        <IconButton
          size="small"
          aria-label="Закрыть"
          onClick={() => onClose(toast.id)}
          sx={{
            color: 'var(--color-link)',
            p: 0.35,
            mt: -0.2,
            '&:hover': {
              color: 'var(--hover-header-menu)',
              bgcolor: 'var(--background-tab)',
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Box>
    </Box>
  );
};

type ToastStackProps = {
  toasts: ToastItemData[];
  onClose: (id: number) => void;
};

export const ToastStack = ({ toasts, onClose }: ToastStackProps) => {
  if (toasts.length === 0) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: { xs: 72, sm: 80 },
        right: { xs: 12, sm: 20 },
        zIndex: 1400,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        pointerEvents: 'none',
        '& > *': { pointerEvents: 'auto' },
      }}
    >
      {toasts.map((toast) => (
        <ToastAlert key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </Box>
  );
};
