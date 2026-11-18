import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Chip, CircularProgress, MenuItem, TextField, Typography } from '@mui/material';
import { PlatformReport, fetchStaffReports, updateStaffReport } from '../../../api/reportsApi';
import {
  SANCTION_DURATION_OPTIONS,
  SANCTION_TYPE_OPTIONS,
  STAFF_STALE_HOURS,
  isStaffQueueStale,
} from '../../../api/staffApi';
import { StyledDashboardSectionHint, StyledDashboardSectionTitle } from '../../dashboardPage/StyledDashboardPage';

const OPEN_STATUSES = ['new', 'in_progress'];
const DEFAULT_SANCTION_TYPE = 'chat_mute';
const DEFAULT_SANCTION_DURATION: number | null = 60;

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

const STATUS_FILTERS = [
  { value: 'open', label: 'Открытые' },
  { value: 'resolved', label: 'Закрыты (наказали)' },
  { value: 'rejected', label: 'Отклонены (нарушения нет)' },
  { value: '', label: 'Все' },
];

const statusColor = (status: string) => {
  if (status === 'new') return '#ffb74d';
  if (status === 'in_progress') return '#8e7bff';
  if (status === 'resolved') return '#6fff79';
  return 'rgba(255,255,255,0.45)';
};

const statusLabelRu = (status: string) => {
  const map: Record<string, string> = {
    new: 'Новая',
    in_progress: 'В работе',
    resolved: 'Закрыта',
    rejected: 'Отклонена',
  };
  return map[status] || status;
};

const reasonLabel = (reason: string) => {
  const map: Record<string, string> = {
    child_safety: 'Жестокое обращение с детьми',
    terrorism: 'Терроризм',
    violence: 'Насилие или чрезмерная жестокость',
    sexual: 'Нагота или сексуальный контент',
    self_harm: 'Самоповреждение или опасные действия',
    harassment: 'Травля или притеснение',
    hate: 'Разжигание ненависти',
    spam: 'Спам, мошенничество или боты',
    wrong_category: 'Неверная категория контента',
    other: 'Другое',
    illegal: 'Угрозы или запрещённый контент',
  };
  return map[reason] ?? reason;
};

const reportsCountLabel = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} жалоба`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} жалобы`;
  return `${n} жалоб`;
};

const sanctionActionLabel = (type: string, minutes: number | null) => {
  const typeLabel = SANCTION_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;
  if (type === 'warning') return typeLabel;
  const duration = SANCTION_DURATION_OPTIONS.find((o) => o.value === minutes)?.label;
  return duration ? `${typeLabel} · ${duration}` : typeLabel;
};

export const StaffReportsSection = () => {
  const [status, setStatus] = useState('open');
  const [reports, setReports] = useState<PlatformReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [sanctionTypes, setSanctionTypes] = useState<Record<number, string>>({});
  const [sanctionDurations, setSanctionDurations] = useState<Record<number, number | null>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await fetchStaffReports(status, 100);
    setIsLoading(false);
    if (!result.success) {
      setError(result.message);
      setReports([]);
      return;
    }
    setReports(result.reports);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const getSanctionType = (reportId: number) => sanctionTypes[reportId] || DEFAULT_SANCTION_TYPE;
  const getSanctionDuration = (reportId: number) =>
    sanctionDurations[reportId] === undefined ? DEFAULT_SANCTION_DURATION : sanctionDurations[reportId];

  const runUpdate = async (id: number, payload: Parameters<typeof updateStaffReport>[1]) => {
    setBusyId(id);
    setActionError(null);
    const result = await updateStaffReport(id, payload);
    setBusyId(null);
    if (!result.success) {
      setActionError(result.message);
      return;
    }
    await load();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} sx={{ color: '#8e7bff' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <StyledDashboardSectionTitle>Жалобы с сайта</StyledDashboardSectionTitle>
        <StyledDashboardSectionHint>
          Жалобы с кнопки «Пожаловаться». Открытые — в одном списке; исполнитель ставится при наказании или отклонении.
          Открытые дольше {STAFF_STALE_HOURS}ч подсвечены.
        </StyledDashboardSectionHint>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {STATUS_FILTERS.map((item) => (
          <Chip
            key={item.value || 'all'}
            label={item.label}
            onClick={() => setStatus(item.value)}
            size="small"
            sx={{
              bgcolor: status === item.value ? 'rgba(142,123,255,0.25)' : 'rgba(255,255,255,0.06)',
              color: '#fff',
              border: status === item.value ? '1px solid rgba(142,123,255,0.45)' : '1px solid rgba(255,255,255,0.12)',
            }}
          />
        ))}
      </Box>

      {error && <Typography sx={{ color: '#ff8a8a', fontSize: 14 }}>{error}</Typography>}
      {actionError && <Typography sx={{ color: '#ff8a8a', fontSize: 14 }}>{actionError}</Typography>}

      {reports.length === 0 ? (
        <Box sx={panelSx}>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Жалоб пока нет</Typography>
        </Box>
      ) : (
        reports.map((report) => {
          const stale = isStaffQueueStale(report.updatedAt || report.createdAt, report.status, OPEN_STATUSES);
          const sanctionType = getSanctionType(report.id);
          const sanctionMinutes = getSanctionDuration(report.id);
          const needsDuration = sanctionType !== 'warning';
          return (
            <Box
              key={report.id}
              sx={{
                ...panelSx,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
                borderColor: stale ? 'rgba(255,167,38,0.55)' : 'rgba(255,255,255,0.08)',
                bgcolor: stale ? 'rgba(255,167,38,0.06)' : panelSx.bgcolor,
              }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Chip
                  label={statusLabelRu(report.status)}
                  size="small"
                  sx={{ bgcolor: 'rgba(0,0,0,0.25)', color: statusColor(report.status) }}
                />
                <Chip
                  label={reasonLabel(report.reason)}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)' }}
                />
                <Chip
                  label={reportsCountLabel(report.reporterCount || 1)}
                  size="small"
                  sx={{
                    bgcolor: report.reporterCount > 1 ? 'rgba(142,123,255,0.22)' : 'rgba(255,255,255,0.06)',
                    color: report.reporterCount > 1 ? '#cfc5ff' : 'rgba(255,255,255,0.7)',
                  }}
                />
                {stale && (
                  <Chip
                    label="Давно без ответа"
                    size="small"
                    sx={{ bgcolor: 'rgba(255,167,38,0.2)', color: '#ffb74d' }}
                  />
                )}
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  кейс #{report.id} · {new Date(report.createdAt).toLocaleString()}
                </Typography>
              </Box>

              <Typography sx={{ fontSize: 14, color: '#fff' }}>
                {report.targetType === 'message'
                  ? 'Сообщение'
                  : report.targetType === 'stream'
                    ? 'Стрим'
                    : report.targetType === 'channel'
                      ? 'Профиль / канал'
                      : 'Пользователь'}
                :{' '}
                <Box component="span" sx={{ color: '#cfc5ff' }}>
                  {report.targetNickname || report.targetUserId || '—'}
                </Box>
                {report.streamerNickname ? ` · канал ${report.streamerNickname}` : ''}
                {report.streamId ? ` · stream #${report.streamId}` : ''}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Кто отправил:</Typography>
                {(report.reporters.length > 0
                  ? report.reporters
                  : [
                      {
                        id: 0,
                        reporterUserId: report.reporterUserId,
                        reporterNickname: report.reporterNickname,
                        details: report.details,
                        createdAt: report.createdAt,
                      },
                    ]
                ).map((reporter) => (
                  <Box
                    key={`${report.id}-${reporter.id || reporter.reporterUserId}`}
                    sx={{
                      pl: 1.25,
                      borderLeft: '2px solid rgba(142,123,255,0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.25,
                    }}
                  >
                    <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                      {reporter.reporterNickname || reporter.reporterUserId}
                      <Box component="span" sx={{ color: 'rgba(255,255,255,0.35)', ml: 1, fontSize: 12 }}>
                        {reporter.createdAt ? new Date(reporter.createdAt).toLocaleString() : ''}
                      </Box>
                    </Typography>
                    {reporter.details && (
                      <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{reporter.details}</Typography>
                    )}
                  </Box>
                ))}
              </Box>

              {report.messageSnapshot && (
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 1,
                    bgcolor: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.85)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {report.messageSnapshot}
                </Box>
              )}

              {report.linkedSanctionId && (
                <Typography sx={{ fontSize: 12, color: '#6fff79' }}>
                  Связанная санкция #{report.linkedSanctionId}
                </Typography>
              )}

              {(report.status === 'new' || report.status === 'in_progress') && (
                <>
                  <TextField
                    size="small"
                    label="Комментарий к решению"
                    value={notes[report.id] || ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [report.id]: e.target.value.slice(0, 500) }))}
                    sx={fieldSx}
                    fullWidth
                  />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                    <TextField
                      select
                      size="small"
                      label="Наказание"
                      value={sanctionType}
                      onChange={(e) => setSanctionTypes((prev) => ({ ...prev, [report.id]: e.target.value }))}
                      disabled={!report.targetUserId}
                      sx={{ ...fieldSx, minWidth: 220 }}
                    >
                      {SANCTION_TYPE_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label} — {opt.hint}
                        </MenuItem>
                      ))}
                    </TextField>
                    {needsDuration && (
                      <TextField
                        select
                        size="small"
                        label="На сколько"
                        value={sanctionMinutes === null ? 'perm' : String(sanctionMinutes)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSanctionDurations((prev) => ({
                            ...prev,
                            [report.id]: v === 'perm' ? null : Number(v),
                          }));
                        }}
                        disabled={!report.targetUserId}
                        sx={{ ...fieldSx, minWidth: 140 }}
                      >
                        {SANCTION_DURATION_OPTIONS.map((opt) => (
                          <MenuItem key={String(opt.value)} value={opt.value === null ? 'perm' : String(opt.value)}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                    <Button
                      size="small"
                      disabled={busyId === report.id || !report.targetUserId}
                      onClick={() =>
                        runUpdate(report.id, {
                          status: 'resolved',
                          resolutionNote: notes[report.id] || sanctionActionLabel(sanctionType, sanctionMinutes),
                          assignToMe: true,
                          sanction: report.targetUserId
                            ? {
                                targetUserId: report.targetUserId,
                                type: sanctionType,
                                reason:
                                  notes[report.id] ||
                                  `${sanctionActionLabel(sanctionType, sanctionMinutes)} по жалобе #${report.id}`,
                                durationMinutes: needsDuration ? sanctionMinutes : null,
                              }
                            : undefined,
                        })
                      }
                      variant="contained"
                      sx={{ textTransform: 'none', bgcolor: '#6d5dfb', '&:hover': { bgcolor: '#8e7bff' } }}
                    >
                      {report.targetUserId
                        ? `Выдать: ${sanctionActionLabel(sanctionType, sanctionMinutes)}`
                        : 'Нет цели для наказания'}
                    </Button>
                    <Button
                      size="small"
                      disabled={busyId === report.id}
                      onClick={() =>
                        runUpdate(report.id, {
                          status: 'rejected',
                          resolutionNote: notes[report.id] || 'Отклонено',
                          assignToMe: true,
                        })
                      }
                      sx={{ textTransform: 'none', color: '#ff8a8a' }}
                    >
                      Нарушения нет
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          );
        })
      )}
    </Box>
  );
};
