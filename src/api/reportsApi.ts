import { authHeaders } from './httpClient';
import { handleApiRequest } from '../utils/handleApiRequest';

export type ReportTargetType = 'user' | 'message' | 'channel' | 'stream';

export type ReportReason =
  | 'child_safety'
  | 'terrorism'
  | 'violence'
  | 'sexual'
  | 'self_harm'
  | 'harassment'
  | 'hate'
  | 'spam'
  | 'wrong_category'
  | 'other'
  /** Legacy — old reports may still have this value */
  | 'illegal';

export type ReportStatus = 'new' | 'in_progress' | 'resolved' | 'rejected';

/** Shared UI / staff labels for report reasons. */
export const REPORT_REASON_TITLE: Record<ReportReason, string> = {
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

export type PlatformReportReporter = {
  id: number;
  reporterUserId: number;
  reporterNickname?: string | null;
  details?: string | null;
  createdAt: string;
};

export type PlatformReport = {
  id: number;
  reporterUserId: number;
  reporterNickname?: string | null;
  reporterCount: number;
  reporters: PlatformReportReporter[];
  targetType: ReportTargetType | string;
  targetUserId?: number | null;
  targetNickname?: string | null;
  messageId?: string | null;
  messageSnapshot?: string | null;
  streamerId?: number | null;
  streamerNickname?: string | null;
  streamId?: number | null;
  reason: ReportReason | string;
  details?: string | null;
  status: ReportStatus | string;
  assigneeUserId?: number | null;
  assigneeNickname?: string | null;
  resolutionNote?: string | null;
  linkedSanctionId?: number | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
};

export type CreateReportPayload = {
  targetType: ReportTargetType;
  targetUserId?: number;
  messageId?: string;
  messageSnapshot?: string;
  streamerId?: number;
  streamId?: number;
  reason: ReportReason;
  details?: string;
};

export const REPORT_REASON_OPTIONS: { value: ReportReason; label: string }[] = (
  Object.entries(REPORT_REASON_TITLE) as [ReportReason, string][]
)
  .filter(([value]) => value !== 'illegal')
  .map(([value, label]) => ({ value, label }));

const apiLocal = () => process.env.REACT_APP_API_LOCAL;

const normalizeReporter = (raw: Record<string, unknown>): PlatformReportReporter => ({
  id: Number(raw.id ?? raw.Id ?? 0),
  reporterUserId: Number(raw.reporterUserId ?? raw.ReporterUserId ?? 0),
  reporterNickname: (raw.reporterNickname ?? raw.ReporterNickname ?? null) as string | null,
  details: (raw.details ?? raw.Details ?? null) as string | null,
  createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
});

const normalizeReport = (raw: Record<string, unknown>): PlatformReport => {
  const reportersRaw = (raw.reporters ?? raw.Reporters ?? []) as Record<string, unknown>[];
  const reporters = Array.isArray(reportersRaw) ? reportersRaw.map(normalizeReporter) : [];
  const reporterCount = Number(raw.reporterCount ?? raw.ReporterCount ?? reporters.length ?? 1);

  return {
    id: Number(raw.id ?? raw.Id ?? 0),
    reporterUserId: Number(raw.reporterUserId ?? raw.ReporterUserId ?? 0),
    reporterNickname: (raw.reporterNickname ?? raw.ReporterNickname ?? null) as string | null,
    reporterCount: reporterCount > 0 ? reporterCount : Math.max(reporters.length, 1),
    reporters,
    targetType: String(raw.targetType ?? raw.TargetType ?? ''),
    targetUserId: (raw.targetUserId ?? raw.TargetUserId ?? null) as number | null,
    targetNickname: (raw.targetNickname ?? raw.TargetNickname ?? null) as string | null,
    messageId: (raw.messageId ?? raw.MessageId ?? null) as string | null,
    messageSnapshot: (raw.messageSnapshot ?? raw.MessageSnapshot ?? null) as string | null,
    streamerId: (raw.streamerId ?? raw.StreamerId ?? null) as number | null,
    streamerNickname: (raw.streamerNickname ?? raw.StreamerNickname ?? null) as string | null,
    streamId: (raw.streamId ?? raw.StreamId ?? null) as number | null,
    reason: String(raw.reason ?? raw.Reason ?? ''),
    details: (raw.details ?? raw.Details ?? null) as string | null,
    status: String(raw.status ?? raw.Status ?? ''),
    assigneeUserId: (raw.assigneeUserId ?? raw.AssigneeUserId ?? null) as number | null,
    assigneeNickname: (raw.assigneeNickname ?? raw.AssigneeNickname ?? null) as string | null,
    resolutionNote: (raw.resolutionNote ?? raw.ResolutionNote ?? null) as string | null,
    linkedSanctionId: (raw.linkedSanctionId ?? raw.LinkedSanctionId ?? null) as number | null,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
    updatedAt: String(raw.updatedAt ?? raw.UpdatedAt ?? ''),
    resolvedAt: (raw.resolvedAt ?? raw.ResolvedAt ?? null) as string | null,
  };
};

export const createPlatformReport = async (payload: CreateReportPayload) => {
  const result = await handleApiRequest<Record<string, unknown>>(`${apiLocal()}/api/reports`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!result.success || !result.data) {
    return { success: false as const, message: result.message };
  }

  return { success: true as const, report: normalizeReport(result.data) };
};

export const fetchStaffMe = async () => {
  const result = await handleApiRequest<Record<string, unknown>>(`${apiLocal()}/api/staff/me`, {
    headers: authHeaders(),
  });

  if (!result.success || !result.data) {
    return { success: false as const, message: result.message };
  }

  const permissions = (result.data.permissions ?? result.data.Permissions ?? {}) as Record<string, unknown>;
  const rawRole = String(result.data.role ?? result.data.Role ?? '');
  const role = rawRole === 'Moderator' ? 'Safety' : rawRole === 'SuperAdmin' ? 'Owner' : rawRole;
  return {
    success: true as const,
    userId: Number(result.data.userId ?? result.data.UserId ?? 0),
    nickname: String(result.data.nickname ?? result.data.Nickname ?? ''),
    role,
    permissions: {
      canAccessStaffPanel: Boolean(permissions.canAccessStaffPanel ?? permissions.CanAccessStaffPanel),
      canManageTickets: Boolean(permissions.canManageTickets ?? permissions.CanManageTickets),
      canModeratePlatform: Boolean(permissions.canModeratePlatform ?? permissions.CanModeratePlatform),
      canManageStaffRoles: Boolean(permissions.canManageStaffRoles ?? permissions.CanManageStaffRoles),
    },
  };
};

export const fetchStaffReports = async (status = 'open', take = 50) => {
  const qs = new URLSearchParams({ take: String(take) });
  if (status) qs.set('status', status);
  const result = await handleApiRequest<Record<string, unknown>[]>(`${apiLocal()}/api/staff/reports?${qs}`, {
    headers: authHeaders(),
  });

  if (!result.success || !result.data) {
    return { success: false as const, message: result.message };
  }

  const rows = Array.isArray(result.data) ? result.data : [];
  return { success: true as const, reports: rows.map(normalizeReport) };
};

export const updateStaffReport = async (
  id: number,
  payload: {
    status?: ReportStatus;
    resolutionNote?: string;
    assignToMe?: boolean;
    sanction?: {
      targetUserId: number;
      type: string;
      reason: string;
      durationMinutes?: number | null;
    };
  }
) => {
  const result = await handleApiRequest<Record<string, unknown>>(`${apiLocal()}/api/staff/reports/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!result.success || !result.data) {
    return { success: false as const, message: result.message };
  }

  return { success: true as const, report: normalizeReport(result.data) };
};
