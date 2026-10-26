import { AppDispatch } from '../store';
// actions, utils
import { userProfile } from './UserActions';
import { ensureAccessToken } from '../../api/authSession';
import { apiFetch, sessionAuthHeaders } from '../../api/httpClient';
// types
import { handleApiRequest } from '../../utils/handleApiRequest';
import { SettingsSlice } from '../slices/SettingsSlice';
import { RootState } from '../store';

const { SettingsSliceFetch, SettingsSliceError, SettingsSliceSuccess } = SettingsSlice.actions;

export const changeProfileData = (data: FormData) => async (dispatch: AppDispatch) => {
  const token = await ensureAccessToken();
  if (!token) return { success: false, message: 'Вы не авторизованы' };
  const result = await handleApiRequest(`${process.env.REACT_APP_API_SETTINGS}/profile`, {
    method: 'PUT',
    credentials: 'include',
    headers: sessionAuthHeaders(),
    body: data,
  });
  // Refresh profile after upload so Avatar picks up the new unique /media/... URL.
  if (result.success) {
    await dispatch(userProfile());
  }
  return result;
};

export const postStreamKey = () => async (dispatch: AppDispatch, getState: () => RootState) => {
  try {
    dispatch(SettingsSliceFetch());
    const token = await ensureAccessToken();
    if (!token) return;
    const response = await apiFetch(`${process.env.REACT_APP_API_SETTINGS}/streamKey`, {
      method: 'PUT',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      dispatch(
        SettingsSliceError(data.message || data.error || data.Message || data.Error || 'Не удалось поменять ключ')
      );
      return;
    }

    const prev = getState().settings.data;
    dispatch(
      SettingsSliceSuccess({
        ...(prev ?? { streamKey: '' }),
        streamKey: data.streamKey ?? data.StreamKey ?? '',
      })
    );
  } catch (error: any) {
    dispatch(SettingsSliceError(error.message || 'Не удалось поменять ключ'));
  }
};

// update stream info
export const updateCurrentStream = async (values: FormData) => {
  const token = await ensureAccessToken();
  if (!token) return { success: false, message: 'Вы не авторизованы' };
  return handleApiRequest(`${process.env.REACT_APP_API_SETTINGS}/stream`, {
    method: 'PUT',
    credentials: 'include',
    headers: sessionAuthHeaders(),
    body: values,
  });
};

export type LoginHistoryItem = {
  id: number;
  loggedInAt: string;
  ipAddress: string;
  deviceType: string;
};

export type LoginHistoryPage = {
  items: LoginHistoryItem[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
};

const mapLoginHistoryRow = (row: any): LoginHistoryItem => ({
  id: row.id ?? row.Id,
  loggedInAt: row.loggedInAt ?? row.LoggedInAt,
  ipAddress: row.ipAddress ?? row.IpAddress,
  deviceType: row.deviceType ?? row.DeviceType,
});

export const fetchLoginHistory = async (
  skip = 0,
  take = 5
): Promise<{ success: boolean; data?: LoginHistoryPage; message?: string }> => {
  const token = await ensureAccessToken();
  if (!token) return { success: false, message: 'Вы не авторизованы' };

  try {
    const response = await apiFetch(`${process.env.REACT_APP_API_SETTINGS}/login-history?skip=${skip}&take=${take}`, {
      method: 'GET',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, message: error.message || error.error || 'Не удалось загрузить историю входов' };
    }
    const data = await response.json();
    // Backward-compat if API ever returns a bare array.
    if (Array.isArray(data)) {
      const items = data.map(mapLoginHistoryRow);
      return {
        success: true,
        data: {
          items,
          total: items.length,
          skip,
          take,
          hasMore: false,
        },
      };
    }

    const itemsRaw = data.items ?? data.Items ?? [];
    const items = (Array.isArray(itemsRaw) ? itemsRaw : []).map(mapLoginHistoryRow);
    const total = data.total ?? data.Total ?? items.length;
    const hasMore = data.hasMore ?? data.HasMore ?? skip + items.length < total;

    return {
      success: true,
      data: {
        items,
        total,
        skip: data.skip ?? data.Skip ?? skip,
        take: data.take ?? data.Take ?? take,
        hasMore: Boolean(hasMore),
      },
    };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Не удалось загрузить историю входов' };
  }
};

export type AuthSession = {
  id: number;
  deviceLabel: string;
  deviceCategory: string;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
};

const mapAuthSession = (row: any): AuthSession => ({
  id: row.id ?? row.Id,
  deviceLabel: row.deviceLabel ?? row.DeviceLabel ?? 'Неизвестно',
  deviceCategory: row.deviceCategory ?? row.DeviceCategory ?? 'Unknown',
  createdAt: row.createdAt ?? row.CreatedAt,
  lastSeenAt: row.lastSeenAt ?? row.LastSeenAt,
  isCurrent: Boolean(row.isCurrent ?? row.IsCurrent),
});

export const fetchAuthSessions = async (): Promise<{
  success: boolean;
  data?: AuthSession[];
  message?: string;
}> => {
  const token = await ensureAccessToken();
  if (!token) return { success: false, message: 'Вы не авторизованы' };

  try {
    const response = await apiFetch(`${process.env.REACT_APP_API_SETTINGS}/sessions`, { method: 'GET' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, message: error.message || error.error || 'Не удалось загрузить сеансы' };
    }
    const data = await response.json();
    const raw = data.sessions ?? data.Sessions ?? [];
    return { success: true, data: (Array.isArray(raw) ? raw : []).map(mapAuthSession) };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Не удалось загрузить сеансы' };
  }
};

export const revokeAuthSession = async (
  sessionId: number
): Promise<{ success: boolean; currentRevoked?: boolean; message?: string }> => {
  const token = await ensureAccessToken();
  if (!token) return { success: false, message: 'Вы не авторизованы' };

  try {
    const response = await apiFetch(`${process.env.REACT_APP_API_SETTINGS}/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, message: body.message || body.error || 'Не удалось завершить сеанс' };
    }
    return {
      success: true,
      currentRevoked: Boolean(body.currentRevoked ?? body.CurrentRevoked),
      message: body.message,
    };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Не удалось завершить сеанс' };
  }
};

export const revokeOtherAuthSessions = async (): Promise<{ success: boolean; message?: string }> => {
  const token = await ensureAccessToken();
  if (!token) return { success: false, message: 'Вы не авторизованы' };

  try {
    const response = await apiFetch(`${process.env.REACT_APP_API_SETTINGS}/sessions/revoke-others`, {
      method: 'POST',
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, message: body.message || body.error || 'Не удалось завершить сеансы' };
    }
    return { success: true, message: body.message };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Не удалось завершить сеансы' };
  }
};

export const revokeAllAuthSessions = async (): Promise<{
  success: boolean;
  currentRevoked?: boolean;
  message?: string;
}> => {
  const token = await ensureAccessToken();
  if (!token) return { success: false, message: 'Вы не авторизованы' };

  try {
    const response = await apiFetch(`${process.env.REACT_APP_API_SETTINGS}/sessions/revoke-all`, {
      method: 'POST',
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, message: body.message || body.error || 'Не удалось завершить сеансы' };
    }
    return {
      success: true,
      currentRevoked: Boolean(body.currentRevoked ?? body.CurrentRevoked ?? true),
      message: body.message,
    };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Не удалось завершить сеансы' };
  }
};

// get category
export const fetchCategory = async (search?: string) => {
  const token = await ensureAccessToken();
  if (!token) return { success: false, message: 'Вы не авторизованы' };

  const url = search
    ? `${process.env.REACT_APP_API_SETTINGS}/categories?search=${encodeURIComponent(search)}&page=1&pageSize=20`
    : `${process.env.REACT_APP_API_SETTINGS}/categories?page=1&pageSize=20`;

  try {
    const response = await apiFetch(url, {
      method: 'GET',
    });

    console.log('fetchCategory', response);

    if (!response.ok) {
      const text = await response.text(); // читаем HTML или текст ошибки
      return { success: false, message: `Ошибка сервера ${response.status}: ${text}`, code: response.status };
    }

    const data = await response.json(); // безопасно читаем JSON
    return { success: true, data, message: 'OK', code: response.status };
  } catch (error: any) {
    return { success: false, message: error.message || 'Неизвестная ошибка' };
  }
};

//  "page": 1,
//   "pageSize": 20,
//   "totalCategories": 0,
//   "categories": [
// "Name", "Type", "Description", "Slug", "BannerImageUrl"]
