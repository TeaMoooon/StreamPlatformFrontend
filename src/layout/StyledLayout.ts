import { Box, MenuItem, Pagination } from '@mui/material';
import { styled } from '@mui/system';

export { StyledMenu } from './StyledMenu';

export const StyleHeader = styled(Box)(() => ({
  minHeight: '65px',
  width: '100%',
  zIndex: '1000',
  backgroundColor: 'transparent',
}));

export const StyleHeaderContainer = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  width: '90%',
  maxWidth: 'none',
  margin: '0 auto',
  padding: '10px 0',
  '@media (max-width: 768px)': {
    width: '100%',
    padding: '10px var(--layout-padding-x)',
  },
}));

export const StyleHeaderBlock = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '15px',
  justifyContent: 'flex-end',
  width: '100%',
  '@media (max-width: 768px)': {
    gap: '5px',
  },
}));

export const StyledMenuButton = styled(MenuItem)(() => ({
  color: 'var(--white)',
  textTransform: 'none',
  fontSize: '1rem',
  width: '100%',
  padding: 0,
  justifyContent: 'flex-start',
  border: 'none',
  background: 'transparent',
}));

export const IconNotidicationCount = styled(Box)(() => ({
  position: 'absolute',
  top: 10,
  right: 10,
  color: 'var(--white)',
  fontSize: '1rem',
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  background: '#ff0000',
}));

export const StyledPaginationMenu = styled(Pagination)(() => ({
  '& .MuiPagination-ul': { justifyContent: 'center' },
  '& .MuiPaginationItem-root': {
    color: 'var(--video-card-name)',
    borderRadius: '8px',
    border: '1px solid transparent',
    transition: 'all 0.2s ease',
  },

  '& .MuiPaginationItem-root:hover': {
    backgroundColor: 'var(--background-card)',
    borderColor: 'var(--background-tab)',
  },

  '& .Mui-selected': {
    backgroundColor: 'var(--sidebar-hover) !important',
    color: 'var(--white)',
    borderRadius: '8px',
  },
}));
