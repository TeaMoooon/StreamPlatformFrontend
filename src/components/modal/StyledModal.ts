import { Box, styled } from '@mui/material';

export const StyleModalContent = styled(Box)(() => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'min(420px, calc(100vw - 32px))',
  background: 'linear-gradient(165deg, rgba(28, 24, 48, 0.98) 0%, rgba(18, 16, 32, 0.98) 100%)',
  border: '1px solid rgba(142, 123, 255, 0.28)',
  borderRadius: 14,
  padding: '20px 20px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(109, 93, 251, 0.08)',
  outline: 'none',
}));
