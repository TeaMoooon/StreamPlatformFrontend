import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../../hooks/redux';
import { useDispatch } from 'react-redux';
// store
import { AppDispatch } from '../../../store/store';
import {
  notificationAllRead,
  notificationMarkRead,
  notificationWithPagination,
  selectAllNotificationsUnified,
} from '../../../store/actions/NotificationActions';
import { MarkAsRead } from '../../../store/slices/NotificationSlice';
//  components
import { PaginationComponent } from '../pagination/PaginationComponent';
// mui
import { Box, IconButton, MenuItem } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CheckIcon from '@mui/icons-material/Check';
// utils
import { formatDate } from '../../../utils/formatDate';
// styles, types
import { IconNotidicationCount, StyledMenu } from '../../../layout/StyledLayout';
import { INotificationUnified } from '../../../types/share';

const REFRESH_MS = 45_000;

export const HeaderNotificationMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const open = Boolean(anchorEl);
  const notifications = useAppSelector(selectAllNotificationsUnified);
  const { page, limit, totalCount } = useAppSelector((state) => state.notiications.paged);

  useEffect(() => {
    dispatch(notificationWithPagination());
    const onFocus = () => dispatch(notificationWithPagination());
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(() => dispatch(notificationWithPagination()), REFRESH_MS);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [dispatch]);

  const pageCount = Math.ceil(totalCount / limit) || 1;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl((prev) => {
      if (prev) return null;
      // Refresh when opening the bell so new sanctions appear even without SignalR.
      dispatch(notificationWithPagination(page, limit));
      return event.currentTarget;
    });
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markRead = (id: number) => {
    dispatch(MarkAsRead([id]));
    dispatch(notificationMarkRead([id]));
  };

  const handleNotificationActivate = (notification: INotificationUnified) => {
    markRead(notification.id);
    handleClose();
  };

  const handleMarkAsReadClick = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    markRead(id);
  };

  const handleMarkAllRead = () => {
    dispatch(notificationAllRead());
  };

  return (
    <>
      <IconButton
        id="basic-button"
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        sx={{ position: 'relative' }}
      >
        <NotificationsIcon sx={{ color: 'var(--white)' }} fontSize="medium" />

        {notifications.some((n) => !n.isRead) && <IconNotidicationCount />}
      </IconButton>
      <StyledMenu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          list: {
            'aria-labelledby': 'basic-button',
          },
        }}
      >
        {notifications.length > 0 ? (
          notifications.map((notification: INotificationUnified) => {
            const to = notification.link?.startsWith('/') ? notification.link : `/${notification.link || ''}`;
            return (
              <MenuItem
                component={Link}
                to={to || '/'}
                sx={{
                  display: 'grid',
                  gridTemplateAreas: `'icon title time check' 'icon message message check'`,
                  gridTemplateColumns: 'auto 1fr auto auto',
                  gap: '5px 10px',
                  justifyContent: 'normal',
                  textDecoration: 'none',
                  color: 'inherit',
                  whiteSpace: 'normal',
                  alignItems: 'start',
                }}
                key={notification.id}
                onClick={() => handleNotificationActivate(notification)}
              >
                <notification.icon sx={{ gridArea: 'icon', mt: 0.25 }} />
                <Box sx={{ gridArea: 'title', fontWeight: 600 }}>{notification.title}</Box>
                <Box sx={{ gridArea: 'message', fontSize: 13, opacity: 0.85 }}>{notification.message}</Box>
                <Box sx={{ gridArea: 'time', fontSize: '10px', gridColumn: 'span 1' }}>
                  {formatDate(new Date(notification?.date))}
                </Box>
                {notification.isRead ? (
                  <Box
                    component="span"
                    sx={{ gridArea: 'check', color: 'var(--white)', display: 'inline-flex', p: 0.5 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <DoneAllIcon fontSize="small" />
                  </Box>
                ) : (
                  <Box
                    component="span"
                    role="button"
                    aria-label="Отметить прочитанным"
                    sx={{
                      gridArea: 'check',
                      color: 'var(--color-link)',
                      display: 'inline-flex',
                      p: 0.5,
                      borderRadius: 1,
                      cursor: 'pointer',
                    }}
                    onClick={(e) => handleMarkAsReadClick(e, notification.id)}
                  >
                    <CheckIcon fontSize="small" />
                  </Box>
                )}
              </MenuItem>
            );
          })
        ) : (
          <MenuItem disabled>Уведомлений нет</MenuItem>
        )}
        {notifications.length > 0 && [
          <PaginationComponent
            key="pagination"
            count={pageCount}
            pageCurrent={page}
            functionDispatch={notificationWithPagination}
          />,
          <MenuItem key="markAll" sx={{ justifyContent: 'center' }} onClick={handleMarkAllRead}>
            Отметить все, как прочитанные
          </MenuItem>,
        ]}
      </StyledMenu>
    </>
  );
};
