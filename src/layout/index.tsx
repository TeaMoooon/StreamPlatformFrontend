import { JSX } from 'react';
import { Header } from './Header';
import { Sidebar } from '../components/sidebar/Sidebar';
import { Box } from '@mui/material';
import { DrawerComponent } from '../components/drawer/DrawerComponent';

export const appLayout = (PageComponent: () => JSX.Element, header = true, footer = true) => {
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
