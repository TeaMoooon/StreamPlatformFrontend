import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector } from './redux';
import { fetchCategory } from '../store/actions/SettingsActions';
import { fetchStreamTeamAccess } from '../api/streamTeamApi';
import {
  fetchStreamDashboardSettings,
  StreamDashboardSettings,
  updateStreamDashboardSettings,
  uploadStreamDashboardPreview,
} from '../api/streamDashboardApi';
import { ICategories } from '../types/share';

export { STREAM_LANGUAGE_OPTIONS } from '../constants/streamLanguage.constants';

export const useStreamDashboardSettings = (channelNickname: string, mode: 'own' | 'delegated') => {
  const { data: profile } = useAppSelector((state) => state.user);
  const [settings, setSettings] = useState<StreamDashboardSettings | null>(null);
  const [categories, setCategories] = useState<ICategories[]>([]);
  const [canManageStream, setCanManageStream] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const streamerIdRef = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    if (!profile?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'own') {
        streamerIdRef.current = profile.id;
        setCanManageStream(true);
      } else {
        const accessResult = await fetchStreamTeamAccess(channelNickname);
        if (!accessResult.success) {
          setError(accessResult.message);
          setCanManageStream(false);
          return;
        }

        const canManage = Boolean(accessResult.access?.canManageStream);
        setCanManageStream(canManage);
        streamerIdRef.current = accessResult.access?.streamerId;

        if (!canManage || !streamerIdRef.current) {
          return;
        }
      }

      const streamerId = streamerIdRef.current;
      if (!streamerId) return;

      const [settingsResult, categoriesResult] = await Promise.all([
        fetchStreamDashboardSettings(streamerId),
        fetchCategory(),
      ]);

      if (!settingsResult.success) {
        setError(settingsResult.message);
        return;
      }

      setSettings(settingsResult.settings);

      if (categoriesResult.success && categoriesResult.data?.categories) {
        setCategories(categoriesResult.data.categories);
      }
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, mode, channelNickname]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = useCallback(
    async (patch: Partial<StreamDashboardSettings>) => {
      const streamerId = streamerIdRef.current;
      if (!streamerId || !settings) return false;

      setIsSaving(true);
      setActionError(null);

      const result = await updateStreamDashboardSettings(streamerId, {
        streamName: patch.streamName ?? settings.streamName,
        categoryId: patch.categoryId ?? settings.categoryId ?? undefined,
        tags: patch.tags ?? settings.tags,
        language: patch.language ?? settings.language,
      });

      setIsSaving(false);

      if (!result.success) {
        setActionError(result.message);
        return false;
      }

      setSettings(result.settings);
      return true;
    },
    [settings]
  );

  const uploadPreview = useCallback(async (file: File) => {
    const streamerId = streamerIdRef.current;
    if (!streamerId) return { success: false as const, message: 'Канал не найден' };

    setIsSaving(true);
    setActionError(null);

    const result = await uploadStreamDashboardPreview(streamerId, file);

    setIsSaving(false);

    if (!result.success) {
      setActionError(result.message);
      return result;
    }

    setSettings(result.settings);
    return result;
  }, []);

  return {
    settings,
    categories,
    canManageStream,
    isLoading,
    error,
    actionError,
    isSaving,
    saveSettings,
    uploadPreview,
    reload: load,
  };
};
