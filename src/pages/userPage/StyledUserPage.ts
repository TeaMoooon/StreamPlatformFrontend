import { Box, styled } from '@mui/material';

export const StyledVideoGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '20px',
  width: '100%',
  padding: 0,
});
