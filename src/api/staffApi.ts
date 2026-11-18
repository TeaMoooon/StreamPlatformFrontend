import { authHeaders } from './httpClient';
import { handleApiRequest } from '../utils/handleApiRequest';

const apiLocal = () => process.env.REACT_APP_API_LOCAL;

export type StaffRole = 'User' | 'Support' | 'SupportLead' | 'Safety' | 'SafetyLead' | 'Admin' | 'Owner';

export const STAFF_ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'User', label: 'User (обычный)' },
  { value: 'Support', label: 'Support' },
  { value: 'SupportLead', label: 'Support · руководитель' },
  { value: 'Safety', label: 'Safety' },
  { value: 'SafetyLead', label: 'Safety · руководитель' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Owner', label: 'Owner' },
];

/** Normalize legacy role strings from older JWT / API payloads. */
export const normalizeStaffRole = (role: string | null | undefined): string => {
  if (!role) return 'User';
  if (role === 'Moderator') return 'Safety';
  if (role === 'SuperAdmin') return 'Owner';
  return role;
};

export type StaffUserSearch = {
  id: number;
  nickname: string;
  email?: string | null;
  role: string;
  createdAt: string;
  activeSanctionCount: number;
};

export type StaffUserSanction = {
  id: number;
  type: string;
  reason: string;
  createdAt: string;
  expiresAt?: string | null;
};

export type StaffUserDetail = StaffUserSearch & {
  activeSanctions: StaffUserSanction[];
};

export type StaffAuditEntry = {
  id: number;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: string | null;
  createdAt: string;
  actorUserId: number;
  actorNickname?: string | null;
  targetUserId?: number | null;
  targetNickname?: string | null;
};

const normalizeUser = (raw: Record<string, unknown>): StaffUserSearch => ({
  id: Number(raw.id ?? raw.Id ?? 0),
  nickname: String(raw.nickname ?? raw.Nickname ?? ''),
  email: (raw.email ?? raw.Email ?? null) as string | null,
  role: String(raw.role ?? raw.Role ?? 'User'),
  createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
  activeSanctionCount: Number(raw.activeSanctionCount ?? raw.ActiveSanctionCount ?? 0),
});

const normalizeDetail = (raw: Record<string, unknown>): StaffUserDetail => {
  const sanctionsRaw = (raw.activeSanctions ?? raw.ActiveSanctions ?? []) as Record<string, unknown>[];
  return {
    ...normalizeUser(raw),
    activeSanctions: (Array.isArray(sanctionsRaw) ? sanctionsRaw : []).map((s) => ({
      id: Number(s.id ?? s.Id ?? 0),
      type: String(s.type ?? s.Type ?? ''),
      reason: String(s.reason ?? s.Reason ?? ''),
      createdAt: String(s.createdAt ?? s.CreatedAt ?? ''),
      expiresAt: (s.expiresAt ?? s.ExpiresAt ?? null) as string | null,
    })),
  };
};

const normalizeAudit = (raw: Record<string, unknown>): StaffAuditEntry => ({
  id: Number(raw.id ?? raw.Id ?? 0),
  action: String(raw.action ?? raw.Action ?? ''),
  entityType: (raw.entityType ?? raw.EntityType ?? null) as string | null,
  entityId: (raw.entityId ?? raw.EntityId ?? null) as string | null,
  details: (raw.details ?? raw.Details ?? null) as string | null,
  createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
  actorUserId: Number(raw.actorUserId ?? raw.ActorUserId ?? 0),
  actorNickname: (raw.actorNickname ?? raw.ActorNickname ?? null) as string | null,
  targetUserId: (raw.targetUserId ?? raw.TargetUserId ?? null) as number | null,
  targetNickname: (raw.targetNickname ?? raw.TargetNickname ?? null) as string | null,
});

export const searchStaffUsers = async (q: string, take = 20) => {
  const qs = new URLSearchParams({ q, take: String(take) });
  const result = await handleApiRequest<Record<string, unknown>[]>(`${apiLocal()}/api/staff/users?${qs}`, {
    headers: authHeaders(),
  });
  if (!result.success || !result.data) {
    return { success: false as const, message: result.message };
  }
  const rows = Array.isArray(result.data) ? result.data : [];
  return { success: true as const, users: rows.map(normalizeUser) };
};

export const fetchStaffUser = async (id: number) => {
  const result = await handleApiRequest<Record<string, unknown>>(`${apiLocal()}/api/staff/users/${id}`, {
    headers: authHeaders(),
  });
  if (!result.success || !result.data) {
    return { success: false as const, message: result.message };
  }
  return { success: true as const, user: normalizeDetail(result.data) };
};

export const setStaffUserRole = async (id: number, role: string) => {
  const result = await handleApiRequest<Record<string, unknown>>(`${apiLocal()}/api/staff/users/${id}/role`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
  if (!result.success || !result.data) {
    return { success: false as const, message: result.message };
  }
  return { success: true as const, user: normalizeDetail(result.data) };
};

export const SANCTION_TYPE_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: 'warning', label: 'Предупреждение', hint: 'Без блокировки, только уведомление' },
  { value: 'chat_mute', label: 'Мут чата', hint: 'Нельзя писать в чат' },
  { value: 'stream_ban', label: 'Бан стрима', hint: 'Нельзя вести трансляцию' },
  { value: 'login_ban', label: 'Бан входа', hint: 'Нельзя зайти на сайт' },
  { value: 'full_ban', label: 'Полный бан', hint: 'Закрыто почти всё' },
];

/** durationMinutes: null = permanent */
export const SANCTION_DURATION_OPTIONS: { value: number | null; label: string }[] = [
  { value: 15, label: '15 минут' },
  { value: 60, label: '1 час' },
  { value: 24 * 60, label: '24 часа' },
  { value: 7 * 24 * 60, label: '7 дней' },
  { value: null, label: 'Бессрочно' },
];

export const issueStaffSanction = async (payload: {
  targetUserId: number;
  type: string;
  reason: string;
  durationMinutes?: number | null;
}) => {
  const result = await handleApiRequest<Record<string, unknown>>(`${apiLocal()}/api/staff/sanctions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      targetUserId: payload.targetUserId,
      type: payload.type,
      reason: payload.reason,
      durationMinutes: payload.durationMinutes ?? null,
    }),
  });
  if (!result.success) {
    return { success: false as const, message: result.message };
  }
  return { success: true as const };
};

export const revokeStaffSanction = async (id: number, reason?: string) => {
  const result = await handleApiRequest<Record<string, unknown>>(`${apiLocal()}/api/staff/sanctions/${id}/revoke`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reason: reason || 'Снято staff' }),
  });
  if (!result.success) {
    return { success: false as const, message: result.message };
  }
  return { success: true as const };
};

export const fetchStaffAudit = async (take = 80) => {
  const qs = new URLSearchParams({ take: String(take) });
  const result = await handleApiRequest<Record<string, unknown>[]>(`${apiLocal()}/api/staff/audit?${qs}`, {
    headers: authHeaders(),
  });
  if (!result.success || !result.data) {
    return { success: false as const, message: result.message };
  }
  const rows = Array.isArray(result.data) ? result.data : [];
  return { success: true as const, entries: rows.map(normalizeAudit) };
};

/** Open/active queue item older than this is highlighted as stale. */
export const STAFF_STALE_HOURS = 24;

export const isStaffQueueStale = (isoDate: string, status: string, openStatuses: string[]) => {
  if (!openStatuses.includes(status)) return false;
  const ts = Date.parse(isoDate);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts > STAFF_STALE_HOURS * 60 * 60 * 1000;
};

export const auditActionLabel = (action: string) => {
  const map: Record<string, string> = {
    role_changed: 'Смена роли',
    sanction_issued: 'Санкция выдана',
    sanction_revoked: 'Санкция снята',
    ticket_replied: 'Ответ в тикете',
    stream_key_reset: 'Сброс ключа',
    report_resolved: 'Жалоба закрыта',
    appeal_created: 'Апелляция создана',
    appeal_reviewed: 'Апелляция рассмотрена',
    staff_access: 'Вход в staff',
  };
  return map[action] || action;
};
