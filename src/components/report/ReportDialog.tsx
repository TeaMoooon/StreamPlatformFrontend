import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import LiveTvOutlinedIcon from '@mui/icons-material/LiveTvOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { CreateReportPayload, ReportReason, ReportTargetType, createPlatformReport } from '../../api/reportsApi';
import {
  ReportCategory,
  ReportSuboption,
  ReportWizardStep,
  getCategoriesForTarget,
  reportReasonLabel,
} from './reportFlow';

export type ReportLiveStreamInfo = {
  streamId: number;
  streamName?: string | null;
};

type ReportDialogProps = {
  open: boolean;
  /** Dialog heading; for live channel reports may be overridden after target pick */
  title: string;
  subtitle?: string;
  payload: Omit<CreateReportPayload, 'reason' | 'details'>;
  /**
   * When set (viewer is watching a live channel), first step asks:
   * report the stream vs the profile — each with its own categories.
   */
  liveStream?: ReportLiveStreamInfo | null;
  onClose: () => void;
  onSubmitted?: () => void;
};

const ACCENT = '#8b5cf6';
const ACCENT_SOFT = 'rgba(139, 92, 246, 0.16)';
const DANGER = '#f07178';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    bgcolor: 'rgba(255,255,255,0.04)',
    borderRadius: 2,
    '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
    '&.Mui-focused fieldset': { borderColor: ACCENT },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.55)' },
  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.35)' },
};

const optionSx = (selected = false) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 1.25,
  width: '100%',
  textAlign: 'left' as const,
  px: 1.5,
  py: 1.35,
  borderRadius: 2,
  border: '1px solid',
  borderColor: selected ? ACCENT : 'rgba(255,255,255,0.08)',
  bgcolor: selected ? ACCENT_SOFT : 'rgba(255,255,255,0.03)',
  color: '#fff',
  cursor: 'pointer',
  transition: 'border-color 0.15s ease, background-color 0.15s ease',
  '&:hover': {
    borderColor: selected ? ACCENT : 'rgba(255,255,255,0.22)',
    bgcolor: selected ? ACCENT_SOFT : 'rgba(255,255,255,0.06)',
  },
});

type TargetKind = 'stream' | 'channel';

export const ReportDialog = ({
  open,
  title,
  subtitle,
  payload,
  liveStream = null,
  onClose,
  onSubmitted,
}: ReportDialogProps) => {
  const canPickTarget =
    Boolean(liveStream?.streamId) &&
    (payload.targetType === 'channel' || payload.targetType === 'user' || payload.targetType === 'stream');

  const initialStep: ReportWizardStep = canPickTarget ? 'target' : 'category';

  const [step, setStep] = useState<ReportWizardStep>(initialStep);
  const [targetKind, setTargetKind] = useState<TargetKind | null>(canPickTarget ? null : 'channel');
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [suboption, setSuboption] = useState<ReportSuboption | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(canPickTarget ? 'target' : 'category');
    setTargetKind(canPickTarget ? null : null);
    setCategory(null);
    setSuboption(null);
    setDetails('');
    setError(null);
    setIsSubmitting(false);
  }, [open, canPickTarget]);

  const effectiveTargetType: ReportTargetType = useMemo(() => {
    if (payload.targetType === 'message') return 'message';
    if (canPickTarget && targetKind === 'stream') return 'stream';
    if (payload.targetType === 'stream' && !canPickTarget) return 'stream';
    return payload.targetType === 'user' ? 'user' : 'channel';
  }, [canPickTarget, payload.targetType, targetKind]);

  const categories = useMemo(() => getCategoriesForTarget(effectiveTargetType), [effectiveTargetType]);

  const effectivePayload = useMemo((): Omit<CreateReportPayload, 'reason' | 'details'> => {
    if (payload.targetType === 'message') return payload;

    if (canPickTarget && targetKind === 'stream' && liveStream) {
      return {
        targetType: 'stream',
        targetUserId: payload.targetUserId,
        streamerId: payload.streamerId ?? payload.targetUserId,
        streamId: liveStream.streamId,
      };
    }

    return {
      targetType: payload.targetType === 'stream' ? 'channel' : payload.targetType,
      targetUserId: payload.targetUserId,
      streamerId: payload.streamerId ?? payload.targetUserId,
    };
  }, [canPickTarget, liveStream, payload, targetKind]);

  const dialogTitle = useMemo(() => {
    if (step === 'target') return 'Пожаловаться';
    if (effectiveTargetType === 'stream') return 'Пожаловаться на стрим';
    if (effectiveTargetType === 'message') return title;
    if (canPickTarget && targetKind === 'channel') return 'Пожаловаться на профиль';
    return title;
  }, [canPickTarget, effectiveTargetType, step, targetKind, title]);

  const contextLines = useMemo(() => {
    const lines: { label: string; value: string }[] = [];
    if (effectiveTargetType === 'message' && payload.messageSnapshot) {
      lines.push({ label: 'Сообщение', value: payload.messageSnapshot.slice(0, 220) });
      if (subtitle) lines.push({ label: 'Автор', value: subtitle });
      return lines;
    }
    if (subtitle) {
      lines.push({
        label: effectiveTargetType === 'stream' ? 'Канал' : 'Профиль',
        value: subtitle,
      });
    }
    if (effectiveTargetType === 'stream' && liveStream?.streamName) {
      lines.push({ label: 'Эфир', value: liveStream.streamName });
    }
    return lines;
  }, [effectiveTargetType, liveStream?.streamName, payload.messageSnapshot, subtitle]);

  const hasSuboptions = Boolean(category?.suboptions?.length);
  const stepTotal = (canPickTarget ? 1 : 0) + 1 + (hasSuboptions ? 1 : 0) + 1;
  const stepIndex =
    step === 'target'
      ? 1
      : step === 'category'
        ? canPickTarget
          ? 2
          : 1
        : step === 'suboption'
          ? canPickTarget
            ? 3
            : 2
          : step === 'details'
            ? stepTotal
            : stepTotal;

  const resetAndClose = () => onClose();

  const goBack = () => {
    setError(null);
    if (step === 'details') {
      if (category?.suboptions?.length) {
        setStep('suboption');
        return;
      }
      setCategory(null);
      setStep('category');
      return;
    }
    if (step === 'suboption') {
      setSuboption(null);
      setCategory(null);
      setStep('category');
      return;
    }
    if (step === 'category' && canPickTarget) {
      setCategory(null);
      setTargetKind(null);
      setStep('target');
    }
  };

  const selectTarget = (kind: TargetKind) => {
    setTargetKind(kind);
    setCategory(null);
    setSuboption(null);
    setDetails('');
    setError(null);
    setStep('category');
  };

  const selectCategory = (next: ReportCategory) => {
    setCategory(next);
    setSuboption(null);
    setError(null);
    if (next.suboptions?.length) {
      setStep('suboption');
      return;
    }
    setStep('details');
  };

  const selectSuboption = (next: ReportSuboption) => {
    setSuboption(next);
    setError(null);
    setStep('details');
  };

  const buildDetails = () => {
    const note = details.trim();
    const prefix = suboption ? `[${suboption.title}]` : '';
    if (prefix && note) return `${prefix} ${note}`.slice(0, 500);
    if (prefix) return prefix.slice(0, 500);
    return note || undefined;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!category) return;
    if (canPickTarget && !targetKind) {
      setError('Выберите, на что жалуетесь');
      return;
    }

    if (category.reason === 'other' && !details.trim()) {
      setError('Для пункта «Другое» опишите, что произошло');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await createPlatformReport({
      ...effectivePayload,
      reason: category.reason as ReportReason,
      details: buildDetails(),
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message || 'Не удалось отправить жалобу');
      return;
    }

    setStep('done');
    onSubmitted?.();
  };

  const showBack = step !== 'target' && step !== 'done' && !(step === 'category' && !canPickTarget);

  return (
    <Dialog
      open={open}
      onClose={resetAndClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          bgcolor: '#12101c',
          backgroundImage: 'linear-gradient(180deg, rgba(139,92,246,0.08) 0%, transparent 42%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
          color: '#fff',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          pb: 1,
          fontWeight: 700,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, minWidth: 0 }}>
          {showBack ? (
            <IconButton
              aria-label="Назад"
              onClick={goBack}
              size="small"
              sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.15 }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          ) : (
            <Box
              sx={{
                mt: 0.2,
                width: 32,
                height: 32,
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                bgcolor: ACCENT_SOFT,
                color: ACCENT,
                flexShrink: 0,
              }}
            >
              <FlagOutlinedIcon sx={{ fontSize: 18 }} />
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 18, lineHeight: 1.3 }}>{dialogTitle}</Typography>
            {step !== 'done' && (
              <Typography sx={{ mt: 0.35, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                Шаг {Math.min(stepIndex, stepTotal)} из {stepTotal}
                {category ? ` · ${reportReasonLabel(category.reason)}` : ''}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton aria-label="Закрыть" onClick={resetAndClose} size="small" sx={{ color: 'rgba(255,255,255,0.55)' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, pt: 0.5 }}>
          {contextLines.length > 0 && step !== 'done' && step !== 'target' && (
            <Box
              sx={{
                px: 1.5,
                py: 1.25,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {contextLines.map((line) => (
                <Box key={line.label} sx={{ '& + &': { mt: 1 } }}>
                  <Typography sx={{ fontSize: 11, letterSpacing: 0.4, color: 'rgba(255,255,255,0.4)', mb: 0.35 }}>
                    {line.label.toUpperCase()}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.82)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {line.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {step === 'target' && (
            <>
              <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.62)' }}>
                На что жалуетесь? От этого зависят причины и то, что увидит модерация.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box component="button" type="button" onClick={() => selectTarget('stream')} sx={optionSx(false)}>
                  <LiveTvOutlinedIcon sx={{ color: ACCENT, mt: 0.25 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 14.5 }}>Текущий стрим</Typography>
                    <Typography sx={{ mt: 0.35, fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                      {liveStream?.streamName
                        ? `Проблема в эфире «${liveStream.streamName}»`
                        : 'Проблема в том, что показывают или говорят в эфире'}
                    </Typography>
                  </Box>
                  <ChevronRightIcon sx={{ color: 'rgba(255,255,255,0.35)', mt: 0.35 }} />
                </Box>
                <Box component="button" type="button" onClick={() => selectTarget('channel')} sx={optionSx(false)}>
                  <PersonOutlineIcon sx={{ color: ACCENT, mt: 0.25 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 14.5 }}>Профиль / канал</Typography>
                    <Typography sx={{ mt: 0.35, fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                      Ник, описание, ссылки, самозванство или поведение канала в целом
                    </Typography>
                  </Box>
                  <ChevronRightIcon sx={{ color: 'rgba(255,255,255,0.35)', mt: 0.35 }} />
                </Box>
              </Box>
            </>
          )}

          {step === 'category' && (
            <>
              <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.62)' }}>Выберите причину</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {categories.map((item) => (
                  <Box
                    key={`${effectiveTargetType}-${item.reason}-${item.title}`}
                    component="button"
                    type="button"
                    onClick={() => selectCategory(item)}
                    sx={optionSx()}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 14.5, color: '#fff' }}>{item.title}</Typography>
                      <Typography sx={{ mt: 0.35, fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                        {item.description}
                      </Typography>
                    </Box>
                    <ChevronRightIcon sx={{ color: 'rgba(255,255,255,0.35)', mt: 0.35 }} />
                  </Box>
                ))}
              </Box>
            </>
          )}

          {step === 'suboption' && category?.suboptions && (
            <>
              <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.62)' }}>Уточните нарушение</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {category.suboptions.map((item) => (
                  <Box
                    key={item.id}
                    component="button"
                    type="button"
                    onClick={() => selectSuboption(item)}
                    sx={optionSx(suboption?.id === item.id)}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 14.5 }}>{item.title}</Typography>
                      <Typography sx={{ mt: 0.35, fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                        {item.description}
                      </Typography>
                    </Box>
                    <ChevronRightIcon sx={{ color: 'rgba(255,255,255,0.35)', mt: 0.35 }} />
                  </Box>
                ))}
              </Box>
            </>
          )}

          {step === 'details' && category && (
            <>
              <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.62)' }}>
                {category.reason === 'other'
                  ? 'Кратко опишите, что произошло — это обязательно.'
                  : 'Можно добавить комментарий. Не обязательно, но помогает модерации.'}
              </Typography>
              {suboption && (
                <Typography sx={{ fontSize: 12.5, color: ACCENT }}>Уточнение: {suboption.title}</Typography>
              )}
              <TextField
                label={category.reason === 'other' ? 'Что произошло' : 'Комментарий'}
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                fullWidth
                multiline
                minRows={3}
                maxRows={6}
                autoFocus
                helperText={`${details.length} / 500`}
                FormHelperTextProps={{ sx: { textAlign: 'right' } }}
                sx={fieldSx}
              />
              {error && (
                <Typography sx={{ fontSize: 13, color: DANGER }} role="alert">
                  {error}
                </Typography>
              )}
            </>
          )}

          {step === 'done' && (
            <Box
              sx={{
                py: 2.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 1.25,
              }}
            >
              <CheckCircleOutlineIcon sx={{ fontSize: 44, color: '#6fff79' }} />
              <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Жалоба отправлена</Typography>
              <Typography sx={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', maxWidth: 340, lineHeight: 1.5 }}>
                Ваше обращение принято и будет решено в ближайшее время.
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.25, gap: 1 }}>
          {step === 'done' ? (
            <Button
              onClick={resetAndClose}
              variant="contained"
              fullWidth
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: ACCENT,
                borderRadius: 2,
                py: 1,
                '&:hover': { bgcolor: '#a78bfa' },
              }}
            >
              Готово
            </Button>
          ) : step === 'details' ? (
            <>
              <Button onClick={resetAndClose} sx={{ textTransform: 'none', color: 'rgba(255,255,255,0.65)' }}>
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="contained"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: ACCENT,
                  borderRadius: 2,
                  px: 2.5,
                  '&:hover': { bgcolor: '#a78bfa' },
                }}
              >
                {isSubmitting ? 'Отправка…' : 'Отправить жалобу'}
              </Button>
            </>
          ) : (
            <Button onClick={resetAndClose} sx={{ textTransform: 'none', color: 'rgba(255,255,255,0.65)' }}>
              Отмена
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
};
