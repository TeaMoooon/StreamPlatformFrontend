import { handleApiRequest } from '../utils/handleApiRequest';
import { authHeaders } from './httpClient';
import { fetchStreamTeamAccess } from './streamTeamApi';
import { ChatMode } from '../components/chat/chat.constants';
import { normalizeChatMode } from '../components/chat/chat.utils';

export type StreamChatSettings = {
  slowModeSeconds: number;
  chatRules: string;
  chatRulesTitle: string;
  chatMode: ChatMode;
};

export type StreamChatModerationLogEntry = {
  id: number;
  actorUserId: number;
  actorUsername: string;
  action: string;
  targetUserId?: number | null;
  targetUsername?: string | null;
  messageId?: string | null;
  details?: string | null;
  createdAt: string;
};

const apiBase = () => `${process.env.REACT_APP_API_LOCAL}/api/streamers`;

const normalizeSettings = (raw: Record<string, unknown>): StreamChatSettings => ({
  slowModeSeconds: Number(raw.slowModeSeconds ?? raw.SlowModeSeconds ?? 0),
  chatRules: String(raw.chatRules ?? raw.ChatRules ?? ''),
  chatRulesTitle: String(raw.chatRulesTitle ?? raw.ChatRulesTitle ?? ''),
  chatMode: normalizeChatMode(raw.chatMode ?? raw.ChatMode),
});

const normalizeLogEntry = (raw: Record<string, unknown>): StreamChatModerationLogEntry => ({
  id: Number(raw.id ?? raw.Id ?? 0),
  actorUserId: Number(raw.actorUserId ?? raw.ActorUserId ?? 0),
  actorUsername: String(raw.actorUsername ?? raw.ActorUsername ?? ''),
  action: String(raw.action ?? raw.Action ?? ''),
  targetUserId: (raw.targetUserId ?? raw.TargetUserId ?? null) as number | null,
  targetUsername: (raw.targetUsername ?? raw.TargetUsername ?? null) as string | null,
  messageId: (raw.messageId ?? raw.MessageId ?? null) as string | null,
  details: (raw.details ?? raw.Details ?? null) as string | null,
  createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
});

export const resolveStreamerId = async (channelNickname: string, mode: 'own' | 'delegated', profileId?: number) => {
  if (mode === 'own' && profileId) return profileId;

  const accessResult = await fetchStreamTeamAccess(channelNickname);
  return accessResult.access?.streamerId;
};

export const fetchStreamChatSettings = async (streamerId: number) => {
  const result = await handleApiRequest<Record<string, unknown>>(`${apiBase()}/${streamerId}/chat/settings`, {
    credentials: 'include',
    headers: authHeaders(),
  });

  if (!result.success || !result.data) {
    return { success: false as const, message: result.message };
  }

  return { success: true as const, settings: normalizeSettings(result.data) };
};

export const updateStreamChatSettings = async (streamerId: number, payload: Partial<StreamChatSettings>) => {
  const result = await handleApiRequest<Record<string, unknown>>(`${apiBase()}/${streamerId}/chat/settings`, {
    method: 'PUT',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify({
      slowModeSeconds: payload.slowModeSeconds,
      chatRules: payload.chatRules,
      chatRulesTitle: payload.chatRulesTitle,
      chatMode: payload.chatMode,
    }),
  });

  if (!result.success || !result.data) {
    return { success: false as const, message: result.message };
  }

  return { success: true as const, settings: normalizeSettings(result.data) };
};

export const fetchStreamModerationLog = async (streamerId: number, page = 1) => {
  const result = await handleApiRequest<{
    items: Record<string, unknown>[];
    total: number;
  }>(`${apiBase()}/${streamerId}/chat/modlog?page=${page}&pageSize=30`, {
    credentials: 'include',
    headers: authHeaders(),
  });

  if (!result.success || !result.data) {
    return { success: false as const, message: result.message };
  }

  return {
    success: true as const,
    items: (result.data.items ?? []).map(normalizeLogEntry),
    total: Number(result.data.total ?? 0),
  };
};
