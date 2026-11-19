import { authHeaders } from './httpClient';
import { handleApiRequest } from '../utils/handleApiRequest';

export type TicketCategory = 'account' | 'stream' | 'payments' | 'abuse' | 'other';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';

export type SupportTicketMessage = {
  id: number;
  authorUserId: number;
  authorNickname?: string | null;
  isStaff: boolean;
  body: string;
  createdAt: string;
};

export type SupportTicket = {
  id: number;
  userId: number;
  userNickname?: string | null;
  category: TicketCategory | string;
  subject: string;
  status: TicketStatus | string;
  assigneeUserId?: number | null;
  assigneeNickname?: string | null;
  escalatedReportId?: number | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  messages: SupportTicketMessage[];
};

export const TICKET_CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: 'account', label: 'Аккаунт' },
  { value: 'stream', label: 'Стрим / ключ' },
  { value: 'payments', label: 'Платежи' },
  { value: 'other', label: 'Другое' },
];

/** Labels for existing tickets (including legacy abuse category). */
export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  account: 'Аккаунт',
  stream: 'Стрим / ключ',
  payments: 'Платежи',
  abuse: 'Жалоба (legacy)',
  other: 'Другое',
};

const apiLocal = () => process.env.REACT_APP_API_LOCAL;

const normalizeMessage = (raw: Record<string, unknown>): SupportTicketMessage => ({
  id: Number(raw.id ?? raw.Id ?? 0),
  authorUserId: Number(raw.authorUserId ?? raw.AuthorUserId ?? 0),
  authorNickname: (raw.authorNickname ?? raw.AuthorNickname ?? null) as string | null,
  isStaff: Boolean(raw.isStaff ?? raw.IsStaff),
  body: String(raw.body ?? raw.Body ?? ''),
  createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
});

const normalizeTicket = (raw: Record<string, unknown>): SupportTicket => {
  const messagesRaw = (raw.messages ?? raw.Messages ?? []) as Record<string, unknown>[];
  return {
    id: Number(raw.id ?? raw.Id ?? 0),
    userId: Number(raw.userId ?? raw.UserId ?? 0),
    userNickname: (raw.userNickname ?? raw.UserNickname ?? null) as string | null,
    category: String(raw.category ?? raw.Category ?? ''),
    subject: String(raw.subject ?? raw.Subject ?? ''),
    status: String(raw.status ?? raw.Status ?? ''),
    assigneeUserId: (raw.assigneeUserId ?? raw.AssigneeUserId ?? null) as number | null,
    assigneeNickname: (raw.assigneeNickname ?? raw.AssigneeNickname ?? null) as string | null,
    escalatedReportId: (raw.escalatedReportId ?? raw.EscalatedReportId ?? null) as number | null,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
    updatedAt: String(raw.updatedAt ?? raw.UpdatedAt ?? ''),
    resolvedAt: (raw.resolvedAt ?? raw.ResolvedAt ?? null) as string | null,
    messages: Array.isArray(messagesRaw) ? messagesRaw.map(normalizeMessage) : [],
  };
};

export const fetchMyTickets = async () => {
  const result = await handleApiRequest<Record<string, unknown>[]>(`${apiLocal()}/api/support/tickets`, {
    headers: authHeaders(),
  });
  if (!result.success || !result.data) return { success: false as const, message: result.message };
  const rows = Array.isArray(result.data) ? result.data : [];
  return { success: true as const, tickets: rows.map(normalizeTicket) };
};

export const createSupportTicket = async (payload: { category: TicketCategory; subject: string; message: string }) => {
  const result = await handleApiRequest<Record<string, unknown>>(`${apiLocal()}/api/support/tickets`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!result.success || !result.data) return { success: false as const, message: result.message };
  return { success: true as const, ticket: normalizeTicket(result.data) };
};

export const replyMyTicket = async (id: number, message: string) => {
  const result = await handleApiRequest<Record<string, unknown>>(`${apiLocal()}/api/support/tickets/${id}/messages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message }),
  });
  if (!result.success || !result.data) return { success: false as const, message: result.message };
  return { success: true as const, ticket: normalizeTicket(result.data) };
};

export const fetchStaffTickets = async (status = 'open', take = 50) => {
  const qs = new URLSearchParams({ take: String(take) });
  if (status) qs.set('status', status);
  const result = await handleApiRequest<Record<string, unknown>[]>(`${apiLocal()}/api/staff/tickets?${qs}`, {
    headers: authHeaders(),
  });
  if (!result.success || !result.data) return { success: false as const, message: result.message };
  const rows = Array.isArray(result.data) ? result.data : [];
  return { success: true as const, tickets: rows.map(normalizeTicket) };
};

export const replyStaffTicket = async (id: number, message: string) => {
  const result = await handleApiRequest<Record<string, unknown>>(`${apiLocal()}/api/staff/tickets/${id}/messages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message }),
  });
  if (!result.success || !result.data) return { success: false as const, message: result.message };
  return { success: true as const, ticket: normalizeTicket(result.data) };
};

export const updateStaffTicket = async (
  id: number,
  payload: {
    status?: TicketStatus;
    assignToMe?: boolean;
    escalateToReport?: boolean;
    escalateReason?: string;
    escalateDetails?: string;
    /** Accused user id — required for escalate; must not be the ticket author. */
    escalateTargetUserId?: number;
  }
) => {
  const result = await handleApiRequest<Record<string, unknown>>(`${apiLocal()}/api/staff/tickets/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!result.success || !result.data) return { success: false as const, message: result.message };
  return { success: true as const, ticket: normalizeTicket(result.data) };
};

export const resetTicketStreamKey = async (id: number) => {
  const result = await handleApiRequest<{ message?: string; ticket?: Record<string, unknown> }>(
    `${apiLocal()}/api/staff/tickets/${id}/reset-stream-key`,
    {
      method: 'POST',
      headers: authHeaders(),
    }
  );
  if (!result.success) return { success: false as const, message: result.message };
  return {
    success: true as const,
    message: result.data?.message || 'Ключ сброшен',
    ticket: result.data?.ticket ? normalizeTicket(result.data.ticket) : null,
  };
};
