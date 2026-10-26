import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  SupportTicket,
  TICKET_CATEGORY_OPTIONS,
  TicketCategory,
  createSupportTicket,
  fetchMyTickets,
  replyMyTicket,
} from '../../../api/supportTicketsApi';
import {
  MySanction,
  PlatformAppeal,
  appealStatusLabel,
  createMyAppeal,
  fetchMyAppeals,
  fetchMySanctions,
  sanctionStatusLabel,
  sanctionTypeLabel,
} from '../../../api/appealsApi';
import { useSettingsNotice } from '../context/SettingsNoticeContext';
import { settingsFieldSx, settingsPanelSx } from '../settings.styles';

type PanelKey = 'new' | 'questions' | 'sanctions' | 'appeal' | 'appeals';

const parsePositiveInt = (value: string | null) => {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const focusBorder = '1px solid rgba(142,123,255,0.65)';
const focusGlow = '0 0 0 1px rgba(142,123,255,0.25)';

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    open: 'Открыт',
    in_progress: 'В работе',
    waiting_user: 'Ждёт вас',
    resolved: 'Решён',
    closed: 'Закрыт',
  };
  return map[status] || status;
};

const accordionSx = {
  ...settingsPanelSx,
  p: 0,
  '&:before': { display: 'none' },
  boxShadow: 'none',
  bgcolor: 'rgba(255,255,255,0.03)',
  '&.Mui-expanded': { margin: 0 },
};

const summarySx = {
  minHeight: 48,
  px: 2,
  '& .MuiAccordionSummary-content': { my: 1, alignItems: 'center', gap: 1, flexWrap: 'wrap' },
  '&.Mui-expanded': { minHeight: 48 },
};

const detailsSx = {
  px: 2,
  pb: 2,
  pt: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 1.5,
};

const scrollListSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  maxHeight: 280,
  overflow: 'auto',
  pr: 0.5,
};

export const SettingsSupportSection = () => {
  const { showNotice } = useSettingsNotice();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [sanctions, setSanctions] = useState<MySanction[]>([]);
  const [appeals, setAppeals] = useState<PlatformAppeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState<TicketCategory>('stream');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [focusMessageId, setFocusMessageId] = useState<number | null>(null);
  const [highlightSanctionId, setHighlightSanctionId] = useState<number | null>(null);
  const [highlightAppealId, setHighlightAppealId] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [appealSanctionId, setAppealSanctionId] = useState<number | ''>('');
  const [appealMessage, setAppealMessage] = useState('');
  const [isAppealSubmitting, setIsAppealSubmitting] = useState(false);
  const [openPanels, setOpenPanels] = useState<Record<PanelKey, boolean>>({
    new: true,
    questions: false,
    sanctions: false,
    appeal: false,
    appeals: false,
  });

  const setPanel = (key: PanelKey, expanded: boolean) => {
    setOpenPanels((prev) => ({ ...prev, [key]: expanded }));
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    const [ticketsResult, sanctionsResult, appealsResult] = await Promise.all([
      fetchMyTickets(),
      fetchMySanctions(false),
      fetchMyAppeals(),
    ]);
    setIsLoading(false);

    if (!ticketsResult.success) {
      showNotice(ticketsResult.message || 'Не удалось загрузить вопросы', 'error');
      return;
    }
    setTickets(ticketsResult.tickets);

    if (sanctionsResult.success) setSanctions(sanctionsResult.sanctions);
    if (appealsResult.success) {
      setAppeals(appealsResult.appeals);
      const appealable = (sanctionsResult.success ? sanctionsResult.sanctions : []).filter(
        (s) => s.status === 'active' && s.type !== 'warning'
      );
      const openIds = new Set(
        appealsResult.appeals.filter((a) => a.status === 'open' || a.status === 'in_review').map((a) => a.sanctionId)
      );
      const first = appealable.find((s) => !openIds.has(s.id));
      if (first) setAppealSanctionId(first.id);
    }

    const hasWaitingTicket = ticketsResult.tickets.some((t) => t.status === 'waiting_user');
    const hasActiveSanction = sanctionsResult.success && sanctionsResult.sanctions.some((s) => s.status === 'active');
    // Auto-open only sections that need attention; keep the rest collapsed.
    setOpenPanels((prev) => ({
      ...prev,
      questions: prev.questions || hasWaitingTicket,
      sanctions: prev.sanctions || Boolean(hasActiveSanction),
    }));
  }, [showNotice]);

  useEffect(() => {
    void load();
  }, [load]);

  // Deep-link from notifications: ?ticket=&message= | ?sanction= | ?appeal= | ?panel=
  useEffect(() => {
    if (isLoading) return;

    const ticketId = parsePositiveInt(searchParams.get('ticket'));
    const messageId = parsePositiveInt(searchParams.get('message'));
    const sanctionId = parsePositiveInt(searchParams.get('sanction'));
    const appealId = parsePositiveInt(searchParams.get('appeal'));
    const panel = searchParams.get('panel') as PanelKey | null;
    const hasFocusIntent = Boolean(ticketId || sanctionId || appealId || panel);
    if (!hasFocusIntent) return;

    setOpenPanels((prev) => {
      const next = { ...prev, new: false };
      if (ticketId || panel === 'questions') next.questions = true;
      if (sanctionId || panel === 'sanctions') next.sanctions = true;
      if (appealId || panel === 'appeals') next.appeals = true;
      if (panel === 'appeal') next.appeal = true;
      if (panel === 'new') next.new = true;
      return next;
    });

    if (ticketId && tickets.some((t) => t.id === ticketId)) {
      setActiveId(ticketId);
      if (messageId) setFocusMessageId(messageId);
    }

    if (sanctionId && sanctions.some((s) => s.id === sanctionId)) {
      setHighlightSanctionId(sanctionId);
    }

    if (appealId && appeals.some((a) => a.id === appealId)) {
      setHighlightAppealId(appealId);
    }

    setSearchParams({}, { replace: true });
  }, [isLoading, tickets, sanctions, appeals, searchParams, setSearchParams]);

  useEffect(() => {
    if (focusMessageId == null || !openPanels.questions) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`support-message-${focusMessageId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusMessageId, activeId, openPanels.questions]);

  useEffect(() => {
    if (highlightSanctionId == null || !openPanels.sanctions) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`support-sanction-${highlightSanctionId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [highlightSanctionId, openPanels.sanctions]);

  useEffect(() => {
    if (highlightAppealId == null || !openPanels.appeals) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`support-appeal-${highlightAppealId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [highlightAppealId, openPanels.appeals]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await createSupportTicket({
      category,
      subject: subject.trim(),
      message: message.trim(),
    });
    setIsSubmitting(false);
    if (!result.success) {
      showNotice(result.message || 'Не удалось отправить вопрос', 'error');
      return;
    }
    showNotice('Вопрос отправлен', 'success');
    setSubject('');
    setMessage('');
    setActiveId(result.ticket.id);
    setPanel('questions', true);
    await load();
  };

  const handleReply = async (id: number) => {
    if (!reply.trim()) return;
    setBusyId(id);
    const result = await replyMyTicket(id, reply.trim());
    setBusyId(null);
    if (!result.success) {
      showNotice(result.message || 'Не удалось отправить', 'error');
      return;
    }
    setReply('');
    await load();
  };

  const handleAppeal = async (e: FormEvent) => {
    e.preventDefault();
    if (!appealSanctionId || !appealMessage.trim()) return;
    setIsAppealSubmitting(true);
    const result = await createMyAppeal(Number(appealSanctionId), appealMessage.trim());
    setIsAppealSubmitting(false);
    if (!result.success) {
      showNotice(result.message || 'Не удалось отправить апелляцию', 'error');
      return;
    }
    showNotice('Апелляция отправлена', 'success');
    setAppealMessage('');
    setPanel('appeals', true);
    await load();
  };

  const active = useMemo(() => tickets.find((t) => t.id === activeId) || null, [tickets, activeId]);
  const appealableSanctions = sanctions.filter((s) => s.status === 'active' && s.type !== 'warning');
  const openSanctionIds = new Set(
    appeals.filter((a) => a.status === 'open' || a.status === 'in_review').map((a) => a.sanctionId)
  );
  const activeSanctionsCount = sanctions.filter((s) => s.status === 'active').length;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} sx={{ color: '#8e7bff' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Поддержка</Typography>
        <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', mt: 0.5 }}>
          Вопросы по аккаунту и стриму, обжалование наказаний. Жалобы на нарушения — через «Пожаловаться» на канале или
          в чате.
        </Typography>
      </Box>

      <Accordion
        disableGutters
        expanded={openPanels.new}
        onChange={(_, expanded) => setPanel('new', expanded)}
        sx={accordionSx}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.55)' }} />} sx={summarySx}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Новый вопрос</Typography>
        </AccordionSummary>
        <AccordionDetails sx={detailsSx}>
          <Box component="form" onSubmit={handleCreate} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              select
              label="Категория"
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              sx={settingsFieldSx}
              fullWidth
            >
              {TICKET_CATEGORY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Тема"
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, 200))}
              sx={settingsFieldSx}
              fullWidth
            />
            <TextField
              label="Сообщение"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 4000))}
              multiline
              minRows={3}
              sx={settingsFieldSx}
              fullWidth
            />
            <Box>
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="contained"
                sx={{ textTransform: 'none', bgcolor: '#6d5dfb', '&:hover': { bgcolor: '#8e7bff' } }}
              >
                {isSubmitting ? 'Отправка...' : 'Отправить'}
              </Button>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion
        disableGutters
        expanded={openPanels.questions}
        onChange={(_, expanded) => setPanel('questions', expanded)}
        sx={accordionSx}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.55)' }} />} sx={summarySx}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Мои вопросы</Typography>
          <Chip size="small" label={tickets.length} sx={{ color: 'rgba(255,255,255,0.75)', height: 22 }} />
        </AccordionSummary>
        <AccordionDetails sx={detailsSx}>
          {tickets.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Пока нет обращений</Typography>
          ) : (
            <Box sx={scrollListSx}>
              {tickets.map((ticket) => (
                <Box
                  key={ticket.id}
                  id={`support-ticket-${ticket.id}`}
                  onClick={() => setActiveId(ticket.id)}
                  sx={{
                    p: 1.25,
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: 'rgba(0,0,0,0.2)',
                    border: '1px solid',
                    borderColor: activeId === ticket.id ? 'rgba(142,123,255,0.45)' : 'rgba(255,255,255,0.06)',
                    boxShadow: activeId === ticket.id ? focusGlow : undefined,
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip size="small" label={statusLabel(ticket.status)} sx={{ color: '#fff' }} />
                    <Typography sx={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{ticket.subject}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>
                    #{ticket.id} · {new Date(ticket.updatedAt).toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {active && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                #{active.id}: {active.subject}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 240, overflow: 'auto' }}>
                {active.messages.map((msg) => (
                  <Box
                    key={msg.id}
                    id={`support-message-${msg.id}`}
                    sx={{
                      p: 1.25,
                      borderRadius: 1,
                      bgcolor: msg.isStaff ? 'rgba(142,123,255,0.12)' : 'rgba(255,255,255,0.04)',
                      border: focusMessageId === msg.id ? focusBorder : '1px solid rgba(255,255,255,0.06)',
                      boxShadow: focusMessageId === msg.id ? focusGlow : undefined,
                    }}
                  >
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', mb: 0.5 }}>
                      {msg.isStaff ? 'Поддержка' : msg.authorNickname || 'Вы'} ·{' '}
                      {new Date(msg.createdAt).toLocaleString()}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: '#fff', whiteSpace: 'pre-wrap' }}>{msg.body}</Typography>
                  </Box>
                ))}
              </Box>
              {active.status !== 'closed' && active.status !== 'resolved' && (
                <>
                  <TextField
                    label="Ответ"
                    value={reply}
                    onChange={(e) => setReply(e.target.value.slice(0, 4000))}
                    multiline
                    minRows={2}
                    sx={settingsFieldSx}
                    fullWidth
                  />
                  <Button
                    disabled={busyId === active.id || !reply.trim()}
                    onClick={() => handleReply(active.id)}
                    variant="outlined"
                    sx={{ textTransform: 'none', color: '#fff', alignSelf: 'flex-start' }}
                  >
                    Отправить ответ
                  </Button>
                </>
              )}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion
        disableGutters
        expanded={openPanels.sanctions}
        onChange={(_, expanded) => setPanel('sanctions', expanded)}
        sx={accordionSx}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.55)' }} />} sx={summarySx}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Мои наказания</Typography>
          <Chip
            size="small"
            label={activeSanctionsCount > 0 ? `${activeSanctionsCount} акт.` : sanctions.length}
            sx={{ color: activeSanctionsCount > 0 ? '#ffb74d' : 'rgba(255,255,255,0.75)', height: 22 }}
          />
        </AccordionSummary>
        <AccordionDetails sx={detailsSx}>
          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            Активные наказания, кроме предупреждений, можно обжаловать.
          </Typography>
          {sanctions.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Наказаний нет</Typography>
          ) : (
            <Box sx={scrollListSx}>
              {sanctions.map((s) => {
                const canAppeal = s.status === 'active' && s.type !== 'warning' && !openSanctionIds.has(s.id);
                const focused = highlightSanctionId === s.id;
                return (
                  <Box
                    key={s.id}
                    id={`support-sanction-${s.id}`}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: s.status === 'active' ? 'rgba(183,28,28,0.12)' : 'rgba(0,0,0,0.2)',
                      border: focused
                        ? focusBorder
                        : `1px solid ${s.status === 'active' ? 'rgba(255,138,128,0.28)' : 'rgba(255,255,255,0.06)'}`,
                      boxShadow: focused ? focusGlow : undefined,
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Chip size="small" label={sanctionTypeLabel(s.type)} sx={{ color: '#fff' }} />
                      <Chip
                        size="small"
                        label={sanctionStatusLabel(s.status)}
                        sx={{
                          color: s.status === 'active' ? '#ffb74d' : 'rgba(255,255,255,0.7)',
                        }}
                      />
                      {openSanctionIds.has(s.id) && (
                        <Chip size="small" label="Есть апелляция" sx={{ color: '#ffb74d' }} />
                      )}
                    </Box>

                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', mt: 1, mb: 0.25 }}>
                      Причина
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: '#fff', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                      {s.reason || 'Не указана'}
                    </Typography>

                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', mt: 0.75 }}>
                      #{s.id} · выдано {new Date(s.createdAt).toLocaleString()}
                      {s.expiresAt ? ` · до ${new Date(s.expiresAt).toLocaleString()}` : ' · бессрочно'}
                    </Typography>

                    {canAppeal && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setAppealSanctionId(s.id);
                          setPanel('appeal', true);
                        }}
                        sx={{
                          mt: 1,
                          textTransform: 'none',
                          color: '#fff',
                          borderColor: 'rgba(255,255,255,0.2)',
                          '&:hover': { borderColor: 'rgba(142,123,255,0.45)' },
                        }}
                      >
                        Обжаловать
                      </Button>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion
        disableGutters
        expanded={openPanels.appeal}
        onChange={(_, expanded) => setPanel('appeal', expanded)}
        sx={accordionSx}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.55)' }} />} sx={summarySx}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Подать апелляцию</Typography>
        </AccordionSummary>
        <AccordionDetails sx={detailsSx}>
          <Box component="form" onSubmit={handleAppeal} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {appealableSanctions.length === 0 ? (
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                Нет активных наказаний, которые можно обжаловать.
              </Typography>
            ) : (
              <>
                <TextField
                  select
                  label="Наказание"
                  value={appealSanctionId}
                  onChange={(e) => setAppealSanctionId(Number(e.target.value))}
                  sx={settingsFieldSx}
                  fullWidth
                >
                  {appealableSanctions.map((s) => (
                    <MenuItem key={s.id} value={s.id} disabled={openSanctionIds.has(s.id)}>
                      #{s.id} · {sanctionTypeLabel(s.type)}
                      {s.reason ? ` — ${s.reason.slice(0, 60)}${s.reason.length > 60 ? '…' : ''}` : ''}
                      {openSanctionIds.has(s.id) ? ' (уже есть апелляция)' : ''}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Почему наказание нужно снять"
                  value={appealMessage}
                  onChange={(e) => setAppealMessage(e.target.value.slice(0, 2000))}
                  multiline
                  minRows={3}
                  sx={settingsFieldSx}
                  fullWidth
                />
                <Button
                  type="submit"
                  disabled={
                    isAppealSubmitting ||
                    !appealSanctionId ||
                    appealMessage.trim().length < 10 ||
                    openSanctionIds.has(Number(appealSanctionId))
                  }
                  variant="contained"
                  sx={{
                    textTransform: 'none',
                    alignSelf: 'flex-start',
                    bgcolor: '#6d5dfb',
                    '&:hover': { bgcolor: '#8e7bff' },
                  }}
                >
                  {isAppealSubmitting ? 'Отправка...' : 'Отправить апелляцию'}
                </Button>
              </>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion
        disableGutters
        expanded={openPanels.appeals}
        onChange={(_, expanded) => setPanel('appeals', expanded)}
        sx={accordionSx}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.55)' }} />} sx={summarySx}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Мои апелляции</Typography>
          <Chip size="small" label={appeals.length} sx={{ color: 'rgba(255,255,255,0.75)', height: 22 }} />
        </AccordionSummary>
        <AccordionDetails sx={detailsSx}>
          {appeals.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Пока нет</Typography>
          ) : (
            <Box sx={scrollListSx}>
              {appeals.map((a) => (
                <Box
                  key={a.id}
                  id={`support-appeal-${a.id}`}
                  sx={{
                    p: 1.25,
                    borderRadius: 1,
                    bgcolor: 'rgba(0,0,0,0.2)',
                    border: highlightAppealId === a.id ? focusBorder : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: highlightAppealId === a.id ? focusGlow : undefined,
                  }}
                >
                  <Chip size="small" label={appealStatusLabel(a.status)} sx={{ color: '#fff', mb: 0.75 }} />
                  <Typography sx={{ fontSize: 13, color: '#fff' }}>
                    {sanctionTypeLabel(a.sanctionType)} · наказание #{a.sanctionId}
                  </Typography>
                  {a.sanctionReason && (
                    <>
                      <Typography
                        sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', mt: 0.75, mb: 0.25 }}
                      >
                        Причина наказания
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap' }}>
                        {a.sanctionReason}
                      </Typography>
                    </>
                  )}
                  <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', mt: 0.5, whiteSpace: 'pre-wrap' }}>
                    {a.message}
                  </Typography>
                  {a.staffNote && (
                    <Typography sx={{ fontSize: 12, color: '#cfc5ff', mt: 0.75 }}>Ответ: {a.staffNote}</Typography>
                  )}
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>
                    {new Date(a.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
