import { JSX } from 'react';
import { Header } from './Header';
import { Box } from '@mui/material';
import { Sidebar } from '../components/sidebar/Sidebar';
import { DrawerComponent } from '../components/drawer/DrawerComponent';

/**
 * Same shell as appLayout: permanent rail (desktop) + temporary drawer (mobile / expand).
 * Used by settings, dashboard, staff, channel manage.
 */
export const settingLayout = (PageComponent: () => JSX.Element, header = true, footer = true) => {
  return function WithPage({ ...props }) {
    return (
      <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
        <Sidebar />
        <DrawerComponent />
        <Box
          sx={{
            display: 'flex',
            flex: 1,
            background: 'transparent',
            flexDirection: 'column',
            width: '100%',
            minWidth: 0,
          }}
        >
          {header && <Header />}
          <PageComponent {...props} />
        </Box>
      </Box>
    );
  };
};
