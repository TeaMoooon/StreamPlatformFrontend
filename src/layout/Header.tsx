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
        <Box sx={{ display: 'flex', justifyContent: 'space-beetwen', width: '100%' }}>
          {isMobile ? <></> : <Logo />}

          <StyleHeaderBlock>
            <SearchInput width={'min(360px, 42vw)'} />
            {isAuth ? <HeaderNotificationMenu /> : <></>}
            <HeaderMenuAvatar />
          </StyleHeaderBlock>
        </Box>
      </StyleHeaderContainer>
    </StyleHeader>
  );
};
