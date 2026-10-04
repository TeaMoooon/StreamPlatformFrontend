import DashboardCustomizeOutlinedIcon from '@mui/icons-material/DashboardCustomizeOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import PermIdentityIcon from '@mui/icons-material/PermIdentity';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import LogoutIcon from '@mui/icons-material/Logout';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
// redux
import { AppDispatch } from '../../../store/store';
import { useDispatch } from 'react-redux';
import { logoutUser } from '../../../store/actions/UserActions';
// hooks
import { useAppSelector } from '../../../hooks/redux';
// components
import { StyledMenu } from '../../../layout/StyledLayout';
import { ModalComponent } from '../../modal/ModalComponent';
// mui
import { IconButton, MenuItem } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import { fetchStaffMe } from '../../../api/reportsApi';

export const HeaderMenuAvatar = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { data: profile, isAuth } = useAppSelector((state) => state.user);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openModal, setOpenModal] = useState(false);
  const [authTab, setAuthTab] = useState(0);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    if (!isAuth) {
      setIsStaff(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await fetchStaffMe();
      if (!cancelled) {
        setIsStaff(Boolean(result.success && result.permissions.canAccessStaffPanel));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuth]);

  const menuData = [
    {
      authOnly: true,
      href: `/${profile?.nickname}`,
      icon: PermIdentityIcon,
      value: 'Профиль',
    },
    {
      authOnly: true,
      href: '/dashboard',
      icon: DashboardCustomizeOutlinedIcon,
      value: 'Панель стрима',
    },
    ...(isStaff
      ? [
          {
            authOnly: true,
            href: '/staff/reports',
            icon: GavelOutlinedIcon,
            value: 'Staff',
          },
        ]
      : []),
    {
      authOnly: true,
      href: '/settings',
      icon: SettingsIcon,
      value: 'Настройки',
    },
  ];
  const menuItemSx = {
    color: 'var(--white)',
    display: 'flex',
    alignItems: 'center',
    gap: 1.25,
    minHeight: 40,
    px: 1.75,
    py: 0.75,
    '& .MuiSvgIcon-root': {
      fontSize: 20,
      flexShrink: 0,
    },
  };

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl((prev) => (prev ? null : event.currentTarget));
  };

  const handleOpenAuth = (tab: 0 | 1) => {
    setAuthTab(tab);
    setOpenModal(true);
    handleClose();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const logout = async () => {
    await dispatch(logoutUser());
    handleClose();
  };

  return (
    <>
      <IconButton
        id="basic-button"
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
      >
        <PersonIcon sx={{ color: 'var(--white)' }} fontSize="medium" />
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
        {menuData
          .filter((item) => (item.authOnly ? isAuth : true))
          .map((item, index) => (
            <MenuItem sx={menuItemSx} key={index} component={Link} to={item.href}>
              {item.icon && <item.icon />}
              {item.value}
            </MenuItem>
          ))}
        {isAuth ? (
          <MenuItem sx={menuItemSx} onClick={logout}>
            <LogoutIcon />
            Выйти
          </MenuItem>
        ) : (
          <>
            <MenuItem sx={menuItemSx} onClick={() => handleOpenAuth(0)}>
              <LoginIcon />
              Войти
            </MenuItem>
            <MenuItem sx={menuItemSx} onClick={() => handleOpenAuth(1)}>
              <PersonAddAlt1Icon />
              Зарегистрироваться
            </MenuItem>
          </>
        )}
      </StyledMenu>
      <ModalComponent
        open={openModal}
        setOpen={setOpenModal}
        initialTab={authTab}
        title="Войти или зарегистрироваться"
      />
    </>
  );
};
