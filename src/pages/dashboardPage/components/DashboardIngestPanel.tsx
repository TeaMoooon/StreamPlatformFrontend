import { useState } from 'react';
import { Box, Button, CircularProgress, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CastOutlinedIcon from '@mui/icons-material/CastOutlined';
import { useHeaderModal } from '../../../context/HeaderModalContext';
import { settingsFieldSx, settingsOutlinedButtonSx, settingsPanelSx } from '../../settingsPage/settings.styles';

const copyText = async (text: string) => {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

type DashboardIngestPanelProps = {
  streamKey: string;
  rtmpUrl: string;
  showKey: boolean;
  setShowKey: (value: boolean | ((prev: boolean) => boolean)) => void;
  isError: string | null;
  isLoading: boolean;
  streamingBlocked: boolean;
  regenerateKey: () => void;
};

/** OBS / RTMP credentials — only for channel owner. Never show to moderators. */
export const DashboardIngestPanel = ({
  streamKey,
  rtmpUrl,
  showKey,
  setShowKey,
  isError,
  isLoading,
  streamingBlocked,
  regenerateKey,
}: DashboardIngestPanelProps) => {
  const { showAlert } = useHeaderModal();
  const [confirmReset, setConfirmReset] = useState(false);

  const handleCopy = async (label: string, value: string) => {
    const ok = await copyText(value);
    showAlert(ok ? `${label} скопирован` : 'Не удалось скопировать', ok ? 'success' : 'error');
  };

  const handleRegenerate = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    regenerateKey();
    showAlert('Ключ стрима обновлён. Обновите настройки OBS.', 'success');
  };

  return (
    <Box sx={{ ...settingsPanelSx, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CastOutlinedIcon sx={{ color: '#8e7bff', fontSize: 20 }} />
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Подключение OBS</Typography>
          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 1.4 }}>
            Ключ видите только вы.
          </Typography>
        </Box>
      </Box>

      {streamingBlocked && (
        <Typography sx={{ fontSize: 12, color: '#ff8a80', lineHeight: 1.4 }}>
          Ключ сейчас не сработает — см. баннер выше. После снятия наказания можно снова выходить в эфир.
        </Typography>
      )}

      {isLoading && !streamKey ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} sx={{ color: '#8e7bff' }} />
        </Box>
      ) : (
        <>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', mb: 0.75 }}>
              Сервер (RTMP URL)
            </Typography>
            <TextField
              fullWidth
              value={rtmpUrl}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => handleCopy('RTMP URL', rtmpUrl)} edge="end">
                      <ContentCopyOutlinedIcon sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={settingsFieldSx}
            />
          </Box>

          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', mb: 0.75 }}>
              Ключ стрима (Stream Key)
            </Typography>
            <TextField
              fullWidth
              type={showKey ? 'text' : 'password'}
              value={streamKey}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowKey((v) => !v)} edge="end">
                      {showKey ? (
                        <VisibilityOffOutlinedIcon sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 18 }} />
                      ) : (
                        <VisibilityOutlinedIcon sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 18 }} />
                      )}
                    </IconButton>
                    <IconButton onClick={() => handleCopy('Ключ', streamKey)} edge="end">
                      <ContentCopyOutlinedIcon sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={settingsFieldSx}
            />
          </Box>

          {isError && <Typography sx={{ fontSize: 12, color: '#ff8a8a' }}>{isError}</Typography>}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleRegenerate}
              onBlur={() => setConfirmReset(false)}
              sx={settingsOutlinedButtonSx}
            >
              {confirmReset ? 'Подтвердить сброс ключа' : 'Сбросить ключ'}
            </Button>
          </Box>

          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.45 }}>
            В OBS: «Настройки → Эфир» → сервис «Custom» → вставьте RTMP URL и ключ. После сброса ключа обновите OBS.
          </Typography>
        </>
      )}
    </Box>
  );
};
