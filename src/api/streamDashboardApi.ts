import { handleApiRequest } from '../utils/handleApiRequest';
import { authHeaders, sessionAuthHeaders } from './httpClient';

export type StreamDashboardSettings = {
  streamName: string;
  categoryId?: number | null;
  categoryName?: string | null;
  tags: string[];
  language: string;
  previewUrl?: string | null;
  isLive: boolean;
  subscriberCount: number;
  startedAt?: string | null;
};

const apiBase = () => `${process.env.REACT_APP_API_LOCAL}/api/streamers`;

const normalizeSettings = (raw: Record<string, unknown>): StreamDashboardSettings => ({
  streamName: String(raw.streamName ?? raw.StreamName ?? ''),
  categoryId: (raw.categoryId ?? raw.CategoryId ?? null) as number | null,
  categoryName: (raw.categoryName ?? raw.CategoryName ?? null) as string | null,
  tags: (() => {
    const rawTags = raw.tags ?? raw.Tags;
    return Array.isArray(rawTags) ? rawTags.map((tag) => String(tag)) : [];
  })(),
  language: String(raw.language ?? raw.Language ?? 'ru'),
  previewUrl: (raw.previewUrl ?? raw.PreviewUrl ?? null) as string | null,
  isLive: Boolean(raw.isLive ?? raw.IsLive),
  subscriberCount: Number(raw.subscriberCount ?? raw.SubscriberCount ?? 0),
  startedAt: (raw.startedAt ?? raw.StartedAt ?? null) as string | null,
});

export const fetchStreamDashboardSettings = async (streamerId: number) => {
  const result = await handleApiRequest<Record<string, unknown>>(`${apiBase()}/${streamerId}/stream/settings`, {
    credentials: 'include',
    headers: authHeaders(),
  });

  if (!result.success || !result.data) {
    return { success: false as const, message: result.message };
  }

  return { success: true as const, settings: normalizeSettings(result.data) };
};

export const updateStreamDashboardSettings = async (streamerId: number, payload: Partial<StreamDashboardSettings>) => {
  const result = await handleApiRequest<Record<string, unknown>>(`${apiBase()}/${streamerId}/stream/settings`, {
    method: 'PUT',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify({
      streamName: payload.streamName,
      categoryId: payload.categoryId,
      tags: payload.tags,
      language: payload.language,
    }),
  });

  if (!result.success || !result.data) {
    return { success: false as const, message: result.message };
  }

  return { success: true as const, settings: normalizeSettings(result.data) };
};

export const uploadStreamDashboardPreview = async (streamerId: number, file: File) => {
  const formData = new FormData();
  formData.append('previewImage', file);

  try {
    const response = await fetch(`${apiBase()}/${streamerId}/stream/preview`, {
      method: 'PUT',
      credentials: 'include',
      headers: sessionAuthHeaders(),
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false as const,
        message: String(data.message ?? data.error ?? 'Не удалось загрузить превью'),
      };
    }

    const settingsRaw = (data.settings ?? data) as Record<string, unknown>;
    return {
      success: true as const,
      settings: normalizeSettings(settingsRaw),
      previewUrl: String(data.previewUrl ?? settingsRaw.previewUrl ?? settingsRaw.PreviewUrl ?? ''),
    };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : 'Не удалось загрузить превью',
    };
  }
};
