import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
// components
import { Chat } from '../../components/chat/Chat';
import { VideoPlayer, VideoPlayerStreamerInfo } from '../../components/videoPlayer/VideoPlayer';
// mui
import { Box, Button, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import DashboardCustomizeOutlinedIcon from '@mui/icons-material/DashboardCustomizeOutlined';
// hooks
import { useDeviceDetect } from '../../hooks/useDeviceDetect';
import { useAppSelector } from '../../hooks/redux';
import { useStreamTeamAccess } from '../../hooks/useStreamTeam';
// types
import { IChatMessage, IStream } from '../../types/share';
import {
  StyledContainerStream,
  StyledStreamContainerChat,
  StyledStreamContainerVideoPlayer,
  StyledStreamMetaBar,
} from './StyledStreamPage';
import { HeaderStreamPage } from './components/headerStreamPage/HeaderStreamPage';
import { StreamMetaPanel } from './components/streamMeta/StreamMetaPanel';
import { StyledChatCollapseTab } from '../../components/chat/StyledChat';

const CHAT_OPEN_STORAGE_KEY = 'stream-chat-open';

const readStoredChatOpen = () => {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(CHAT_OPEN_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
};

const writeStoredChatOpen = (open: boolean) => {
  try {
    window.localStorage.setItem(CHAT_OPEN_STORAGE_KEY, open ? '1' : '0');
  } catch {
    /* ignore quota / private mode */
  }
};

export const StreamPage = ({
  streamInfo,
  viewerCount,
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
  streamer,
}: {
  streamInfo: IStream | null;
  viewerCount: number;
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
  chatMode?: 'normal' | 'emote_only' | 'subscribers_only';
  canSendChat?: boolean;
  canManageChat?: boolean;
  streamer?: VideoPlayerStreamerInfo | null;
}) => {
  const { isMobile } = useDeviceDetect();
  const { data: profile } = useAppSelector((state) => state.user);
  const [isOpen, setIsOpen] = useState(readStoredChatOpen);
  const [playerFullscreen, setPlayerFullscreen] = useState(false);
  const [fsChatOpen, setFsChatOpen] = useState(false);
  const [videoBlockHeight, setVideoBlockHeight] = useState<number>();
  const fullscreenHostRef = useRef<HTMLDivElement>(null);
  const videoBlockRef = useRef<HTMLDivElement>(null);

  // Mobile keeps the chat panel open; desktop remembers collapse across reloads.
  const chatOpen = isMobile || isOpen;

  useEffect(() => {
    if (!playerFullscreen) setFsChatOpen(false);
  }, [playerFullscreen]);

  useEffect(() => {
    if (isMobile) return;
    writeStoredChatOpen(isOpen);
  }, [isOpen, isMobile]);

  useEffect(() => {
    if (isMobile) {
      setVideoBlockHeight(undefined);
      return;
    }

    const node = videoBlockRef.current;
    if (!node) return;

    const updateHeight = () => {
      const next = Math.round(node.getBoundingClientRect().height);
      if (next > 0) setVideoBlockHeight(next);
    };

    // Drop stale height on toggle so a tall collapsed layout can't pin the row.
    setVideoBlockHeight(undefined);

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    window.addEventListener('resize', updateHeight);

    const rafId = window.requestAnimationFrame(() => {
      updateHeight();
      window.requestAnimationFrame(updateHeight);
    });
    const timeoutId = window.setTimeout(updateHeight, 32);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [isMobile, chatOpen, streamInfo?.hlsUrl]);

  // Wider player when chat is collapsed; chat height follows the video block.
  const videoContainerFlex = isMobile ? '0 0 auto' : chatOpen ? '0 1 70%' : '0 1 100%';
  const chatFlex = !chatOpen ? '0 0 48px' : isMobile ? '0 0 auto' : '0 0 30%';

  const desktopChatHeight =
    !isMobile && videoBlockHeight
      ? {
          height: videoBlockHeight,
          maxHeight: videoBlockHeight,
          alignSelf: 'flex-start',
        }
      : undefined;

  const streamerNickname = streamer?.nickname;
  const isOwnChannel = Boolean(streamerNickname && profile?.nickname === streamerNickname);
  const { access: delegatedAccess } = useStreamTeamAccess(streamerNickname && !isOwnChannel ? streamerNickname : '');
  const showDelegatedManage = Boolean(delegatedAccess?.canManageStream);

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
        <StyledContainerStream
          sx={{
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 1.5 : 1,
            alignItems: isMobile ? 'stretch' : 'flex-start',
          }}
        >
          <StyledStreamContainerVideoPlayer
            ref={videoBlockRef}
            sx={{ flex: videoContainerFlex, minWidth: 0, minHeight: 0, overflow: 'hidden' }}
          >
            <HeaderStreamPage streamInfo={streamInfo} viewerCount={viewerCount} />
            {showDelegatedManage && streamerNickname && (
              <Box sx={{ px: 1, pb: 1 }}>
                <Button
                  component={Link}
                  to={`/${streamerNickname}/manage/stream`}
                  size="small"
                  startIcon={<DashboardCustomizeOutlinedIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    color: 'rgba(255,255,255,0.8)',
                    borderColor: 'rgba(142,123,255,0.35)',
                    bgcolor: 'rgba(142,123,255,0.1)',
                    textTransform: 'none',
                    fontSize: 13,
                    '&:hover': {
                      bgcolor: 'rgba(142,123,255,0.18)',
                      borderColor: 'rgba(142,123,255,0.5)',
                    },
                  }}
                  variant="outlined"
                >
                  Управление эфиром
                </Button>
              </Box>
            )}
            <Box
              ref={fullscreenHostRef}
              sx={{
                flex: '0 0 auto',
                width: '100%',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                bgcolor: '#000',
                '&:fullscreen': {
                  width: '100%',
                  height: '100%',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  flex: 1,
                  bgcolor: '#000',
                },
                '&:-webkit-full-screen': {
                  width: '100%',
                  height: '100%',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  flex: 1,
                  bgcolor: '#000',
                },
              }}
            >
              <Box
                sx={{
                  flex: playerFullscreen && fsChatOpen ? '1 1 72%' : '1 1 100%',
                  minWidth: 0,
                  minHeight: 0,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#000',
                  height: playerFullscreen ? '100%' : undefined,
                }}
              >
                <VideoPlayer
                  key={`${streamInfo?.streamId ?? 'live'}-${streamInfo?.hlsUrl ?? ''}`}
                  src={streamInfo?.hlsUrl}
                  mode={streamInfo?.isLive === false ? 'vod' : 'live'}
                  variant="embedded"
                  streamer={streamer}
                  fillContainer={playerFullscreen}
                  fitViewport={!playerFullscreen && !isMobile}
                  viewerCount={viewerCount}
                  fullscreenTargetRef={fullscreenHostRef}
                  onFullscreenChange={setPlayerFullscreen}
                  fullscreenChatOpen={fsChatOpen}
                  onFullscreenChatChange={setFsChatOpen}
                />
              </Box>
              {playerFullscreen && fsChatOpen && (
                <Box
                  sx={{
                    flex: '0 0 28%',
                    minWidth: { xs: 240, sm: 280 },
                    maxWidth: 400,
                    minHeight: 0,
                    height: '100%',
                    borderLeft: '1px solid rgba(255,255,255,0.12)',
                    bgcolor: 'rgba(12,12,16,0.98)',
                  }}
                >
                  <Chat
                    layout="fullscreen"
                    messages={messages}
                    sendMessage={sendMessage}
                    deleteMessage={deleteMessage}
                    timeoutUser={timeoutUser}
                    banUser={banUser}
                    unbanUser={unbanUser}
                    bannedUserIds={bannedUserIds}
                    chatError={chatError}
                    clearChatError={clearChatError}
                    inputRestore={inputRestore}
                    consumeInputRestore={consumeInputRestore}
                    slowModeSeconds={slowModeSeconds}
                    setSlowMode={setSlowMode}
                    chatRules={chatRules}
                    chatRulesTitle={chatRulesTitle}
                    chatMode={chatMode}
                    canSendChat={canSendChat}
                    canManageChat={canManageChat}
                    streamerId={streamInfo?.streamerId}
                  />
                </Box>
              )}
            </Box>
          </StyledStreamContainerVideoPlayer>
          <StyledStreamContainerChat sx={{ flex: chatFlex, minHeight: 0, ...desktopChatHeight }}>
            {chatOpen ? (
              <Chat
                setIsOpen={setIsOpen}
                messages={messages}
                sendMessage={sendMessage}
                deleteMessage={deleteMessage}
                timeoutUser={timeoutUser}
                banUser={banUser}
                unbanUser={unbanUser}
                bannedUserIds={bannedUserIds}
                chatError={chatError}
                clearChatError={clearChatError}
                inputRestore={inputRestore}
                consumeInputRestore={consumeInputRestore}
                slowModeSeconds={slowModeSeconds}
                setSlowMode={setSlowMode}
                chatRules={chatRules}
                chatRulesTitle={chatRulesTitle}
                chatMode={chatMode}
                canSendChat={canSendChat}
                canManageChat={canManageChat}
                streamerId={streamInfo?.streamerId}
              />
            ) : (
              <StyledChatCollapseTab onClick={() => setIsOpen(true)} role="button" tabIndex={0}>
                <ChevronLeftIcon sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 22 }} />
                <ForumOutlinedIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 20 }} />
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.45)',
                    writingMode: 'vertical-rl',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Чат
                </Typography>
              </StyledChatCollapseTab>
            )}
          </StyledStreamContainerChat>
        </StyledContainerStream>

        <StyledStreamMetaBar>
          <StreamMetaPanel streamInfo={streamInfo} />
        </StyledStreamMetaBar>
      </Box>
    </>
  );
};
