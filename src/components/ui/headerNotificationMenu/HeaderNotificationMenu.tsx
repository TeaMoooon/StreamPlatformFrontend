import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const navigate = useNavigate();
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
    if (selectedIds.length > 0) {
      dispatch(notificationMarkRead(selectedIds));
      setSelectedIds([]);
    }
    setAnchorEl(null);
  };

  const handleNotificationClick = (link: string, id: number) => {
    handleMarkAsRead(id);
    navigate(link.startsWith('/') ? link : `/${link}`);
    handleClose();
  };

  const handleMarkAsRead = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
    dispatch(MarkAsRead([id]));
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
          notifications.map((notification: INotificationUnified) => (
            <MenuItem
              sx={{
                display: 'grid',
                gridTemplateAreas: `'icon title time check' 'icon message message check'`,
                gridTemplateColumns: 'auto 1fr auto auto',
                gap: '5px 10px',
                justifyContent: 'normal',
              }}
              key={notification.id}
              onClick={() => handleNotificationClick(notification.link || '/', notification.id)}
            >
              <notification.icon sx={{ gridArea: 'icon' }} />
              <Box sx={{ gridArea: 'title' }}>{notification.title}</Box>
              <Box sx={{ gridArea: 'message' }}>{notification.message}</Box>
              <Box sx={{ gridArea: 'time', fontSize: '10px', gridColumn: 'span 1' }}>
                {formatDate(new Date(notification?.date))}
              </Box>
              {notification.isRead ? (
                <IconButton sx={{ gridArea: 'check', color: 'var(--white)' }}>
                  <DoneAllIcon />
                </IconButton>
              ) : (
                <IconButton
                  sx={{ gridArea: 'check', color: 'var(--color-link)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification.id);
                  }}
                >
                  <CheckIcon />
                </IconButton>
              )}
            </MenuItem>
          ))
        ) : (
          <MenuItem>Уведомлений нет</MenuItem>
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
