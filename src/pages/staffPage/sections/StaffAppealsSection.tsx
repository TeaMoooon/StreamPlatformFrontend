import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Chip, CircularProgress, TextField, Typography } from '@mui/material';
import {
  PlatformAppeal,
  appealStatusLabel,
  fetchStaffAppeals,
  sanctionTypeLabel,
  updateStaffAppeal,
} from '../../../api/appealsApi';
import { isStaffQueueStale } from '../../../api/staffApi';
import { StyledDashboardSectionHint, StyledDashboardSectionTitle } from '../../dashboardPage/StyledDashboardPage';

const OPEN_STATUSES = ['open', 'in_review'];

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
};

const STATUS_FILTERS = [
  { value: 'open', label: 'Открытые' },
  { value: 'in_review', label: 'На рассмотрении' },
  { value: 'approved', label: 'Одобренные' },
  { value: 'rejected', label: 'Отклонённые' },
  { value: '', label: 'Все' },
];

export const StaffAppealsSection = () => {
  const [status, setStatus] = useState('open');
  const [appeals, setAppeals] = useState<PlatformAppeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await fetchStaffAppeals(status, 100);
    setIsLoading(false);
    if (!result.success) {
      setError(result.message || 'Ошибка загрузки');
      setAppeals([]);
      return;
    }
    setAppeals(result.appeals);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (id: number, payload: Parameters<typeof updateStaffAppeal>[1]) => {
    setBusyId(id);
    setActionError(null);
    const result = await updateStaffAppeal(id, payload);
    setBusyId(null);
    if (!result.success) {
      setActionError(result.message || 'Ошибка');
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
        <StyledDashboardSectionTitle>Просьбы снять бан</StyledDashboardSectionTitle>
        <StyledDashboardSectionHint>
          Пользователь просит отменить мут или бан. «Одобрить» — снимет наказание. «Отклонить» — оставит как есть.
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

      {appeals.length === 0 ? (
        <Box sx={panelSx}>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Апелляций нет</Typography>
        </Box>
      ) : (
        appeals.map((appeal) => {
          const stale = isStaffQueueStale(appeal.updatedAt || appeal.createdAt, appeal.status, OPEN_STATUSES);
          const open = OPEN_STATUSES.includes(appeal.status);
          return (
            <Box
              key={appeal.id}
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
                <Chip size="small" label={appealStatusLabel(appeal.status)} sx={{ color: '#fff' }} />
                <Chip size="small" label={sanctionTypeLabel(appeal.sanctionType)} sx={{ color: '#cfc5ff' }} />
                {stale && (
                  <Chip
                    label="Давно без ответа"
                    size="small"
                    sx={{ bgcolor: 'rgba(255,167,38,0.2)', color: '#ffb74d' }}
                  />
                )}
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  #{appeal.id} · {new Date(appeal.createdAt).toLocaleString()}
                </Typography>
              </Box>

              <Typography sx={{ fontSize: 14, color: '#fff' }}>
                {appeal.userNickname || appeal.userId} · наказание #{appeal.sanctionId}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                За что наказали: {appeal.sanctionReason}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap' }}>
                Просьба пользователя: {appeal.message}
              </Typography>

              {open && (
                <>
                  <TextField
                    size="small"
                    label="Ответ пользователю"
                    value={notes[appeal.id] || ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [appeal.id]: e.target.value.slice(0, 500) }))}
                    sx={fieldSx}
                    fullWidth
                  />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Button
                      size="small"
                      disabled={busyId === appeal.id}
                      onClick={() =>
                        run(appeal.id, {
                          status: 'in_review',
                          staffNote: notes[appeal.id] || undefined,
                        })
                      }
                      sx={{ textTransform: 'none', color: '#fff' }}
                    >
                      Взять на проверку
                    </Button>
                    <Button
                      size="small"
                      disabled={busyId === appeal.id}
                      onClick={() =>
                        run(appeal.id, {
                          status: 'approved',
                          staffNote: notes[appeal.id]?.trim() || undefined,
                          revokeSanction: true,
                        })
                      }
                      variant="contained"
                      sx={{ textTransform: 'none', bgcolor: '#2e7d32', '&:hover': { bgcolor: '#43a047' } }}
                    >
                      Одобрить и снять наказание
                    </Button>
                    <Button
                      size="small"
                      disabled={busyId === appeal.id}
                      onClick={() =>
                        run(appeal.id, {
                          status: 'rejected',
                          staffNote: notes[appeal.id]?.trim() || undefined,
                          revokeSanction: false,
                        })
                      }
                      sx={{ textTransform: 'none', color: '#ff8a8a' }}
                    >
                      Отклонить просьбу
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
