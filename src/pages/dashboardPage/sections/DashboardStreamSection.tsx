import { FormEvent, useEffect, useRef, useState } from 'react';
import { Box, Button, Chip, CircularProgress, MenuItem, TextField, Typography } from '@mui/material';
import LiveTvOutlinedIcon from '@mui/icons-material/LiveTvOutlined';
import OfflineBoltOutlinedIcon from '@mui/icons-material/OfflineBoltOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { DashboardMode } from '../dashboard.constants';
import { STREAM_LANGUAGE_OPTIONS, useStreamDashboardSettings } from '../../../hooks/useStreamDashboardSettings';
import { DashboardIngestPanel } from '../components/DashboardIngestPanel';
import { DashboardStreamingBanBanner } from '../components/DashboardStreamingBanBanner';
import { DashboardStreamPreviewField } from '../components/DashboardStreamPreviewField';
import { StyledDashboardSectionHint, StyledDashboardSectionTitle } from '../StyledDashboardPage';
import { formatLiveDuration } from '../../../utils/formatDate';
import { useStreamIngest } from '../../../hooks/useStreamIngest';
import { useHeaderModal } from '../../../context/HeaderModalContext';
import { sanctionTypeLabel } from '../../../api/appealsApi';

const panelSx = {
  p: 2,
  borderRadius: 2,
  bgcolor: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    bgcolor: 'rgba(255,255,255,0.04)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.55)' },
  '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.6)' },
};

export const DashboardStreamSection = ({ channelNickname, mode }: { channelNickname: string; mode: DashboardMode }) => {
  const { settings, categories, canManageStream, isLoading, error, isSaving, saveSettings, uploadPreview } =
    useStreamDashboardSettings(channelNickname, mode);

  const [streamName, setStreamName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [language, setLanguage] = useState('ru');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [liveDuration, setLiveDuration] = useState('');
  const ingest = useStreamIngest(mode === 'own');
  const { showAlert } = useHeaderModal();
  const wasBlockedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (mode !== 'own') return;
    // Skip first load — banner is enough; toast only when ban appears while already on dashboard.
    if (wasBlockedRef.current === null) {
      wasBlockedRef.current = ingest.streamingBlocked;
      return;
    }
    if (ingest.streamingBlocked && !wasBlockedRef.current) {
      const reason = ingest.blockReason ? ` Причина: ${ingest.blockReason}` : '';
      const type = ingest.blockType ? sanctionTypeLabel(ingest.blockType) : 'Бан стрима';
      showAlert(`Эфир запрещён.${reason}`, 'warning', type, '/settings/support?panel=sanctions');
    }
    wasBlockedRef.current = ingest.streamingBlocked;
  }, [mode, ingest.streamingBlocked, ingest.blockReason, ingest.blockType, showAlert]);

  useEffect(() => {
    if (!settings) return;
    setStreamName(settings.streamName);
    setCategoryId(settings.categoryId ?? '');
    setLanguage(settings.language || 'ru');
    setTags(settings.tags);
  }, [settings]);

  useEffect(() => {
    if (!settings?.isLive || !settings.startedAt) {
      setLiveDuration('');
      return;
    }

    const update = () => setLiveDuration(formatLiveDuration(settings.startedAt!));
    update();
    const timer = window.setInterval(update, 30000);
    return () => window.clearInterval(timer);
  }, [settings?.isLive, settings?.startedAt]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    if (previewFile) {
      const previewResult = await uploadPreview(previewFile);
      if (!previewResult.success) {
        showAlert(previewResult.message || 'Не удалось загрузить превью', 'error');
        return;
      }
      setPreviewFile(null);
    }

    const ok = await saveSettings({
      streamName: streamName.trim(),
      categoryId: categoryId === '' ? null : Number(categoryId),
      language,
      tags,
    });

    showAlert(ok ? 'Настройки эфира сохранены' : 'Не удалось сохранить настройки эфира', ok ? 'success' : 'error');
  };

  const addTag = () => {
    const slug = newTag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!slug || tags.includes(slug)) return;
    setTags((prev) => [...prev, slug]);
    setNewTag('');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} sx={{ color: '#8e7bff' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <StyledDashboardSectionTitle>Настройки эфира</StyledDashboardSectionTitle>
        <Typography sx={{ color: '#ff8a8a', fontSize: 14 }}>{error}</Typography>
      </Box>
    );
  }

  if (!canManageStream) {
    return (
      <Box>
        <StyledDashboardSectionTitle>Настройки эфира</StyledDashboardSectionTitle>
        <StyledDashboardSectionHint>Недостаточно прав для управления эфиром.</StyledDashboardSectionHint>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {mode === 'own' && (
        <DashboardStreamingBanBanner
          blocked={ingest.streamingBlocked}
          type={ingest.blockType}
          reason={ingest.blockReason}
          expiresAt={ingest.blockExpiresAt}
          message={ingest.blockMessage}
        />
      )}

      {mode === 'own' && (
        <DashboardIngestPanel
          streamKey={ingest.streamKey}
          rtmpUrl={ingest.rtmpUrl}
          showKey={ingest.showKey}
          setShowKey={ingest.setShowKey}
          isError={ingest.isError}
          isLoading={ingest.isLoading}
          streamingBlocked={ingest.streamingBlocked}
          regenerateKey={ingest.regenerateKey}
        />
      )}

      <Box>
        <StyledDashboardSectionTitle>Настройки эфира</StyledDashboardSectionTitle>
        {mode !== 'own' && (
          <StyledDashboardSectionHint>Ключ трансляции есть только у владельца канала.</StyledDashboardSectionHint>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5, alignItems: 'center' }}>
          <Chip
            icon={
              settings?.isLive ? (
                <LiveTvOutlinedIcon sx={{ fontSize: '16px !important' }} />
              ) : (
                <OfflineBoltOutlinedIcon sx={{ fontSize: '16px !important' }} />
              )
            }
            label={settings?.isLive ? 'Сейчас в эфире' : 'Оффлайн'}
            size="small"
            sx={{
              bgcolor: settings?.isLive ? 'rgba(255,68,68,0.15)' : 'rgba(255,255,255,0.06)',
              color: settings?.isLive ? '#ff6b6b' : 'rgba(255,255,255,0.65)',
              border: settings?.isLive ? '1px solid rgba(255,68,68,0.35)' : '1px solid rgba(255,255,255,0.12)',
            }}
          />
          <Chip
            icon={<PeopleOutlineIcon sx={{ fontSize: '16px !important' }} />}
            label={`${settings?.subscriberCount ?? 0} подписчиков`}
            size="small"
            sx={{
              bgcolor: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          />
          {settings?.isLive && settings.startedAt && (
            <Chip
              icon={<AccessTimeIcon sx={{ fontSize: '16px !important' }} />}
              label={`В эфире: ${liveDuration}`}
              size="small"
              sx={{
                bgcolor: 'rgba(142,123,255,0.12)',
                color: '#cfc5ff',
                border: '1px solid rgba(142,123,255,0.25)',
              }}
            />
          )}
        </Box>
      </Box>

      <Box sx={{ ...panelSx, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <DashboardStreamPreviewField
          currentUrl={settings?.previewUrl}
          value={previewFile}
          onChange={(file) => {
            setPreviewFile(file);
            setPreviewError(null);
          }}
          onError={setPreviewError}
          disabled={isSaving}
        />
        {previewError && <Typography sx={{ fontSize: 12, color: '#ff8a8a', mt: -1 }}>{previewError}</Typography>}

        <TextField
          label="Название стрима"
          fullWidth
          value={streamName}
          onChange={(e) => setStreamName(e.target.value)}
          sx={fieldSx}
        />

        <TextField
          select
          label="Категория"
          fullWidth
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
          sx={fieldSx}
        >
          <MenuItem value="">Не выбрана</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              {category.name}
            </MenuItem>
          ))}
        </TextField>

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', mb: 1 }}>Теги</Typography>
          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', mb: 1 }}>
            Появятся на странице стрима
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                onDelete={() => setTags((prev) => prev.filter((item) => item !== tag))}
                sx={{ bgcolor: 'rgba(142,123,255,0.15)', color: '#ddd' }}
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Новый тег"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              sx={{ ...fieldSx, flex: '1 1 160px', minWidth: 0 }}
            />
            <Button type="button" variant="outlined" onClick={addTag} sx={{ textTransform: 'none', color: '#fff' }}>
              Добавить
            </Button>
          </Box>
        </Box>

        <TextField
          select
          label="Язык эфира"
          fullWidth
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          sx={fieldSx}
        >
          {STREAM_LANGUAGE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box>
        <Button
          type="submit"
          variant="contained"
          disabled={isSaving}
          sx={{ textTransform: 'none', bgcolor: '#6d5dfb', '&:hover': { bgcolor: '#8e7bff' } }}
        >
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </Box>
    </Box>
  );
};
