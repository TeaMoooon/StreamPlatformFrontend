import * as signalR from '@microsoft/signalr';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IChatMessage, IProfile } from '../../types/share';
import { CHAT_MAX_MESSAGE_LENGTH } from '../../components/chat/chat.constants';
import {
  mapChatError,
  normalizeChatMessage,
  normalizeChatMode,
  getChatModeChangeNotice,
  isSystemChatMessage,
  appendSystemChatNotice,
  dedupeSystemChatMessages,
} from '../../components/chat/chat.utils';
import type { ChatMode } from '../../components/chat/chat.constants';

type LocalChatMessage = IChatMessage & { clientId?: string };

const toSafeNumber = (value: unknown, fallback = 0) => {
  try {
    const normalized = Number(value ?? fallback);
    return Number.isFinite(normalized) ? normalized : fallback;
  } catch {
    return fallback;
  }
};

const isValidChatMessage = (message: IChatMessage) => message.userId > 0 && Boolean(message.username?.trim());

export const useChat = (hub: signalR.HubConnection | null, streamNickname?: string, profile?: IProfile | null) => {
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [slowModeSeconds, setSlowModeSeconds] = useState(0);
  const [chatRules, setChatRules] = useState('');
  const [chatRulesTitle, setChatRulesTitle] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('normal');
  const [canSendChat, setCanSendChat] = useState(true);
  const [canManageChat, setCanManageChat] = useState(false);
  const [bannedUserIds, setBannedUserIds] = useState<number[]>([]);
  const [inputRestore, setInputRestore] = useState<string | null>(null);
  const lastSuccessfulSentAtRef = useRef(0);
  const slowModeSecondsRef = useRef(0);
  const canManageChatRef = useRef(false);
  const chatModeRef = useRef<ChatMode>('normal');
  const isInitialChatSettingsRef = useRef(true);
  const sendRejectedRef = useRef(false);
  const sessionRef = useRef(0);

  useEffect(() => {
    sessionRef.current += 1;
    isInitialChatSettingsRef.current = true;
    lastSuccessfulSentAtRef.current = 0;
    slowModeSecondsRef.current = 0;
    canManageChatRef.current = false;
    chatModeRef.current = 'normal';
    sendRejectedRef.current = false;
    setMessages([]);
    setChatError(null);
    setSlowModeSeconds(0);
    setChatRules('');
    setChatRulesTitle('');
    setChatMode('normal');
    setCanSendChat(true);
    setCanManageChat(false);
    setBannedUserIds([]);
    setInputRestore(null);
  }, [streamNickname]);

  const clearChatError = useCallback(() => setChatError(null), []);

  const consumeInputRestore = useCallback(() => setInputRestore(null), []);

  useEffect(() => {
    slowModeSecondsRef.current = slowModeSeconds;
  }, [slowModeSeconds]);

  const getSlowModeWaitSeconds = useCallback(() => {
    if (canManageChatRef.current) return null;

    const limit = slowModeSecondsRef.current;
    if (limit <= 0 || lastSuccessfulSentAtRef.current <= 0) return null;

    const elapsed = (Date.now() - lastSuccessfulSentAtRef.current) / 1000;
    if (elapsed >= limit) return null;

    return Math.ceil(limit - elapsed);
  }, []);

  const syncSlowModeFromServer = useCallback((waitSeconds: number) => {
    const limit = slowModeSecondsRef.current;
    if (limit <= 0) return;
    lastSuccessfulSentAtRef.current = Date.now() - (limit - waitSeconds) * 1000;
  }, []);

  useEffect(() => {
    chatModeRef.current = chatMode;
  }, [chatMode]);

  useEffect(() => {
    if (!hub) {
      setIsReady(false);
      setCanManageChat(false);
      setCanSendChat(true);
      setChatMode('normal');
      setBannedUserIds([]);
      canManageChatRef.current = false;
      return;
    }

    const sessionId = sessionRef.current;
    const isStaleSession = () => sessionId !== sessionRef.current;

    const handleReceive = (raw: unknown) => {
      if (isStaleSession() || !raw || typeof raw !== 'object' || Array.isArray(raw)) return;
      const msg = normalizeChatMessage(raw as Record<string, unknown>);
      if (!isValidChatMessage(msg)) return;

      if (profile && msg.userId === profile.id) {
        lastSuccessfulSentAtRef.current = Date.now();
      }

      setMessages((prev) => {
        const optimisticIndex = prev.findIndex(
          (item) => item.clientId && item.userId === msg.userId && item.text === msg.text
        );
        const withoutOptimistic =
          optimisticIndex >= 0 ? [...prev.slice(0, optimisticIndex), ...prev.slice(optimisticIndex + 1)] : prev;

        if (msg.id && withoutOptimistic.some((item) => item.id === msg.id)) {
          return withoutOptimistic;
        }

        const isDuplicate = withoutOptimistic.some(
          (item) => !msg.id && item.userId === msg.userId && item.text === msg.text && item.timestamp === msg.timestamp
        );

        return isDuplicate ? withoutOptimistic : [...withoutOptimistic, msg];
      });
    };

    const handleHistory = (rawMessages: unknown) => {
      if (isStaleSession() || !Array.isArray(rawMessages)) return;
      setMessages((prev) => {
        const systemNotices = dedupeSystemChatMessages(prev.filter(isSystemChatMessage));
        const history = rawMessages
          .filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === 'object' && !Array.isArray(m))
          .map(normalizeChatMessage);
        const validHistory = history.filter(isValidChatMessage);
        if (systemNotices.length === 0) return validHistory;

        return dedupeSystemChatMessages(
          [...validHistory, ...systemNotices].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        );
      });
    };

    const handleError = (code: string) => {
      if (isStaleSession()) return;
      const errorCode = String(code);
      setChatError(mapChatError(errorCode));

      if (errorCode.startsWith('ChatSlowMode:')) {
        const waitSeconds = Number(errorCode.split(':')[1]);
        if (!Number.isNaN(waitSeconds)) {
          syncSlowModeFromServer(waitSeconds);
        }
      }

      setMessages((prev) => {
        if (!profile) return prev;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].clientId && prev[i].userId === profile.id) {
            sendRejectedRef.current = true;
            if (prev[i].text) {
              setInputRestore(prev[i].text);
            }
            return [...prev.slice(0, i), ...prev.slice(i + 1)];
          }
        }
        return prev;
      });
    };

    const handleSettings = (data: Record<string, unknown>) => {
      if (isStaleSession() || !data || typeof data !== 'object' || Array.isArray(data)) return;
      const seconds = data?.slowModeSeconds ?? data?.SlowModeSeconds;
      if (typeof seconds === 'number') {
        setSlowModeSeconds(Math.max(0, seconds));
      }

      const rules = data?.chatRules ?? data?.ChatRules;
      if (typeof rules === 'string') {
        setChatRules(rules);
      }

      const rulesTitle = data?.chatRulesTitle ?? data?.ChatRulesTitle;
      if (typeof rulesTitle === 'string') {
        setChatRulesTitle(rulesTitle);
      }

      const mode = data?.chatMode ?? data?.ChatMode;
      let nextMode: ChatMode | null = null;
      if (mode != null) {
        nextMode = normalizeChatMode(mode);
        if (!isInitialChatSettingsRef.current && nextMode !== chatModeRef.current) {
          const noticeText = getChatModeChangeNotice(nextMode);
          setMessages((prev) => appendSystemChatNotice(prev, noticeText));
        }
        isInitialChatSettingsRef.current = false;
        chatModeRef.current = nextMode;
        setChatMode(nextMode);
      } else {
        isInitialChatSettingsRef.current = false;
      }

      const sendChat = data?.canSendChat ?? data?.CanSendChat;
      if (typeof sendChat === 'boolean') {
        setCanSendChat(sendChat);
      } else if (nextMode === 'subscribers_only' && hub) {
        hub.invoke('LoadChatHistory').catch(console.error);
      } else if (nextMode != null && !canManageChatRef.current) {
        setCanSendChat(true);
      }

      const manage = data?.canManageChat ?? data?.CanManageChat;
      if (typeof manage === 'boolean') {
        canManageChatRef.current = manage;
        setCanManageChat(manage);
      }

      const banned = data?.bannedUserIds ?? data?.BannedUserIds;
      if (Array.isArray(banned)) {
        setBannedUserIds(banned.map((id) => toSafeNumber(id, 0)).filter((id) => id > 0));
      }
    };

    const handleUserBanned = (data: Record<string, unknown>) => {
      if (isStaleSession() || !data || typeof data !== 'object' || Array.isArray(data)) return;
      const userId = toSafeNumber(data?.userId ?? data?.UserId, 0);
      if (!userId) return;
      setBannedUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));

      setMessages((prev) =>
        prev.map((item) => {
          if (item.userId !== userId || item.isDeleted) return item;

          const deletedText = canManageChatRef.current ? item.text : undefined;
          return {
            ...item,
            isDeleted: true,
            text: '',
            deletedText,
          };
        })
      );

      if (profile && profile.id === userId) {
        canManageChatRef.current = false;
        setCanManageChat(false);
        setChatError(mapChatError('ChatBanned'));
      }

      if (data?.removedFromTeam ?? data?.RemovedFromTeam) {
        window.dispatchEvent(
          new CustomEvent('stream-team-member-removed', {
            detail: { userId },
          })
        );
      }
    };

    const handleUserUnbanned = (data: Record<string, unknown>) => {
      if (isStaleSession() || !data || typeof data !== 'object' || Array.isArray(data)) return;
      const userId = toSafeNumber(data?.userId ?? data?.UserId, 0);
      if (!userId) return;
      setBannedUserIds((prev) => prev.filter((id) => id !== userId));
    };

    const handleMessageDeleted = (data: Record<string, unknown>) => {
      if (isStaleSession() || !data || typeof data !== 'object' || Array.isArray(data)) return;
      const messageId = String(data?.messageId ?? data?.MessageId ?? '');
      if (!messageId) return;

      const eventDeletedText = String(data?.deletedText ?? data?.DeletedText ?? '');

      setMessages((prev) =>
        prev.map((item) => {
          if (item.id !== messageId) return item;

          const deletedText = canManageChatRef.current ? eventDeletedText || item.text : undefined;

          return {
            ...item,
            isDeleted: true,
            text: '',
            deletedText,
          };
        })
      );
    };

    const handleUserTimedOut = (_data: Record<string, unknown>) => {
      // broadcast only — targeted user gets block on next send
    };

    const handleNicknameChanged = (data: Record<string, unknown>) => {
      const userId = toSafeNumber(data?.userId ?? data?.UserId, 0);
      const username = String(data?.username ?? data?.Username ?? '').trim();
      if (!userId || !username) return;

      setMessages((prev) => prev.map((item) => (item.userId === userId ? { ...item, username } : item)));
    };

    const handleReconnected = () => {
      hub.invoke('LoadChatHistory').catch(console.error);
    };

    hub.on('ChatUserNicknameChanged', handleNicknameChanged);
    hub.on('ReceiveChatMessage', handleReceive);
    hub.on('LoadChatHistory', handleHistory);
    hub.on('Error', handleError);
    hub.on('ChatSettingsChanged', handleSettings);
    hub.on('ChatMessageDeleted', handleMessageDeleted);
    hub.on('ChatUserTimedOut', handleUserTimedOut);
    hub.on('ChatUserBanned', handleUserBanned);
    hub.on('ChatUserUnbanned', handleUserUnbanned);
    hub.onreconnected(handleReconnected);
    setIsReady(hub.state === signalR.HubConnectionState.Connected);

    return () => {
      hub.off('ChatUserNicknameChanged', handleNicknameChanged);
      hub.off('ReceiveChatMessage', handleReceive);
      hub.off('LoadChatHistory', handleHistory);
      hub.off('Error', handleError);
      hub.off('ChatSettingsChanged', handleSettings);
      hub.off('ChatMessageDeleted', handleMessageDeleted);
      hub.off('ChatUserTimedOut', handleUserTimedOut);
      hub.off('ChatUserBanned', handleUserBanned);
      hub.off('ChatUserUnbanned', handleUserUnbanned);
      setIsReady(false);
    };
  }, [hub, streamNickname, profile, syncSlowModeFromServer]);

  useEffect(() => {
    if (!profile?.id || !profile.nickname) return;

    setMessages((prev) =>
      prev.map((item) => (item.userId === profile.id ? { ...item, username: profile.nickname } : item))
    );
  }, [profile?.id, profile?.nickname]);

  const refreshChatAccess = useCallback(() => {
    if (!hub || hub.state !== signalR.HubConnectionState.Connected) return;
    hub.invoke('LoadChatHistory').catch(console.error);
  }, [hub]);

  useEffect(() => {
    const onSubscriptionChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ subscribed?: boolean }>).detail;
      if (detail?.subscribed) {
        setCanSendChat(true);
        setChatError(null);
      }
      refreshChatAccess();
    };

    window.addEventListener('stream-subscription-changed', onSubscriptionChanged);
    return () => window.removeEventListener('stream-subscription-changed', onSubscriptionChanged);
  }, [refreshChatAccess]);

  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      if (!hub || !isReady || !streamNickname || !profile) return false;

      const trimmed = text.trim();
      if (!trimmed) {
        setChatError(mapChatError('ChatMessageEmpty'));
        return false;
      }

      if (trimmed.length > CHAT_MAX_MESSAGE_LENGTH) {
        setChatError(mapChatError('ChatMessageTooLong'));
        return false;
      }

      const slowModeWait = getSlowModeWaitSeconds();
      if (slowModeWait !== null) {
        setChatError(mapChatError(`ChatSlowMode:${slowModeWait}`));
        return false;
      }

      if (!canSendChat && !canManageChatRef.current) {
        setChatError(
          mapChatError(chatModeRef.current === 'subscribers_only' ? 'ChatSubscribersOnly' : 'ChatForbidden')
        );
        return false;
      }

      setChatError(null);
      sendRejectedRef.current = false;

      const clientId = `local-${Date.now()}`;
      const optimistic: LocalChatMessage = {
        id: '',
        userId: profile.id,
        username: profile.nickname,
        text: trimmed,
        role: 'User',
        timestamp: new Date().toISOString(),
        offsetSeconds: 0,
        clientId,
      };

      setMessages((prev) => [...prev, optimistic]);

      try {
        await hub.invoke('SendChatMessage', trimmed);
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 120);
        });
        if (sendRejectedRef.current) return false;
        return true;
      } catch (error) {
        setMessages((prev) => prev.filter((msg) => msg.clientId !== clientId));
        setInputRestore(trimmed);
        if (!sendRejectedRef.current) {
          setChatError(mapChatError('ChatSendFailed'));
        }
        console.error(error);
        return false;
      }
    },
    [hub, isReady, streamNickname, profile, getSlowModeWaitSeconds, canSendChat]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!hub || !isReady || !messageId) return;

      try {
        await hub.invoke('DeleteChatMessage', messageId);
      } catch (error) {
        setChatError(mapChatError('ChatDeleteFailed'));
        console.error(error);
      }
    },
    [hub, isReady]
  );

  const timeoutUser = useCallback(
    async (targetUserId: number, seconds: number) => {
      if (!hub || !isReady || !targetUserId) return;

      try {
        await hub.invoke('TimeoutChatUser', targetUserId, seconds);
      } catch (error) {
        setChatError(mapChatError('ChatTimeoutFailed'));
        console.error(error);
      }
    },
    [hub, isReady]
  );

  const banUser = useCallback(
    async (targetUserId: number) => {
      if (!hub || !isReady || !targetUserId) return;

      try {
        await hub.invoke('BanChatUser', targetUserId);
      } catch (error) {
        setChatError(mapChatError('ChatBanFailed'));
        console.error(error);
      }
    },
    [hub, isReady]
  );

  const unbanUser = useCallback(
    async (targetUserId: number) => {
      if (!hub || !isReady || !targetUserId) return;

      try {
        await hub.invoke('UnbanChatUser', targetUserId);
      } catch (error) {
        setChatError(mapChatError('ChatUnbanFailed'));
        console.error(error);
      }
    },
    [hub, isReady]
  );

  const setSlowMode = useCallback(
    async (seconds: number) => {
      if (!hub || !isReady) return;

      setChatError(null);

      try {
        await hub.invoke('SetChatSlowMode', seconds);
        setSlowModeSeconds(Math.max(0, seconds));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setChatError(
          message.includes('SetChatSlowMode') || message.includes('not found')
            ? 'Slow mode недоступен — перезапустите backend'
            : mapChatError('ChatSlowModeFailed')
        );
        console.error(error);
      }
    },
    [hub, isReady]
  );

  return {
    messages,
    sendMessage,
    deleteMessage,
    timeoutUser,
    banUser,
    unbanUser,
    chatError,
    clearChatError,
    slowModeSeconds,
    setSlowMode,
    chatRules,
    chatRulesTitle,
    chatMode,
    canSendChat,
    canManageChat,
    bannedUserIds,
    inputRestore,
    consumeInputRestore,
  };
};
