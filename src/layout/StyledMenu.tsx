import { Menu, MenuProps } from '@mui/material';
import { forwardRef, useEffect, useRef, type MutableRefObject, type Ref } from 'react';

const menuListSx = {
  backgroundColor: 'var(--background-header-menu)',
  color: 'var(--color-link)',
  backdropFilter: 'blur(10px)',
  '& .MuiMenuItem-root': {
    color: 'var(--color-link)',
    '&:hover': {
      backgroundColor: 'var(--background-tab)',
      color: 'var(--hover-header-menu)',
    },
  },
} as const;

const assignRef = <T,>(ref: Ref<T> | undefined, value: T) => {
  if (!ref) return;
  if (typeof ref === 'function') ref(value);
  else (ref as MutableRefObject<T>).current = value;
};

/**
 * Header dropdown that does not block hover/clicks on the rest of the UI.
 * Modal overlay uses pointer-events: none; paper stays interactive.
 */
export const StyledMenu = forwardRef<HTMLDivElement, MenuProps>(function StyledMenu(
  { open, onClose, anchorEl, slotProps, sx, ...rest },
  ref
) {
  const paperRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (paperRef.current?.contains(target)) return;
      if (anchorEl instanceof Element && anchorEl.contains(target)) return;
      onClose?.(event, 'backdropClick');
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [open, onClose, anchorEl]);

  const slotPropsPaper = slotProps?.paper;
  const paperSlot = typeof slotPropsPaper === 'function' ? {} : (slotPropsPaper ?? {});
  const slotPropsRoot = slotProps?.root;
  const rootSlot = typeof slotPropsRoot === 'function' ? {} : (slotPropsRoot ?? {});
  const slotPropsList = slotProps?.list;
  const listSlot = typeof slotPropsList === 'function' ? {} : (slotPropsList ?? {});

  return (
    <Menu
      ref={ref}
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      hideBackdrop
      disableScrollLock
      disableAutoFocus
      disableEnforceFocus
      disableRestoreFocus
      slotProps={{
        ...slotProps,
        root: {
          ...rootSlot,
          sx: [
            { pointerEvents: 'none' },
            ...(rootSlot.sx == null ? [] : Array.isArray(rootSlot.sx) ? rootSlot.sx : [rootSlot.sx]),
          ],
        },
        paper: {
          ...paperSlot,
          ref: (node: HTMLElement | null) => {
            paperRef.current = node;
            assignRef(paperSlot.ref as Ref<HTMLElement | null> | undefined, node);
          },
          sx: [
            {
              pointerEvents: 'auto',
              backgroundColor: 'var(--background-header-menu)',
              backdropFilter: 'blur(10px)',
            },
            ...(paperSlot.sx == null ? [] : Array.isArray(paperSlot.sx) ? paperSlot.sx : [paperSlot.sx]),
          ],
        },
        list: {
          ...listSlot,
          sx: [menuListSx, ...(listSlot.sx == null ? [] : Array.isArray(listSlot.sx) ? listSlot.sx : [listSlot.sx])],
        },
      }}
      sx={[
        { pointerEvents: 'none', '& .MuiPaper-root': { pointerEvents: 'auto' } },
        ...(sx == null ? [] : Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    />
  );
});
