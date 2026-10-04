// store, slices
import { AppDispatch } from '../store';
import { SettingsSlice } from '../slices/SettingsSlice';
import { StreamSlice } from '../slices/StreamSlice';
// utils
import { ensureAccessToken } from '../../api/authSession';
import { apiFetch, authHeaders } from '../../api/httpClient';
import { handleApiRequest } from '../../utils/handleApiRequest';

const { SettingsSliceFetch, SettingsSliceError, SettingsSliceSuccess } = SettingsSlice.actions;
const { StreamSliceError, StreamSliceFetch, StreamSliceSuccess } = StreamSlice.actions;

/** Deduplicate Strict Mode remounts / overlapping polls (same tab). */
let streamKeyInFlight: Promise<void> | null = null;
let streamKeyFetchedAt = 0;
const STREAM_KEY_DEDUP_MS = 3_000;

// stream
export const fetchStreamKey = (opts?: { force?: boolean }) => async (dispatch: AppDispatch) => {
  const force = Boolean(opts?.force);
  const now = Date.now();
  if (!force && streamKeyInFlight) {
    await streamKeyInFlight;
    return;
  }
  if (!force && now - streamKeyFetchedAt < STREAM_KEY_DEDUP_MS) {
    return;
  }

  const run = (async () => {
    try {
      dispatch(SettingsSliceFetch());
      const token = await ensureAccessToken();
      if (!token) return;
      const response = await apiFetch(`${process.env.REACT_APP_API_USER}/stream-key`, {
        method: 'GET',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        dispatch(
          SettingsSliceError(data.message || data.error || data.Message || data.Error || 'Не удалось получить ключ')
        );
        return;
      }

      streamKeyFetchedAt = Date.now();
      dispatch(
        SettingsSliceSuccess({
          streamKey: data.streamKey ?? data.StreamKey ?? '',
          streamingBlocked: Boolean(data.streamingBlocked ?? data.StreamingBlocked),
          blockMessage: (data.blockMessage ?? data.BlockMessage ?? null) as string | null,
          blockType: (data.blockType ?? data.BlockType ?? null) as string | null,
          blockReason: (data.blockReason ?? data.BlockReason ?? null) as string | null,
          blockExpiresAt: (data.blockExpiresAt ?? data.BlockExpiresAt ?? null) as string | null,
          blockSanctionId: (data.blockSanctionId ?? data.BlockSanctionId ?? null) as number | null,
        })
      );
    } catch (error: any) {
      dispatch(SettingsSliceError(error.message || 'Не удалось получить ключ'));
    }
  })();

  streamKeyInFlight = run.finally(() => {
    streamKeyInFlight = null;
  });
  await streamKeyInFlight;
};

// Получение StreamView
export const fetchStreamView = (nickname: string) => async (dispatch: AppDispatch) => {
  try {
    dispatch(StreamSliceFetch());
    const response = await fetch(`${process.env.REACT_APP_API_STREAM_VIEW}/${nickname}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      dispatch(
        StreamSliceError(data.message || data.error || data.Message || data.Error || 'Не удалось загрузить стрим')
      );
      return;
    }
    dispatch(StreamSliceSuccess(data));
  } catch (error) {
    dispatch(StreamSliceError(error));
  }
};

// get stream status
export const fetchStatusCurrentStream = async () => {
  const token = await ensureAccessToken();
  if (!token) return { success: false, message: 'Вы не авторизованы' };
  return handleApiRequest(`${process.env.REACT_APP_API_STREAM}/status`, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(),
  });
};
