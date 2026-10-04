import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector } from './redux';
import { fetchStreamTeamAccess } from '../api/streamTeamApi';
import {
  fetchStreamChatSettings,
  fetchStreamModerationLog,
  StreamChatModerationLogEntry,
  StreamChatSettings,
  updateStreamChatSettings,
} from '../api/streamChatApi';

export const useStreamChatSettings = (channelNickname: string, mode: 'own' | 'delegated') => {
  const { data: profile } = useAppSelector((state) => state.user);
  const [settings, setSettings] = useState<StreamChatSettings>({
    slowModeSeconds: 0,
    chatRules: '',
    chatRulesTitle: '',
    chatMode: 'normal',
  });
  const [modLog, setModLog] = useState<StreamChatModerationLogEntry[]>([]);
  const [canManageChat, setCanManageChat] = useState(false);
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
        setCanManageChat(true);
      } else {
        const accessResult = await fetchStreamTeamAccess(channelNickname);
        if (!accessResult.success) {
          setError(accessResult.message);
          setCanManageChat(false);
          return;
        }

        const canManage = Boolean(accessResult.access?.canManageChat);
        setCanManageChat(canManage);
        streamerIdRef.current = accessResult.access?.streamerId;

        if (!canManage || !streamerIdRef.current) {
          return;
        }
      }

      const streamerId = streamerIdRef.current;
      if (!streamerId) return;

      const [settingsResult, logResult] = await Promise.all([
        fetchStreamChatSettings(streamerId),
        fetchStreamModerationLog(streamerId),
      ]);

      if (!settingsResult.success) {
        setError(settingsResult.message);
        return;
      }

      setSettings(settingsResult.settings);
      if (logResult.success) {
        setModLog(logResult.items);
      }
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, mode, channelNickname]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = useCallback(
    async (patch: Partial<StreamChatSettings>) => {
      const streamerId = streamerIdRef.current;
      if (!streamerId) return false;

      setIsSaving(true);
      setActionError(null);

      const result = await updateStreamChatSettings(streamerId, {
        slowModeSeconds: patch.slowModeSeconds ?? settings.slowModeSeconds,
        chatRules: patch.chatRules ?? settings.chatRules,
        chatRulesTitle: patch.chatRulesTitle ?? settings.chatRulesTitle,
        chatMode: patch.chatMode ?? settings.chatMode,
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

  const reloadModLog = useCallback(async () => {
    const streamerId = streamerIdRef.current;
    if (!streamerId) return;

    const logResult = await fetchStreamModerationLog(streamerId);
    if (logResult.success) {
      setModLog(logResult.items);
    }
  }, []);

  return {
    settings,
    modLog,
    canManageChat,
    isLoading,
    error,
    actionError,
    isSaving,
    saveSettings,
    reloadModLog,
    reload: load,
  };
};
