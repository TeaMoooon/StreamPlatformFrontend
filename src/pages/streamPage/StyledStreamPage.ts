import { Box, Button, styled } from '@mui/material';

export const StyledContainerStream = styled(Box)(() => ({
  display: 'flex',
  position: 'relative',
  overflow: 'hidden',
  height: 'auto',
  maxHeight: 'none',
  minHeight: 0,
  transition: 'none',
  '@media (max-width: 768px)': {
    minHeight: 'auto',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at center, rgba(88,101,242,0.35), transparent 70%)',
    filter: 'blur(40px)',
    zIndex: 0,
  },
}));

export const StyledHeaderStreamPage = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  padding: '20px',
  '@media (max-width: 768px)': {
    flexDirection: 'column',
    gap: '20px',
  },
}));

export const StyledStreamContainerVideoPlayer = styled(Box)(() => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  height: 'auto',
  zIndex: 1,
  backgroundColor: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(16px)',
  '@media (max-width: 768px)': {
    height: 'auto',
    flex: '0 0 auto',
  },
}));

export const StyledStreamContainerChat = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
  borderRadius: '4px',
  '@media (max-width: 768px)': {
    height: 'min(50vh, 420px)',
    maxHeight: 'min(50vh, 420px)',
    minHeight: '280px',
    flex: '0 0 auto',
  },
}));

export const StyledStreamMetaBar = styled(Box)(() => ({
  position: 'relative',
  zIndex: 1,
  width: '100%',
  backgroundColor: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(16px)',
  borderRadius: '4px',
  borderTop: '1px solid rgba(255,255,255,0.08)',
}));

export const StyledButtonWathers = styled(Button)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  fontSize: '10px',
  height: 'min-content',
  minWidth: 'min-content',
  whiteSpace: 'nowrap',
  padding: '5px',
  color: 'var(--white)',
  background: 'var(--modal-background)',
}));
