import { Logo } from '../components/logo/Logo';
// components
import { SearchInput } from '../components/ui/searchInput/SearchInput';
import { HeaderNotificationMenu } from '../components/ui/headerNotificationMenu/HeaderNotificationMenu';
// hooks
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import { useNotificationHub } from '../hooks/hubs/useNotificationHub';
// style
import { StyleHeader, StyleHeaderBlock, StyleHeaderContainer } from './StyledLayout';
import { HeaderMenuAvatar } from '../components/ui/headerMenuAvatar/HeaderMenuAvatar';
import { useDrawer } from '../context/DrawerContext';
// mui
import { Box, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useAppSelector } from '../hooks/redux';

export const Header = () => {
  const { isMobile } = useDeviceDetect();
  const { open, setOpen } = useDrawer();
  const { isAuth } = useAppSelector((state) => state.user);
  useNotificationHub(Boolean(isAuth));

  return (
    <StyleHeader>
      <StyleHeaderContainer>
        <Button onClick={() => setOpen(!open)} sx={{ display: isMobile ? 'flex' : 'none' }}>
          <MenuIcon sx={{ color: 'var(--white)' }}></MenuIcon>
        </Button>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            minWidth: 0,
            gap: isMobile ? 0.5 : 2,
          }}
        >
          {isMobile ? null : <Logo />}

          <StyleHeaderBlock>
            <Box
              sx={{
                flex: isMobile ? '1 1 auto' : '0 0 auto',
                minWidth: 0,
                width: isMobile ? '100%' : 'auto',
                display: 'flex',
                justifyContent: isMobile ? 'center' : 'flex-end',
              }}
            >
              <SearchInput width={isMobile ? '100%' : 'min(360px, 42vw)'} />
            </Box>
            {isAuth ? <HeaderNotificationMenu /> : null}
            <HeaderMenuAvatar />
          </StyleHeaderBlock>
        </Box>
      </StyleHeaderContainer>
    </StyleHeader>
  );
};
