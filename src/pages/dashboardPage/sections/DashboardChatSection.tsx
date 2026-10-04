import { Avatar, Box, Button, Chip, CircularProgress, Switch, TextField, Typography } from '@mui/material';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import { FormEvent, useState } from 'react';
import { DashboardMode } from '../dashboard.constants';
import { useStreamBans } from '../../../hooks/useStreamBans';
import { useStreamChatSettings } from '../../../hooks/useStreamChatSettings';
import { SlowModePresets } from '../../../components/chat/SlowModePresets';
import { CHAT_MODE_OPTIONS, ChatMode } from '../../../components/chat/chat.constants';
import { getChatModeLabel } from '../../../components/chat/chat.utils';
import { DashboardSaveNotice } from '../components/DashboardSaveNotice';
import { DashboardBlock, dashboardChatGridSx } from '../components/DashboardBlock';
import { StyledDashboardSectionHint, StyledDashboardSectionTitle } from '../StyledDashboardPage';

const SCROLL_BOX_SX = {
  flex: 1,
  minHeight: 180,
  maxHeight: 220,
  overflowY: 'auto' as const,
  pr: 0.5,
  '&::-webkit-scrollbar': { width: 6 },
  '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 3 },
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    bgcolor: 'rgba(255,255,255,0.04)',
    fontSize: 13,
    '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
    '&.Mui-focused fieldset': { borderColor: 'rgba(142,123,255,0.7)' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.55)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#b8adff' },
  '& .MuiInputBase-input::placeholder': {
    color: 'rgba(255,255,255,0.35)',
    opacity: 1,
  },
};

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ACTION_LABELS: Record<string, string> = {
  Delete: 'Удалил сообщение',
  Timeout: 'Таймаут',
  Ban: 'Бан',
  Unban: 'Разбан',
  SlowMode: 'Slow mode',
  RulesUpdate: 'Правила чата',
  ChatMode: 'Режим чата',
};

const formatLogLine = (entry: {
  action: string;
  actorUsername: string;
  targetUsername?: string | null;
  details?: string | null;
}) => {
  const action = ACTION_LABELS[entry.action] ?? entry.action;
  const target = entry.targetUsername ? ` → ${entry.targetUsername}` : '';
  const details = entry.details ? ` (${entry.details})` : '';
  return `${entry.actorUsername}: ${action}${target}${details}`;
};

const NOTIFICATION_PLACEHOLDERS = [
  { id: 'follow', icon: <PersonAddOutlinedIcon sx={{ fontSize: 16 }} />, label: 'Новый подписчик' },
  { id: 'gift', icon: <CardGiftcardOutlinedIcon sx={{ fontSize: 16 }} />, label: 'Подарочная подписка' },
];

export const DashboardChatSection = ({ channelNickname, mode }: { channelNickname: string; mode: DashboardMode }) => {
  const {
    settings,
    modLog,
    canManageChat,
    isLoading: settingsLoading,
    error: settingsError,
    actionError: settingsActionError,
    isSaving,
    saveSettings,
    reloadModLog,
  } = useStreamChatSettings(channelNickname, mode);

  const {
    bans,
    isLoading: bansLoading,
    error: bansError,
    actionError: bansActionError,
    unban,
  } = useStreamBans(channelNickname, mode);

  const [chatRulesDraft, setChatRulesDraft] = useState<string | null>(null);
  const [chatRulesTitleDraft, setChatRulesTitleDraft] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const rulesValue = chatRulesDraft ?? settings.chatRules;
  const rulesTitleValue = chatRulesTitleDraft ?? settings.chatRulesTitle;

  const isLoading = settingsLoading || bansLoading;
  const error = settingsError || bansError;
  const actionError = settingsActionError || bansActionError;

  const handleRulesSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaveNotice(null);
    const ok = await saveSettings({ chatRules: rulesValue, chatRulesTitle: rulesTitleValue });
    if (ok) {
      setChatRulesDraft(null);
      setChatRulesTitleDraft(null);
      setSaveNotice('Уведомление в чате сохранено');
    }
  };

  const handleSlowModeChange = async (seconds: number) => {
    setSaveNotice(null);
    const ok = await saveSettings({ slowModeSeconds: seconds });
    if (ok) setSaveNotice(seconds === 0 ? 'Slow mode выключен' : `Slow mode: ${seconds} сек`);
  };

  const handleChatModeChange = async (chatMode: ChatMode) => {
    if (chatMode === settings.chatMode) return;
    setSaveNotice(null);
    const ok = await saveSettings({ chatMode });
    if (ok) setSaveNotice(`Режим чата: ${getChatModeLabel(chatMode)}`);
  };

  const handleUnban = async (userId: number) => {
    const ok = await unban(userId);
    if (ok) reloadModLog();
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
        <StyledDashboardSectionTitle>Настройки чата</StyledDashboardSectionTitle>
        <Typography sx={{ color: '#ff8a8a', fontSize: 14 }}>{error}</Typography>
      </Box>
    );
  }

  if (!canManageChat) {
    return (
      <Box>
        <StyledDashboardSectionTitle>Настройки чата</StyledDashboardSectionTitle>
        <StyledDashboardSectionHint>Недостаточно прав для управления чатом.</StyledDashboardSectionHint>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start', width: '100%' }}>
      <Box>
        <StyledDashboardSectionTitle sx={{ mb: 0.5 }}>Настройки чата</StyledDashboardSectionTitle>
      </Box>

      <DashboardSaveNotice message={saveNotice} onClose={() => setSaveNotice(null)} />
      {actionError && !saveNotice && <DashboardSaveNotice message={actionError} severity="error" />}

      <Box sx={dashboardChatGridSx}>
        <DashboardBlock
          icon={<NotificationsOutlinedIcon sx={{ fontSize: 18, color: '#ffb86c' }} />}
          title="Уведомления стримера"
          hint="Скоро — оповещения о подписках и донатах"
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1 }}>
            {NOTIFICATION_PLACEHOLDERS.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  py: 0.5,
                  px: 0.75,
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.03)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Box sx={{ color: 'rgba(255,255,255,0.45)' }}>{item.icon}</Box>
                  <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{item.label}</Typography>
                </Box>
                <Switch size="small" disabled sx={{ opacity: 0.45 }} />
              </Box>
            ))}
            <Box sx={{ mt: 'auto', pt: 0.5 }}>
              <Chip
                label="Скоро"
                size="small"
                sx={{
                  height: 22,
                  fontSize: 10,
                  fontWeight: 700,
                  bgcolor: 'rgba(255,184,108,0.12)',
                  color: '#ffb86c',
                  border: '1px solid rgba(255,184,108,0.25)',
                }}
              />
            </Box>
          </Box>
        </DashboardBlock>

        <DashboardBlock
          icon={<ChatOutlinedIcon sx={{ fontSize: 18, color: '#8e7bff' }} />}
          title="Режим чата"
          hint="Кто и что может писать в чате"
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {CHAT_MODE_OPTIONS.map((option) => {
              const selected = settings.chatMode === option.value;
              return (
                <Box
                  key={option.value}
                  component="button"
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleChatModeChange(option.value)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 0.25,
                    width: '100%',
                    p: 1,
                    borderRadius: 1.5,
                    border: selected ? '1px solid rgba(142,123,255,0.55)' : '1px solid rgba(255,255,255,0.1)',
                    bgcolor: selected ? 'rgba(142,123,255,0.12)' : 'rgba(255,255,255,0.03)',
                    color: '#fff',
                    cursor: isSaving ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.15s, background-color 0.15s',
                    '&:hover': isSaving
                      ? undefined
                      : {
                          borderColor: selected ? 'rgba(142,123,255,0.7)' : 'rgba(255,255,255,0.18)',
                          bgcolor: selected ? 'rgba(142,123,255,0.16)' : 'rgba(255,255,255,0.05)',
                        },
                  }}
                >
                  <Typography
                    sx={{ fontSize: 13, fontWeight: 700, color: selected ? '#d8d0ff' : 'rgba(255,255,255,0.9)' }}
                  >
                    {option.label}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.35 }}>
                    {option.hint}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </DashboardBlock>

        <DashboardBlock
          icon={<TimerOutlinedIcon sx={{ fontSize: 18, color: '#56cb27' }} />}
          title="Slow mode"
          hint="Задержка между сообщениями зрителей"
        >
          <SlowModePresets
            value={settings.slowModeSeconds}
            disabled={isSaving}
            compact
            onChange={handleSlowModeChange}
          />
        </DashboardBlock>

        <DashboardBlock
          icon={<RuleOutlinedIcon sx={{ fontSize: 18, color: '#8e7bff' }} />}
          title="Уведомление в чате"
          hint="Баннер над сообщениями; зрители и модераторы могут свернуть его стрелкой под шапкой чата"
          sx={{ gridColumn: { xs: '1', sm: '1 / -1', lg: 'auto' } }}
        >
          <Box
            component="form"
            onSubmit={handleRulesSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, justifyContent: 'space-between' }}
          >
            <TextField
              fullWidth
              size="small"
              label="Заголовок"
              value={rulesTitleValue}
              onChange={(e) => setChatRulesTitleDraft(e.target.value.slice(0, 80))}
              placeholder="Например: Правила чата"
              sx={fieldSx}
            />
            <TextField
              multiline
              minRows={3}
              maxRows={4}
              fullWidth
              size="small"
              label="Текст"
              value={rulesValue}
              onChange={(e) => setChatRulesDraft(e.target.value.slice(0, 500))}
              placeholder="Будьте вежливы, без спама..."
              sx={fieldSx}
            />
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
            >
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                {rulesTitleValue.length} / 80 · {rulesValue.length} / 500
              </Typography>
              <Button
                type="submit"
                size="small"
                variant="contained"
                disabled={
                  isSaving || (rulesValue === settings.chatRules && rulesTitleValue === settings.chatRulesTitle)
                }
                sx={{ textTransform: 'none', bgcolor: '#6d5dfb', '&:hover': { bgcolor: '#8e7bff' } }}
              >
                Сохранить
              </Button>
            </Box>
          </Box>
        </DashboardBlock>

        <DashboardBlock
          icon={<BlockOutlinedIcon sx={{ fontSize: 18, color: '#ff8a8a' }} />}
          title="Модерация и баны"
          hint={`Забанено: ${bans.length}`}
        >
          {bans.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Список банов пуст.</Typography>
          ) : (
            <Box sx={{ ...SCROLL_BOX_SX, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {bans.map((ban) => (
                <Box
                  key={ban.userId}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.5,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Avatar
                    src={ban.profileImage ? `${process.env.REACT_APP_API_LOCAL}${ban.profileImage}` : undefined}
                    sx={{ width: 28, height: 28 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>
                      {ban.username}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                      {formatDate(ban.bannedAt)}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleUnban(ban.userId)}
                    sx={{
                      minWidth: 0,
                      px: 1,
                      py: 0.25,
                      fontSize: 11,
                      textTransform: 'none',
                      color: '#6fff79',
                      borderColor: 'rgba(111,255,121,0.35)',
                      '&:hover': { borderColor: 'rgba(111,255,121,0.6)', bgcolor: 'rgba(111,255,121,0.08)' },
                    }}
                  >
                    Разбан
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </DashboardBlock>

        <DashboardBlock
          icon={<HistoryOutlinedIcon sx={{ fontSize: 18, color: '#8e7bff' }} />}
          title="Лог модерации"
          hint="Недавние действия модераторов"
          sx={{ gridColumn: { sm: 'auto', lg: 'span 2' } }}
        >
          {modLog.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Пока пусто.</Typography>
          ) : (
            <Box sx={{ ...SCROLL_BOX_SX, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {modLog.map((entry) => (
                <Box key={entry.id} sx={{ py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', mb: 0.25 }}>
                    {formatDate(entry.createdAt)}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.82)', lineHeight: 1.4 }}>
                    {formatLogLine(entry)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DashboardBlock>
      </Box>
    </Box>
  );
};
