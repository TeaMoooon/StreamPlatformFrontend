import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { ChatCard } from './components/card/ChatCard';
import { getNicknameColor } from '../../utils/getNicknameColor';
import { getMessageKey, isSystemChatMessage } from './chat.utils';
import { ChatSystemNotice } from './components/ChatSystemNotice';
import { CHAT_MAX_MESSAGE_LENGTH, CHAT_SLOW_MODE_COLOR, CHAT_SLOW_MODE_COLOR_RGB, ChatMode } from './chat.constants';
import { getChatModeLabel } from './chat.utils';
import { ChatEmojiPicker } from './ChatEmojiPicker';
import { ChatSlowModeButton } from './ChatSlowModeButton';
import { Box, IconButton, Typography } from '@mui/material';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import SendIcon from '@mui/icons-material/Send';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import CloseIcon from '@mui/icons-material/Close';
import {
  StyledChatContainer,
  StyledChatEmpty,
  StyledChatHeader,
  StyledChatInputArea,
  StyledChatInputWrap,
  StyledChatList,
  StyledChatSendButton,
  StyledChatSendColumn,
  StyledChatTextField,
  StyledChatCharCounter,
  StyledChatErrorToast,
  StyledChatInputField,
  StyledNewMessagesPill,
  StyledChatReplyBar,
  StyledChatReplyLabel,
  StyledChatReplyName,
} from './StyledChat';
import { IChatMessage } from '../../types/share';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';
import { ChatNoticeBanner } from './ChatNoticeBanner';
import { isChatNoticePreferredVisible, setChatNoticePreferredVisible } from './chatNotice.utils';

export const Chat = ({
  setIsOpen,
  messages,
  sendMessage,
  deleteMessage,
  timeoutUser,
  banUser,
  unbanUser,
  bannedUserIds = [],
  chatError,
  clearChatError,
  inputRestore,
  consumeInputRestore,
  slowModeSeconds = 0,
  setSlowMode,
  chatRules = '',
  chatRulesTitle = '',
  chatMode = 'normal',
  canSendChat = true,
  canManageChat = false,
  streamerId,
  layout = 'default',
}: {
  setIsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  messages: IChatMessage[];
  sendMessage: (text: string) => void | Promise<boolean>;
  deleteMessage?: (messageId: string) => void;
  timeoutUser?: (userId: number, seconds: number) => void;
  banUser?: (userId: number) => void;
  unbanUser?: (userId: number) => void;
  bannedUserIds?: number[];
  chatError?: string | null;
  clearChatError?: () => void;
  inputRestore?: string | null;
  consumeInputRestore?: () => void;
  slowModeSeconds?: number;
  setSlowMode?: (seconds: number) => void;
  chatRules?: string;
  chatRulesTitle?: string;
  chatMode?: ChatMode;
  canSendChat?: boolean;
  canManageChat?: boolean;
  streamerId?: number;
  layout?: 'default' | 'fullscreen';
}) => {
  const { isMobile } = useDeviceDetect();
  const isFullscreenLayout = layout === 'fullscreen';
  const { isAuth, data: profile } = useAppSelector((state) => state.user);
  const isStreamer = Boolean(streamerId && profile?.id === streamerId);

  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isNearBottomRef = useRef(true);
  const [text, setText] = useState('');
  const [showNewMessagesPill, setShowNewMessagesPill] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [replyTo, setReplyTo] = useState<{ userId: number; username: string } | null>(null);
  const hasChatNotice = Boolean(chatRules.trim());
  const [noticeVisible, setNoticeVisible] = useState(() => isChatNoticePreferredVisible(streamerId));

  useEffect(() => {
    setNoticeVisible(isChatNoticePreferredVisible(streamerId));
  }, [streamerId]);

  const toggleNoticeVisible = useCallback(() => {
    setNoticeVisible((prev) => {
      const next = !prev;
      if (streamerId) setChatNoticePreferredVisible(streamerId, next);
      return next;
    });
  }, [streamerId]);

  const updateInputExpanded = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 22;
    const paddingY = parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom);
    setIsInputExpanded(el.scrollHeight > lineHeight + paddingY + 2);
  }, []);

  useEffect(() => {
    updateInputExpanded();
  }, [text, updateInputExpanded]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const observer = new ResizeObserver(updateInputExpanded);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateInputExpanded]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    isNearBottomRef.current = true;
    setShowNewMessagesPill(false);
  }, []);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (isNearBottomRef.current) {
      setShowNewMessagesPill(false);
    }
  };

  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom(false);
    } else {
      setShowNewMessagesPill(true);
    }
  }, [messages, scrollToBottom]);

  // Chat height changes when the panel is toggled / video resizes — keep pinned to bottom.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const stickToBottomIfNeeded = () => {
      if (!isNearBottomRef.current) return;
      el.scrollTop = el.scrollHeight;
    };

    stickToBottomIfNeeded();
    const observer = new ResizeObserver(() => {
      stickToBottomIfNeeded();
    });
    observer.observe(el);
    if (el.parentElement) observer.observe(el.parentElement);

    return () => observer.disconnect();
  }, [messages.length === 0]);

  useEffect(() => {
    if (!chatError || !clearChatError) return;
    const timer = window.setTimeout(clearChatError, 6000);
    return () => window.clearTimeout(timer);
  }, [chatError, clearChatError]);

  useEffect(() => {
    if (inputRestore == null || !consumeInputRestore) return;
    setText(inputRestore);
    consumeInputRestore();
  }, [inputRestore, consumeInputRestore]);

  const chatInputBlocked = !isAuth || (!canSendChat && !canManageChat);
  const emoteOnlyLocked = chatMode === 'emote_only' && !canManageChat && isAuth && canSendChat;

  useEffect(() => {
    if (!emoteOnlyLocked) return;
    setReplyTo(null);
    setText((prev) => {
      const remaining = prev
        .replace(/\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*/gu, '')
        .replace(/\s+/g, '');
      return remaining.length === 0 ? prev : '';
    });
  }, [emoteOnlyLocked, chatMode]);

  const handleSend = async () => {
    if (!text.trim() || text.length > CHAT_MAX_MESSAGE_LENGTH) return;
    const ok = await sendMessage(text);
    if (ok) {
      setText('');
      setReplyTo(null);
    }
  };

  const handleReply = useCallback(
    (msg: IChatMessage) => {
      if (emoteOnlyLocked) return;
      setReplyTo({ userId: msg.userId, username: msg.username });
      const mention = `@${msg.username} `;
      setText((prev) => {
        const withoutMention = prev.replace(/^@\S+\s*/, '');
        return withoutMention ? `${mention}${withoutMention}` : mention;
      });
      window.requestAnimationFrame(() => textareaRef.current?.focus());
    },
    [emoteOnlyLocked]
  );

  const handleTextChange = (value: string) => {
    if (value.length > CHAT_MAX_MESSAGE_LENGTH) return;
    if (emoteOnlyLocked) {
      const remaining = value
        .replace(/\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*/gu, '')
        .replace(/\s+/g, '');
      if (remaining.length > 0) return;
    }
    setText(value);
    if (chatError && clearChatError) clearChatError();
  };

  const charsLeft = CHAT_MAX_MESSAGE_LENGTH - text.length;
  const isOverLimit = text.length > CHAT_MAX_MESSAGE_LENGTH;
  const showCharCounter = Boolean(isAuth && isInputExpanded && text.length > 0 && !emoteOnlyLocked);
  const inputDisabled = chatInputBlocked;
  const inputPlaceholder = !isAuth
    ? 'Войдите, чтобы писать в чат'
    : !canSendChat && !canManageChat
      ? chatMode === 'subscribers_only'
        ? 'Чат только для подписчиков канала'
        : 'Нет доступа к чату'
      : emoteOnlyLocked
        ? 'Выберите эмодзи слева'
        : 'Написать сообщение…';

  return (
    <StyledChatContainer>
      <StyledChatHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <ForumOutlinedIcon sx={{ fontSize: 20, color: 'rgba(255,255,255,0.7)' }} />
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#fff', whiteSpace: 'nowrap' }}>Чат</Typography>
          {slowModeSeconds > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: `rgba(${CHAT_SLOW_MODE_COLOR_RGB}, 0.14)`,
                color: CHAT_SLOW_MODE_COLOR,
              }}
            >
              <TimerOutlinedIcon sx={{ fontSize: 14 }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{slowModeSeconds}с</Typography>
            </Box>
          )}
          {chatMode !== 'normal' && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'rgba(142,123,255,0.14)',
                color: '#b8adff',
                maxWidth: 160,
              }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {getChatModeLabel(chatMode)}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {canManageChat && setSlowMode && (
            <ChatSlowModeButton slowModeSeconds={slowModeSeconds} onSetSlowMode={setSlowMode} />
          )}
          {!isMobile && !isFullscreenLayout && setIsOpen && (
            <IconButton
              onClick={() => setIsOpen(false)}
              size="small"
              aria-label="Свернуть чат"
              sx={{
                color: 'rgba(255,255,255,0.6)',
                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          )}
        </Box>
      </StyledChatHeader>

      <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {hasChatNotice && (
          <Box
            component="button"
            type="button"
            onClick={toggleNoticeVisible}
            aria-expanded={noticeVisible}
            aria-label={noticeVisible ? 'Скрыть уведомление' : 'Показать уведомление'}
            title={noticeVisible ? 'Скрыть уведомление' : 'Показать уведомление'}
            sx={{
              position: 'absolute',
              top: 6,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 18,
              m: 0,
              p: 0,
              borderRadius: 999,
              border: '1px solid rgba(184, 173, 255, 0.55)',
              bgcolor: 'rgba(22, 20, 36, 0.96)',
              color: '#d8d0ff',
              cursor: 'pointer',
              lineHeight: 0,
              boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
              '&:hover': {
                color: '#fff',
                borderColor: 'rgba(184,173,255,0.85)',
                bgcolor: 'rgba(40, 34, 64, 0.98)',
              },
            }}
          >
            {noticeVisible ? (
              <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
            ) : (
              <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
            )}
          </Box>
        )}
        {hasChatNotice && noticeVisible && (
          <ChatNoticeBanner title={chatRulesTitle} body={chatRules} onClose={toggleNoticeVisible} />
        )}
        {messages.length === 0 ? (
          <StyledChatEmpty>
            <ForumOutlinedIcon sx={{ fontSize: 40, opacity: 0.35 }} />
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Пока тихо</Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', maxWidth: 200 }}>
              Будьте первым — напишите что-нибудь в чат
            </Typography>
          </StyledChatEmpty>
        ) : (
          <>
            <StyledChatList ref={listRef} onScroll={handleScroll}>
              {messages.map((msg, index) =>
                isSystemChatMessage(msg) ? (
                  <ChatSystemNotice key={getMessageKey(msg, index)} text={msg.text} />
                ) : (
                  <ChatCard
                    customColor={getNicknameColor(msg.username)}
                    msg={msg}
                    key={getMessageKey(msg, index)}
                    isAuth={isAuth}
                    canManageChat={canManageChat}
                    currentUserId={profile?.id}
                    streamerId={streamerId}
                    isStreamer={isStreamer}
                    onReply={emoteOnlyLocked ? undefined : handleReply}
                    onDeleteMessage={deleteMessage}
                    onTimeoutUser={timeoutUser}
                    onBanUser={banUser}
                    onUnbanUser={unbanUser}
                    bannedUserIds={bannedUserIds}
                    currentUserNickname={profile?.nickname}
                  />
                )
              )}
            </StyledChatList>
            {showNewMessagesPill && (
              <StyledNewMessagesPill onClick={() => scrollToBottom(true)} role="button" tabIndex={0}>
                <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
                Новые сообщения
              </StyledNewMessagesPill>
            )}
          </>
        )}
        {chatError && (
          <StyledChatErrorToast role="alert">
            <Typography sx={{ flex: 1, fontSize: 13, color: '#ff8a8a', lineHeight: 1.35 }}>{chatError}</Typography>
            {clearChatError && (
              <IconButton
                size="small"
                onClick={clearChatError}
                aria-label="Закрыть ошибку"
                sx={{ color: 'rgba(255,255,255,0.5)', p: 0.25, mt: '-2px' }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </StyledChatErrorToast>
        )}
      </Box>

      <StyledChatInputArea>
        {replyTo && (
          <StyledChatReplyBar>
            <StyledChatReplyLabel>
              Ответ{' '}
              <StyledChatReplyName nameColor={getNicknameColor(replyTo.username)}>
                @{replyTo.username}
              </StyledChatReplyName>
            </StyledChatReplyLabel>
            <IconButton
              size="small"
              onClick={() => setReplyTo(null)}
              aria-label="Отменить ответ"
              sx={{ color: 'rgba(255,255,255,0.55)', p: 0.25, '&:hover': { color: '#fff' } }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </StyledChatReplyBar>
        )}
        <StyledChatInputWrap expanded={isInputExpanded}>
          <ChatEmojiPicker disabled={inputDisabled} onSelect={(emoji) => handleTextChange(text + emoji)} />
          <StyledChatInputField>
            <StyledChatTextField
              inputRef={textareaRef}
              placeholder={inputPlaceholder}
              autoComplete="off"
              disabled={inputDisabled}
              value={text}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTextChange(e.target.value)}
              onPaste={(e: React.ClipboardEvent) => {
                if (emoteOnlyLocked) e.preventDefault();
              }}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (emoteOnlyLocked && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                  e.preventDefault();
                  return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              multiline
              minRows={1}
              maxRows={3}
              inputProps={{ readOnly: emoteOnlyLocked, maxLength: CHAT_MAX_MESSAGE_LENGTH }}
            />
          </StyledChatInputField>
          <StyledChatSendColumn>
            <StyledChatCharCounter
              visible={showCharCounter}
              warning={charsLeft <= 50 && charsLeft > 0}
              danger={charsLeft <= 0}
            >
              {text.length}/{CHAT_MAX_MESSAGE_LENGTH}
            </StyledChatCharCounter>
            <StyledChatSendButton
              disabled={!isAuth || !text.trim() || isOverLimit}
              onClick={handleSend}
              aria-label="Отправить"
            >
              <SendIcon sx={{ fontSize: 18 }} />
            </StyledChatSendButton>
          </StyledChatSendColumn>
        </StyledChatInputWrap>
      </StyledChatInputArea>
    </StyledChatContainer>
  );
};
