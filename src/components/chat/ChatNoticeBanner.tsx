import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { displayChatNoticeTitle } from './chatNotice.utils';

type ChatNoticeBannerProps = {
  title: string;
  body: string;
  onClose?: () => void;
};

export const ChatNoticeBanner = ({ title, body, onClose }: ChatNoticeBannerProps) => {
  const trimmedBody = body.trim();
  if (!trimmedBody) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 30,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 3,
        width: 'calc(100% - 24px)',
        maxWidth: 320,
        px: 1.25,
        py: 1,
        pr: onClose ? 3.5 : 1.25,
        borderRadius: 1.5,
        bgcolor: 'rgba(22, 20, 36, 0.96)',
        border: '1px solid rgba(184, 173, 255, 0.45)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        pointerEvents: 'auto',
        maxHeight: '40%',
        overflowY: 'auto',
      }}
    >
      {onClose && (
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Скрыть уведомление"
          title="Скрыть"
          sx={{
            position: 'absolute',
            top: 2,
            right: 2,
            color: 'rgba(255,255,255,0.45)',
            '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          color: '#b8adff',
          mb: 0.5,
          letterSpacing: '0.04em',
          lineHeight: 1.3,
        }}
      >
        {displayChatNoticeTitle(title).toUpperCase()}
      </Typography>
      <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
        {trimmedBody}
      </Typography>
    </Box>
  );
};
