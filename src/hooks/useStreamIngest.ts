import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store/store';
import { useAppSelector } from './redux';
import { fetchStreamKey } from '../store/actions/StreamActions';
import { postStreamKey } from '../store/actions/SettingsActions';
import { getRtmpServerUrl } from '../utils/getRtmpServerUrl';

/** Ban-status refresh while dashboard is open — keep well under rate limits. */
const BLOCK_POLL_MS = 120_000;

/** Stream ingest credentials — only for the channel owner (never moderators). */
export const useStreamIngest = (enabled: boolean) => {
  const dispatch = useDispatch<AppDispatch>();
  const { data, isError, isLoading } = useAppSelector((state) => state.settings);
  const [showKey, setShowKey] = useState(false);

  const loadKey = useCallback(() => {
    if (!enabled) return;
    dispatch(fetchStreamKey());
  }, [dispatch, enabled]);

  useEffect(() => {
    if (!enabled) return;

    loadKey();

    const timer = window.setInterval(loadKey, BLOCK_POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, loadKey]);

  const regenerateKey = useCallback(() => {
    if (!enabled) return;
    dispatch(postStreamKey()).then(() => {
      // Keep block status after key reset (PUT streamKey may return only the key).
      dispatch(fetchStreamKey({ force: true }));
    });
  }, [dispatch, enabled]);

  return {
    streamKey: data?.streamKey ?? '',
    rtmpUrl: getRtmpServerUrl(),
    showKey,
    setShowKey,
    isError: isError ? String(isError) : null,
    isLoading,
    streamingBlocked: Boolean(data?.streamingBlocked),
    blockMessage: data?.blockMessage ?? null,
    blockType: data?.blockType ?? null,
    blockReason: data?.blockReason ?? null,
    blockExpiresAt: data?.blockExpiresAt ?? null,
    blockSanctionId: data?.blockSanctionId ?? null,
    loadKey,
    regenerateKey,
  };
};
