import { Link } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  Box,
  Button,
  Card,
  IconButton,
  InputLabel,
  List,
  ListItem,
  OutlinedInput,
  TextField,
  Typography,
} from '@mui/material';
import { ICardTypography, IStyledButtonForm } from '../types/share';

export const ContainerBox = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '32px',
  width: '90%',
  maxWidth: 'none',
  margin: '0 auto',
  padding: `10px 0`,
  '@media (max-width: 768px)': {
    gap: '24px',
    width: '100%',
    padding: `10px var(--layout-padding-x)`,
  },
}));

// Typography
export const StyledTitle = styled('h2')(() => ({
  fontSize: '28px',
  fontWeight: 'bold',
  color: 'var(--white)',
}));

export const StyledTitleH3 = styled('h3')(() => ({
  fontSize: '22px',
  fontWeight: 'bold',
  marginBottom: '20px',
}));

export const StyledTitleModal = styled('h3')(() => ({
  fontSize: '28px',
  fontWeight: 'bold',
  padding: '20px 16px',
}));

export const StyledNameComponents = styled('h4')(() => ({
  fontSize: '18px',
  fontWeight: 500,
  color: 'var(--white)',
}));

export const CardTypography = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'c' && prop !== 'fs' && prop !== 'isEllipsis',
})<ICardTypography>(({ c, fs, isEllipsis }) => ({
  fontSize: fs ? fs : '1rem',
  color: c ? c : 'var(--white)',
  whiteSpace: 'nowrap',
  overflow: isEllipsis ? 'hidden' : 'visible',
  textOverflow: isEllipsis ? 'ellipsis' : 'clip',
}));

export const StyledSpanDark = styled('span')(() => ({
  fontSize: '16px',
  fontWeight: 500,
  lineHeight: 1.2,
  color: 'var(--background-line)',
}));

// label
export const StyledInputLabel = styled(InputLabel)(() => ({
  color: 'var(--input-border)',
  '&.Mui-focused': {
    color: 'var(--white)',
  },
}));

// input
export const StyledTextFieldRegular = styled(TextField)(() => ({
  width: '100%',
  '& .MuiOutlinedInput-input': {
    color: 'var(--white) !important',
    caretColor: 'var(--white)',
    '&:-webkit-autofill': {
      WebkitBoxShadow: '0 0 0 100px var(--background) inset !important',
      WebkitTextFillColor: 'var(--white) !important',
      caretColor: 'var(--white) !important',
      borderRadius: '12px',
      transition: 'background-color 9999s ease-in-out 0s', // подавляет желтую подсветку Chrome
      backgroundClip: 'content-box !important',
    },
    '&:-webkit-autofill:hover': {
      WebkitBoxShadow: '0 0 0 100px var(--background) inset !important',
      WebkitTextFillColor: 'var(--white) !important',
    },
    '&:-webkit-autofill:focus': {
      WebkitBoxShadow: '0 0 0 100px var(--background) inset !important',
      WebkitTextFillColor: 'var(--white) !important',
    },
    '&:-webkit-autofill:active': {
      WebkitBoxShadow: '0 0 0 100px var(--background) inset !important',
      WebkitTextFillColor: 'var(--white) !important',
    },
  },

  '& .MuiInputLabel-root': {
    color: 'var(--input-border)',
    '&.Mui-focused': {
      color: 'var(--white)',
    },
    '&.Mui-disabled': {
      color: 'var(--background-line)',
    },
    '&.Mui-error': {
      color: 'var(--error)',
    },
  },
  '&:hover .MuiInputLabel-root': {
    color: 'var(--white)',
  },

  '& .MuiOutlinedInput-notchedOutline': {
    borderRadius: '12px',
    borderColor: 'var(--input-border)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--white)',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--white)',
  },
  '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--background-line)',
  },
}));

export const StyledTextFieldOutlined = styled(OutlinedInput)(() => ({
  // Change label color
  '& .MuiInputLabel-root': {
    color: 'var(--input-border)',
    '&.Mui-focused': {
      color: 'var(--white)',
    },
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderRadius: '12px',
    borderColor: 'var(--input-border)',
  },
  // Change input text color
  '& .MuiInputBase-input': {
    color: 'var(--white)',
    // Стили для автозаполнения
    '&:-webkit-autofill': {
      WebkitBoxShadow: '0 0 0 100px var(--background) inset',
      WebkitTextFillColor: 'var(--white)',
      caretColor: 'var(--white)',
      borderRadius: '12px',
      border: 'none', // Убираем бордер
      outline: 'none', // Убираем outline
    },
    '&:-webkit-autofill:hover': {
      WebkitBoxShadow: '0 0 0 100px var(--background) inset',
      WebkitTextFillColor: 'var(--white)',
      border: 'none',
      outline: 'none',
    },
    '&:-webkit-autofill:focus': {
      WebkitBoxShadow: '0 0 0 100px var(--background) inset',
      WebkitTextFillColor: 'var(--white)',
      border: 'none',
      outline: 'none',
    },
    '&:-webkit-autofill:active': {
      WebkitBoxShadow: '0 0 0 100px var(--background) inset',
      WebkitTextFillColor: 'var(--white)',
      border: 'none',
      outline: 'none',
    },
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--white)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--white)',
  },
  // Убираем внутренние бордеры
  '& .MuiOutlinedInput-input': {
    border: 'none',
    outline: 'none',
  },
}));

// Continer buttons

export const StyledButtonsForm = styled(Box)(() => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  '& > button': {
    width: '100%',
    borderRadius: '50px',
  },
}));

// IconButton

export const StyledIconButton = styled(IconButton)(() => ({
  color: 'var(--input-border)',
  borderRadius: 0,
  // background: 'var(--background-tabs)',
  '&:hover': {
    color: 'var(--white)',
  },
}));

// Form login
export const StyledButtonForm = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'bgcolor' && prop !== 'hoverbgcolor' && prop !== 'c' && prop !== 'hovercolor',
})<IStyledButtonForm>(({ bgcolor, hovercolor, hoverbgcolor, c }) => ({
  fontWeight: '600',
  minHeight: '40px',
  color: c || 'var(--black)',
  backgroundColor: bgcolor || 'var(--button-light)',
  textTransform: 'none',
  '&:hover': {
    color: hovercolor || 'white',
    backgroundColor: hoverbgcolor || 'var(--button-light-hover)',
  },
}));

// Video card
export const StyledVideoCard = styled(Card)({
  position: 'relative',
  background: 'var(--background-tabs)',
  borderRadius: '16px',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    background: 'var(--background-card)',
  },
});

export const StyledVideoCardInfo = styled(Box)({
  position: 'absolute',
  bottom: '0',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  padding: '10px',
  overflow: 'hidden',
  background:
    'linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgb(139 139 139 / 30%) 50%, rgb(151 151 151 / 80%) 100%)',
  backdropFilter: 'blur(6px)',
  pointerEvents: 'none',
});

export const StyledVideoCardLink = styled(Link)({
  position: 'absolute',
  width: '100%',
  height: '100%',
  zIndex: 1,
});

// StyledSidebar
export const StyledSidebar = styled(Box)(() => ({
  position: 'sticky',
  top: 0,
  left: 0,
  display: 'flex',
  flexDirection: 'column',
  width: 72,
  minWidth: 72,
  minHeight: '100vh',
  background: 'rgba(12,10,28,0.92)',
  borderRight: '1px solid rgba(255,255,255,0.08)',
  zIndex: 1000,
  overflow: 'hidden',
  '@media (max-width: 768px)': {
    display: 'none',
  },
}));

export const StyledSidebarName = styled(Box)({
  fontSize: '14px',
  fontWeight: 600,
  textTransform: 'uppercase',
  color: 'var(--color-sidebar)',
  letterSpacing: '0.5px',
  marginTop: '16px',
  marginBottom: '8px',
});

export const StyledSidebarList = styled(List)({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  overflowY: 'auto',
  overflowX: 'hidden',
});

export const StyledSidebarListItem = styled(ListItem)({
  padding: 0,
  borderRadius: 10,
  justifyContent: 'center',
  width: '100%',
});

export const StyledSidebarLink = styled(Link)({
  textDecoration: 'none',
  color: 'var(--color-link)',
  fontSize: '15px',
  fontWeight: 500,
  padding: '5px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  transition: 'color 0.25s ease',

  '&:hover': {
    color: 'var(--white)',
  },
  '&.active': {
    color: 'var(--white)',
    background: 'var(--gradient-active-link)',
    borderRadius: '12px',
  },
});

// buttons
export const StyledFilterButton = styled(Button)({
  padding: '4px 12px',
  background: 'var(--background-tabs)',
  textTransform: 'none',
  fontSize: '0.95rem',
  fontWeight: 500,
  color: 'var(--color-link)',
  height: 45,
  minWidth: 90,
  borderRadius: '10px',
  transition: 'all 0.25s ease',
  '&:hover': {
    background: 'var(--background-tab)',
    color: 'var(--white)',
  },
  '&.active': {
    color: 'var(--white)',
    background: 'var(--gradient-selected)',
    boxShadow: 'var(--boxShadowButton)',
  },
});

export const StyledFollowButton = styled(Button)({
  fontSize: '0.95rem',
  fontWeight: 600,
  marginTop: '10px',
  padding: '8px 28px',
  color: 'var(--white)',
  borderRadius: '10px',
  background: 'var(--gradient-selected)',
  textTransform: 'none',
  '&:hover': { background: 'var(--gradient-selected-hover)' },
});

export const StyledButtonLive = styled(Box)(() => ({
  display: 'flex',
  fontSize: '14px',
  height: 'min-content',
  whiteSpace: 'nowrap',
  padding: '5px 10px',
  borderRadius: '5px',
  color: 'var(--white)',
  background: 'var(--live-btn)',
}));
