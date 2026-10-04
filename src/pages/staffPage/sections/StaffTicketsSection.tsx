import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Chip, CircularProgress, TextField, Typography } from '@mui/material';
import {
  SupportTicket,
  fetchStaffTickets,
  replyStaffTicket,
  resetTicketStreamKey,
  updateStaffTicket,
} from '../../../api/supportTicketsApi';
import { STAFF_STALE_HOURS, isStaffQueueStale } from '../../../api/staffApi';
import { StyledDashboardSectionHint, StyledDashboardSectionTitle } from '../../dashboardPage/StyledDashboardPage';

const OPEN_STATUSES = ['open', 'in_progress', 'waiting_user'];

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
  { value: 'in_progress', label: 'В работе' },
  { value: 'waiting_user', label: 'Ждут пользователя' },
  { value: 'resolved', label: 'Решённые' },
  { value: 'closed', label: 'Закрытые' },
  { value: '', label: 'Все' },
];

const categoryLabel = (category: string) => {
  const map: Record<string, string> = {
    account: 'Аккаунт',
    stream: 'Стрим',
    payments: 'Платежи',
    abuse: 'Abuse',
    other: 'Другое',
  };
  return map[category] || category;
};

export const StaffTicketsSection = () => {
  const [status, setStatus] = useState('open');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await fetchStaffTickets(status, 100);
    setIsLoading(false);
    if (!result.success) {
      setError(result.message);
      setTickets([]);
      return;
    }
    setTickets(result.tickets);
    if (activeId && !result.tickets.some((t) => t.id === activeId)) {
      setActiveId(result.tickets[0]?.id ?? null);
    } else if (!activeId && result.tickets[0]) {
      setActiveId(result.tickets[0].id);
    }
  }, [status, activeId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const active = tickets.find((t) => t.id === activeId) || null;

  const run = async (id: number, fn: () => Promise<{ success: boolean; message?: string }>) => {
    setBusyId(id);
    setActionError(null);
    const result = await fn();
    setBusyId(null);
    if (!result.success) {
      setActionError(result.message || 'Ошибка');
      return;
    }
    setReply('');
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
        <StyledDashboardSectionTitle>Вопросы в поддержку</StyledDashboardSectionTitle>
        <StyledDashboardSectionHint>
          Баны здесь не выдают — для этого раздел «Мут и бан». Открытые дольше {STAFF_STALE_HOURS}ч подсвечены.
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

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {tickets.length === 0 ? (
            <Box sx={panelSx}>
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Тикетов нет</Typography>
            </Box>
          ) : (
            tickets.map((ticket) => {
              const stale = isStaffQueueStale(ticket.updatedAt || ticket.createdAt, ticket.status, OPEN_STATUSES);
              return (
                <Box
                  key={ticket.id}
                  onClick={() => setActiveId(ticket.id)}
                  sx={{
                    ...panelSx,
                    cursor: 'pointer',
                    borderColor:
                      activeId === ticket.id
                        ? 'rgba(142,123,255,0.45)'
                        : stale
                          ? 'rgba(255,167,38,0.55)'
                          : 'rgba(255,255,255,0.08)',
                    bgcolor: stale ? 'rgba(255,167,38,0.06)' : panelSx.bgcolor,
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{ticket.subject}</Typography>
                    {stale && (
                      <Chip
                        label="Давно без ответа"
                        size="small"
                        sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(255,167,38,0.2)', color: '#ffb74d' }}
                      />
                    )}
                  </Box>
                  <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', mt: 0.5 }}>
                    #{ticket.id} · {ticket.userNickname || ticket.userId} · {categoryLabel(ticket.category)}
                  </Typography>
                </Box>
              );
            })
          )}
        </Box>

        {active ? (
          <Box sx={{ ...panelSx, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Chip size="small" label={active.status} sx={{ color: '#fff' }} />
              <Chip size="small" label={categoryLabel(active.category)} sx={{ color: '#fff' }} />
              {active.escalatedReportId && (
                <Chip size="small" label={`Жалоба #${active.escalatedReportId}`} sx={{ color: '#ffb74d' }} />
              )}
            </Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{active.subject}</Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
              Пользователь: {active.userNickname || active.userId}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 360, overflow: 'auto' }}>
              {active.messages.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    p: 1.25,
                    borderRadius: 1,
                    bgcolor: msg.isStaff ? 'rgba(142,123,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', mb: 0.5 }}>
                    {msg.isStaff ? 'Staff' : msg.authorNickname || 'User'} · {new Date(msg.createdAt).toLocaleString()}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: '#fff', whiteSpace: 'pre-wrap' }}>{msg.body}</Typography>
                </Box>
              ))}
            </Box>

            <TextField
              label="Ответ"
              value={reply}
              onChange={(e) => setReply(e.target.value.slice(0, 4000))}
              multiline
              minRows={2}
              sx={fieldSx}
              fullWidth
            />

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Button
                size="small"
                disabled={busyId === active.id || !reply.trim()}
                onClick={() => run(active.id, () => replyStaffTicket(active.id, reply.trim()))}
                variant="contained"
                sx={{ textTransform: 'none', bgcolor: '#6d5dfb', '&:hover': { bgcolor: '#8e7bff' } }}
              >
                Ответить
              </Button>
              <Button
                size="small"
                disabled={busyId === active.id}
                onClick={() =>
                  run(active.id, () => updateStaffTicket(active.id, { status: 'in_progress', assignToMe: true }))
                }
                sx={{ textTransform: 'none', color: '#fff' }}
              >
                В работу
              </Button>
              <Button
                size="small"
                disabled={busyId === active.id}
                onClick={() =>
                  run(active.id, () => updateStaffTicket(active.id, { status: 'resolved', assignToMe: true }))
                }
                sx={{ textTransform: 'none', color: '#6fff79' }}
              >
                Вопрос решён
              </Button>
              <Button
                size="small"
                disabled={busyId === active.id}
                onClick={() => run(active.id, () => resetTicketStreamKey(active.id))}
                sx={{ textTransform: 'none', color: '#ffb74d' }}
              >
                Сбросить ключ стрима
              </Button>
              <Button
                size="small"
                disabled={busyId === active.id || Boolean(active.escalatedReportId)}
                onClick={() =>
                  run(active.id, () =>
                    updateStaffTicket(active.id, {
                      escalateToReport: true,
                      escalateReason: 'other',
                      escalateDetails: active.messages[0]?.body,
                      assignToMe: true,
                    })
                  )
                }
                sx={{ textTransform: 'none', color: '#ff8a8a' }}
              >
                Это нарушение → в жалобы
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={panelSx}>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Выберите тикет</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
