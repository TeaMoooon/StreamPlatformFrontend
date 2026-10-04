import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Chip, CircularProgress, MenuItem, TextField, Typography } from '@mui/material';
import { PlatformReport, fetchStaffReports, updateStaffReport } from '../../../api/reportsApi';
import { SANCTION_DURATION_OPTIONS, STAFF_STALE_HOURS, isStaffQueueStale } from '../../../api/staffApi';
import { StyledDashboardSectionHint, StyledDashboardSectionTitle } from '../../dashboardPage/StyledDashboardPage';

const OPEN_STATUSES = ['new', 'in_progress'];

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
  { value: 'new', label: 'Новые' },
  { value: 'in_progress', label: 'В работе' },
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
    spam: 'Спам',
    harassment: 'Оскорбления / травля',
    hate: 'Ненависть',
    illegal: 'Запрещённый контент',
    other: 'Другое',
  };
  return map[reason] || reason;
};

const muteLabel = (minutes: number | null) => {
  const found = SANCTION_DURATION_OPTIONS.find((o) => o.value === minutes);
  return found ? `Запретить чат · ${found.label}` : 'Запретить чат';
};

export const StaffReportsSection = () => {
  const [status, setStatus] = useState('new');
  const [reports, setReports] = useState<PlatformReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [muteDurations, setMuteDurations] = useState<Record<number, number | null>>({});

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

  const getMuteDuration = (reportId: number) => (muteDurations[reportId] === undefined ? 60 : muteDurations[reportId]);

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
          Жалобы с кнопки «Пожаловаться». Бан стрима и полный бан — в разделе «Мут и бан». Открытые дольше{' '}
          {STAFF_STALE_HOURS}ч подсвечены.
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
          const muteMinutes = getMuteDuration(report.id);
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
                {stale && (
                  <Chip
                    label="Давно без ответа"
                    size="small"
                    sx={{ bgcolor: 'rgba(255,167,38,0.2)', color: '#ffb74d' }}
                  />
                )}
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  #{report.id} · {new Date(report.createdAt).toLocaleString()}
                </Typography>
              </Box>

              <Typography sx={{ fontSize: 14, color: '#fff' }}>
                {report.targetType === 'message' ? 'Сообщение' : 'Канал/пользователь'}:{' '}
                <Box component="span" sx={{ color: '#cfc5ff' }}>
                  {report.targetNickname || report.targetUserId || '—'}
                </Box>
                {report.streamerNickname ? ` · канал ${report.streamerNickname}` : ''}
              </Typography>

              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                От: {report.reporterNickname || report.reporterUserId}
              </Typography>

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

              {report.details && (
                <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
                  Комментарий: {report.details}
                </Typography>
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
                    <Button
                      size="small"
                      disabled={busyId === report.id}
                      onClick={() => runUpdate(report.id, { status: 'in_progress', assignToMe: true })}
                      sx={{ textTransform: 'none', color: '#fff' }}
                    >
                      Взять себе
                    </Button>
                    <TextField
                      select
                      size="small"
                      label="На сколько запретить чат"
                      value={muteMinutes === null ? 'perm' : String(muteMinutes)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMuteDurations((prev) => ({
                          ...prev,
                          [report.id]: v === 'perm' ? null : Number(v),
                        }));
                      }}
                      disabled={!report.targetUserId}
                      sx={{ ...fieldSx, minWidth: 180 }}
                    >
                      {SANCTION_DURATION_OPTIONS.map((opt) => (
                        <MenuItem key={String(opt.value)} value={opt.value === null ? 'perm' : String(opt.value)}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button
                      size="small"
                      disabled={busyId === report.id || !report.targetUserId}
                      onClick={() =>
                        runUpdate(report.id, {
                          status: 'resolved',
                          resolutionNote: notes[report.id] || `Запрет чата (${muteLabel(muteMinutes)})`,
                          assignToMe: true,
                          sanction: report.targetUserId
                            ? {
                                targetUserId: report.targetUserId,
                                type: 'chat_mute',
                                reason: notes[report.id] || `Mute по жалобе #${report.id}`,
                                durationMinutes: muteMinutes,
                              }
                            : undefined,
                        })
                      }
                      variant="contained"
                      sx={{ textTransform: 'none', bgcolor: '#6d5dfb', '&:hover': { bgcolor: '#8e7bff' } }}
                    >
                      {muteLabel(muteMinutes)}
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
