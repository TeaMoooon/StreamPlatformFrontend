import { useMemo, useState } from 'react';
import * as Yup from 'yup';
import { FieldArrayRenderProps, useFormikContext } from 'formik';
import { Box, Button, Chip, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import AddLinkOutlinedIcon from '@mui/icons-material/AddLinkOutlined';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useSettingsNotice } from '../../context/SettingsNoticeContext';
import { ISocialLink } from '../../../../types/share';
import {
  resolvePlatformId,
  getPlatformDef,
  getPlatformLabel,
  isKnownPlatform,
  MAX_SOCIAL_LINKS,
  SOCIAL_PLATFORMS,
  SocialPlatformIcon,
  SocialPlatformId,
} from '../../../../constants/socialPlatforms';
import { Socials } from '../../../../components/socials/Socials';
import {
  settingsFieldSx,
  settingsOutlinedButtonSx,
  settingsPanelSx,
  settingsPrimaryButtonSx,
} from '../../settings.styles';

interface SocialLinksEditorProps {
  arrayHelpers: FieldArrayRenderProps;
}

const linkCardSx = {
  p: 1.5,
  borderRadius: 1.5,
  border: '1px solid rgba(255,255,255,0.1)',
  bgcolor: 'rgba(255,255,255,0.02)',
};

/** 6 / 10 колонок → последний неполный ряд растягивается на всю ширину */
const PICKER_GRID = {
  xs: { columns: 3, fractions: 6 },
  sm: { columns: 5, fractions: 10 },
} as const;

const getPickerGridSpan = (index: number, total: number, columns: number, fractions: number) => {
  const remainder = total % columns;
  if (remainder === 0) return fractions / columns;
  const lastRowStart = total - remainder;
  if (index >= lastRowStart) return fractions / remainder;
  return fractions / columns;
};

const pickerTileSx = (active: boolean, disabled: boolean): Record<string, unknown> => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0.75,
  p: 1.25,
  minHeight: 72,
  width: '100%',
  borderRadius: 1.5,
  border: `1px solid ${active ? 'rgba(142,123,255,0.55)' : 'rgba(255,255,255,0.1)'}`,
  bgcolor: active ? 'rgba(142,123,255,0.16)' : 'rgba(255,255,255,0.03)',
  color: disabled ? 'rgba(255,255,255,0.25)' : '#fff',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.45 : 1,
  transition: 'border-color 0.15s, background 0.15s',
  '&:hover': disabled
    ? undefined
    : {
        borderColor: 'rgba(142,123,255,0.45)',
        bgcolor: active ? 'rgba(142,123,255,0.2)' : 'rgba(255,255,255,0.06)',
      },
});

const validateUrl = async (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return 'Введите ссылку';
  try {
    await Yup.string().url('Некорректная ссылка').validate(trimmed);
    return null;
  } catch (err: any) {
    return err.message as string;
  }
};

export const SocialLinksEditor = ({ arrayHelpers }: SocialLinksEditorProps) => {
  const { showNotice } = useSettingsNotice();
  const { values } = useFormikContext<{ socialLinks: ISocialLink[] }>();
  const { push, remove, replace, move } = arrayHelpers;
  const socialLinks = values.socialLinks || [];

  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatformId | 'custom' | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingUrl, setEditingUrl] = useState('');
  const [editingLabel, setEditingLabel] = useState('');
  const [editingUrlError, setEditingUrlError] = useState<string | null>(null);

  const usedPlatformIds = useMemo(
    () =>
      new Set(
        socialLinks.map((link) => (isKnownPlatform(link.platform) ? link.platform : null)).filter(Boolean) as string[]
      ),
    [socialLinks]
  );

  const selectedDef = selectedPlatform && selectedPlatform !== 'custom' ? getPlatformDef(selectedPlatform) : null;
  const atLimit = socialLinks.length >= MAX_SOCIAL_LINKS;
  const pickerTotal = SOCIAL_PLATFORMS.length + 1;

  const pickerGridColumnSx = (index: number) => ({
    gridColumn: {
      xs: `span ${getPickerGridSpan(index, pickerTotal, PICKER_GRID.xs.columns, PICKER_GRID.xs.fractions)}`,
      sm: `span ${getPickerGridSpan(index, pickerTotal, PICKER_GRID.sm.columns, PICKER_GRID.sm.fractions)}`,
    },
  });

  const resetComposer = () => {
    setSelectedPlatform(null);
    setCustomLabel('');
    setUrl('');
    setUrlError(null);
  };

  const handleAdd = async () => {
    if (atLimit) {
      showNotice(`Максимум ${MAX_SOCIAL_LINKS} ссылок`, 'warning');
      return;
    }

    if (!selectedPlatform) {
      showNotice('Выберите платформу', 'warning');
      return;
    }

    const trimmedUrl = url.trim();
    const err = await validateUrl(trimmedUrl);
    if (err) {
      setUrlError(err);
      return;
    }

    let platformKey: string;

    if (selectedPlatform === 'custom') {
      const label = customLabel.trim().slice(0, 50);
      if (!label) {
        showNotice('Введите название для своей ссылки', 'warning');
        return;
      }
      if (resolvePlatformId(label)) {
        showNotice('Выберите платформу из списка вместо этого названия', 'warning');
        return;
      }
      platformKey = label;
    } else {
      if (usedPlatformIds.has(selectedPlatform)) {
        showNotice(`${getPlatformLabel(selectedPlatform)} уже добавлен`, 'warning');
        return;
      }
      platformKey = selectedPlatform;
    }

    if (socialLinks.some((link) => link.platform.toLowerCase() === platformKey.toLowerCase())) {
      showNotice('Такая платформа уже добавлена', 'warning');
      return;
    }

    if (socialLinks.some((link) => link.url.trim() === trimmedUrl)) {
      showNotice('Такая ссылка уже есть в списке', 'warning');
      return;
    }

    push({ platform: platformKey, url: trimmedUrl });
    resetComposer();
  };

  const startEdit = (index: number) => {
    const link = socialLinks[index];
    setEditingIndex(index);
    setEditingUrl(link.url);
    setEditingLabel(isKnownPlatform(link.platform) ? getPlatformLabel(link.platform) : link.platform);
    setEditingUrlError(null);
  };

  const saveEdit = async () => {
    if (editingIndex === null) return;

    const err = await validateUrl(editingUrl);
    if (err) {
      setEditingUrlError(err);
      return;
    }

    const current = socialLinks[editingIndex];
    const platform = isKnownPlatform(current.platform)
      ? current.platform
      : editingLabel.trim().slice(0, 50) || current.platform;

    if (socialLinks.some((link, idx) => idx !== editingIndex && link.url.trim() === editingUrl.trim())) {
      showNotice('Такая ссылка уже есть в списке', 'warning');
      return;
    }

    replace(editingIndex, { platform, url: editingUrl.trim() });
    setEditingIndex(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>
          До {MAX_SOCIAL_LINKS} ссылок на странице канала
        </Typography>
        <Chip
          size="small"
          label={`${socialLinks.length} / ${MAX_SOCIAL_LINKS}`}
          sx={{
            bgcolor: 'rgba(142,123,255,0.12)',
            color: '#cfc5ff',
            border: '1px solid rgba(142,123,255,0.25)',
            fontWeight: 700,
          }}
        />
      </Box>

      {!atLimit && (
        <Box sx={{ ...settingsPanelSx, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
            1. Выберите платформу
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: `repeat(${PICKER_GRID.xs.fractions}, 1fr)`,
                sm: `repeat(${PICKER_GRID.sm.fractions}, 1fr)`,
              },
              gap: 1,
            }}
          >
            {SOCIAL_PLATFORMS.map((platform, index) => {
              const taken = usedPlatformIds.has(platform.id);
              const active = selectedPlatform === platform.id;

              return (
                <Box key={platform.id} sx={pickerGridColumnSx(index)}>
                  <Tooltip title={taken ? `${platform.label} уже добавлен` : platform.label}>
                    <Box
                      component="button"
                      type="button"
                      disabled={taken}
                      onClick={() => {
                        setSelectedPlatform(platform.id);
                        setUrlError(null);
                      }}
                      sx={pickerTileSx(active, taken)}
                    >
                      <SocialPlatformIcon platform={platform.id} fontSize={22} />
                      <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2, textAlign: 'center' }}>
                        {platform.label}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
              );
            })}
            <Box sx={pickerGridColumnSx(SOCIAL_PLATFORMS.length)}>
              <Tooltip title="Своя ссылка с любым названием">
                <Box
                  component="button"
                  type="button"
                  onClick={() => {
                    setSelectedPlatform('custom');
                    setUrlError(null);
                  }}
                  sx={pickerTileSx(selectedPlatform === 'custom', false)}
                >
                  <SocialPlatformIcon platform="custom" fontSize={22} />
                  <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2, textAlign: 'center' }}>
                    Другое
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
          </Box>

          {selectedPlatform === 'custom' && (
            <>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                2. Название и ссылка
              </Typography>
              <TextField
                fullWidth
                label="Название"
                placeholder="Сайт, Boosty, DonationAlerts..."
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                sx={settingsFieldSx}
              />
              <TextField
                fullWidth
                placeholder="https://..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                onBlur={async () => {
                  if (url.trim()) setUrlError(await validateUrl(url));
                }}
                error={Boolean(urlError)}
                helperText={urlError}
                sx={settingsFieldSx}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<AddLinkOutlinedIcon />}
                  disabled={!customLabel.trim() || !url.trim() || Boolean(urlError)}
                  onClick={handleAdd}
                  sx={settingsPrimaryButtonSx}
                >
                  Добавить ссылку
                </Button>
              </Box>
            </>
          )}

          {selectedDef && (
            <>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                2. Вставьте ссылку
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', mt: -1 }}>
                {selectedDef.urlHint}
              </Typography>
              <TextField
                fullWidth
                placeholder={selectedDef.placeholder}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                onBlur={async () => {
                  if (url.trim()) setUrlError(await validateUrl(url));
                }}
                error={Boolean(urlError)}
                helperText={urlError}
                sx={settingsFieldSx}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<AddLinkOutlinedIcon />}
                  disabled={!url.trim() || Boolean(urlError)}
                  onClick={handleAdd}
                  sx={settingsPrimaryButtonSx}
                >
                  Добавить {selectedDef.label}
                </Button>
              </Box>
            </>
          )}
        </Box>
      )}

      {socialLinks.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>Ваши ссылки</Typography>

          {socialLinks.map((link, index) =>
            editingIndex === index ? (
              <Box
                key={`edit-${link.platform}-${index}`}
                sx={{ ...linkCardSx, display: 'flex', flexDirection: 'column', gap: 1 }}
              >
                {!isKnownPlatform(link.platform) && (
                  <TextField
                    label="Название"
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    sx={settingsFieldSx}
                    fullWidth
                  />
                )}
                <TextField
                  label="URL"
                  value={editingUrl}
                  onChange={(e) => {
                    setEditingUrl(e.target.value);
                    if (editingUrlError) setEditingUrlError(null);
                  }}
                  onBlur={async () => {
                    if (editingUrl.trim()) setEditingUrlError(await validateUrl(editingUrl));
                  }}
                  error={Boolean(editingUrlError)}
                  helperText={editingUrlError}
                  sx={settingsFieldSx}
                  fullWidth
                />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button variant="outlined" onClick={() => setEditingIndex(null)} sx={settingsOutlinedButtonSx}>
                    Отмена
                  </Button>
                  <Button variant="contained" onClick={saveEdit} sx={settingsPrimaryButtonSx}>
                    Готово
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box
                key={`${link.platform}-${index}`}
                sx={{ ...linkCardSx, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(142,123,255,0.12)',
                      border: '1px solid rgba(142,123,255,0.25)',
                      flexShrink: 0,
                    }}
                  >
                    <SocialPlatformIcon platform={link.platform} fontSize={20} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                      {getPlatformLabel(link.platform)}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.45)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {link.url}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <IconButton size="small" disabled={index === 0} onClick={() => move(index, index - 1)}>
                    <ArrowUpwardIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.55)' }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={index === socialLinks.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    <ArrowDownwardIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.55)' }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => startEdit(index)}>
                    <EditOutlinedIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.65)' }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => remove(index)}>
                    <DeleteOutlineIcon sx={{ fontSize: 16, color: 'rgba(255,120,120,0.85)' }} />
                  </IconButton>
                </Box>
              </Box>
            )
          )}
        </Box>
      )}

      <Box sx={{ ...settingsPanelSx, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <VisibilityOutlinedIcon sx={{ color: 'rgba(142,123,255,0.75)', fontSize: 18 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>На канале</Typography>
        </Box>
        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>
          Так ссылки будут выглядеть в шапке профиля. Нажмите «Сохранить» внизу страницы, чтобы применить.
        </Typography>
        {socialLinks.length > 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Socials socials={socialLinks} />
          </Box>
        ) : (
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
            Пока нет ссылок — добавьте первую выше
          </Typography>
        )}
      </Box>
    </Box>
  );
};
