import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import Hls from 'hls.js';
import {
  Avatar,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  MenuItem,
  MenuList,
  Slider,
  Tooltip,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import SensorsIcon from '@mui/icons-material/Sensors';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import {
  LIVE_CATCHUP_THRESHOLD_SEC,
  LIVE_HLS_CONFIG,
  LIVE_MANIFEST_MAX_AGE_MS,
  LIVE_MANIFEST_MAX_ATTEMPTS,
  LIVE_MANIFEST_RETRY_MS,
  KEYBOARD_SHORTCUTS,
  VOD_HLS_CONFIG,
} from './videoPlayer.constants';
import { getMutedStorage, getVolumeStorage, setMutedStorage, setVolumeStorage } from '../../utils/storage';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { DEFAULT_AVATAR } from '../../constants/defaultAvatars';

type StreamMode = 'live' | 'vod';
type VideoPlayerVariant = 'standalone' | 'embedded';

export type VideoPlayerStreamerInfo = {
  nickname: string;
  avatarUrl?: string | null;
};

type VideoPlayerProps = {
  src?: string;
  mode?: StreamMode;
  /** standalone — демо/отдельная страница; embedded — StreamPage */
  variant?: VideoPlayerVariant;
  streamer?: VideoPlayerStreamerInfo | null;
  /** false — не растягивать по высоте родителя (мобильный 16:9) */
  fillContainer?: boolean;
  /**
   * Desktop stream page: keep the player inside the viewport (no page scroll to see video)
   * when the column grows wider (e.g. chat collapsed). Uses real video aspect ratio when known.
   */
  fitViewport?: boolean;
  viewerCount?: number;
  fullscreenTargetRef?: RefObject<HTMLElement | null>;
  onFullscreenChange?: (active: boolean) => void;
  fullscreenChatOpen?: boolean;
  onFullscreenChatChange?: (open: boolean) => void;
};

const resolveStreamerAvatarUrl = (avatarUrl?: string | null) => resolveMediaUrl(avatarUrl) || DEFAULT_AVATAR;

const hasSavedAudioPrefs = () => localStorage.getItem('video-player-volume') !== null;

const readSavedAudio = () => {
  const volume = getVolumeStorage();
  // Первый визит — mute для autoplay; дальше из localStorage
  const muted = hasSavedAudioPrefs() ? getMutedStorage() : true;
  return { volume, muted };
};

const detectTouchUi = () =>
  typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);

type OrientableScreen = Screen & {
  orientation?: { lock: (type: string) => Promise<void>; unlock: () => void };
  mozOrientation?: { lock: (type: string) => Promise<void>; unlock: () => void };
};

const getScreenOrientation = () => {
  const screen = window.screen as OrientableScreen;
  return screen.orientation ?? screen.mozOrientation;
};

const lockLandscape = async () => {
  const orientation = getScreenOrientation();
  if (!orientation?.lock) return;
  try {
    await orientation.lock('landscape');
  } catch {
    try {
      await orientation.lock('landscape-primary');
    } catch {
      // Браузер/OS может запретить (часто iOS)
    }
  }
};

const unlockOrientation = () => {
  try {
    getScreenOrientation()?.unlock();
  } catch {
    // ignore
  }
};

const getFullscreenElement = () =>
  document.fullscreenElement ??
  (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ??
  null;

const requestElementFullscreen = async (el: HTMLElement) => {
  if (el.requestFullscreen) return el.requestFullscreen();
  const webkit = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  return webkit.webkitRequestFullscreen?.();
};

const exitElementFullscreen = async () => {
  if (document.exitFullscreen) return document.exitFullscreen();
  const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> };
  return doc.webkitExitFullscreen?.();
};

export const VideoPlayer = ({
  src,
  mode = 'live',
  variant = 'embedded',
  streamer,
  fillContainer = true,
  fitViewport = false,
  viewerCount = 0,
  fullscreenTargetRef,
  onFullscreenChange,
  fullscreenChatOpen = false,
  onFullscreenChatChange,
}: VideoPlayerProps) => {
  const isEmbedded = variant === 'embedded';
  const embeddedFills = isEmbedded && fillContainer;
  const canFullscreenChat = !!onFullscreenChatChange;
  const usesExternalFullscreen = !!fullscreenTargetRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const fitParentRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPlayingRef = useRef<boolean | null>(null);
  const volumeRef = useRef(getVolumeStorage());
  const mutedRef = useRef(hasSavedAudioPrefs() ? getMutedStorage() : true);
  const currentLevelRef = useRef(-1);
  const isSwitchingLevelRef = useRef(false);
  const isTouchUiRef = useRef(detectTouchUi());

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => mutedRef.current);
  const [volume, setVolume] = useState(() => volumeRef.current);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [levels, setLevels] = useState<{ index: number; height: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
  const [viewportFitSize, setViewportFitSize] = useState<{ width: number; height: number } | null>(null);
  const qualityMenuRef = useRef<HTMLDivElement>(null);
  const [liveDelaySec, setLiveDelaySec] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [playbackFlash, setPlaybackFlash] = useState<'play' | 'pause' | null>(null);

  const isBehindLive = mode === 'live' && liveDelaySec > LIVE_CATCHUP_THRESHOLD_SEC;

  currentLevelRef.current = currentLevel;
  volumeRef.current = volume;
  mutedRef.current = isMuted;

  const resolveSrc = (url: string) =>
    url.startsWith('http') ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;

  const toVariantManifestUrl = (masterUrl: string) => masterUrl.replace(/master\.m3u8(\?.*)?$/, '720p/index.m3u8');

  const parseHttpDate = (value: string | null) => {
    if (!value) return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const isFreshLivePlaylist = (body: string, lastModifiedMs: number | null) => {
    if (!body.includes('#EXTM3U')) return false;
    if (body.includes('#EXT-X-ENDLIST')) return false;
    if (lastModifiedMs == null) return false;
    return Date.now() - lastModifiedMs <= LIVE_MANIFEST_MAX_AGE_MS;
  };

  const waitForLiveManifest = async (masterUrl: string, cancelled: () => boolean) => {
    const variantUrl = toVariantManifestUrl(masterUrl);

    for (let attempt = 0; attempt < LIVE_MANIFEST_MAX_ATTEMPTS; attempt++) {
      if (cancelled()) return false;
      try {
        const response = await fetch(variantUrl, { method: 'GET', cache: 'no-store' });
        if (response.ok) {
          const body = await response.text();
          const lastModified = parseHttpDate(response.headers.get('Last-Modified'));
          if (isFreshLivePlaylist(body, lastModified)) return true;
        }
      } catch {
        // manifest not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, LIVE_MANIFEST_RETRY_MS));
    }
    return false;
  };

  const applyAudio = useCallback((video: HTMLVideoElement, nextVolume: number, nextMuted: boolean) => {
    video.volume = nextVolume / 100;
    video.muted = nextMuted;
    setVolume(nextVolume);
    setIsMuted(nextMuted);
    setVolumeStorage(nextVolume);
    setMutedStorage(nextMuted);
  }, []);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    // Во время воспроизведения панель сама прячется; на паузе — только при уходе мыши
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3500);
    }
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, []);

  const playVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video?.paused) return;
    video.play().catch(() => {});
  }, []);

  const handleVideoSurfaceClick = useCallback(() => {
    if (isTouchUiRef.current) {
      resetHideTimer();
      return;
    }
    playVideo();
  }, [resetHideTimer, playVideo]);

  const handleContainerTouch = useCallback(() => {
    if (isTouchUiRef.current) resetHideTimer();
  }, [resetHideTimer]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.muted) {
      const vol = volumeRef.current > 0 ? volumeRef.current : getVolumeStorage() || 75;
      applyAudio(video, vol, false);
    } else {
      applyAudio(video, volumeRef.current, true);
    }
  }, [applyAudio]);

  const changeVolume = useCallback(
    (val: number) => {
      const video = videoRef.current;
      if (!video) return;
      const nextMuted = val === 0;
      applyAudio(video, val, nextMuted);
    },
    [applyAudio]
  );

  const toggleFullscreen = useCallback(async () => {
    const el = fullscreenTargetRef?.current ?? containerRef.current;
    if (!el) return;
    try {
      if (!getFullscreenElement()) {
        await requestElementFullscreen(el);
        if (isTouchUiRef.current) await lockLandscape();
      } else {
        unlockOrientation();
        await exitElementFullscreen();
      }
    } catch {
      // ignore
    }
  }, [fullscreenTargetRef]);

  const handleVideoDoubleClick = useCallback(() => {
    if (isTouchUiRef.current) return;
    toggleFullscreen();
  }, [toggleFullscreen]);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await video.requestPictureInPicture();
  }, []);

  const measureLiveDelay = useCallback(() => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video || mode !== 'live') return 0;

    const liveEdge = hls?.liveSyncPosition;
    if (liveEdge != null && Number.isFinite(liveEdge)) {
      return Math.max(0, liveEdge - video.currentTime);
    }
    if (video.buffered.length > 0) {
      return Math.max(0, video.buffered.end(video.buffered.length - 1) - video.currentTime);
    }
    return 0;
  }, [mode]);

  const jumpToLive = useCallback(() => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video || mode !== 'live') return;

    const target = hls?.liveSyncPosition;
    if (target != null && Number.isFinite(target)) {
      video.currentTime = target;
    } else if (video.buffered.length > 0) {
      video.currentTime = Math.max(0, video.buffered.end(video.buffered.length - 1) - 0.5);
    }

    hls?.startLoad();
    if (video.paused) video.play().catch(() => {});
    setLiveDelaySec(0);
  }, [mode]);

  const setQuality = (index: number) => {
    const hls = hlsRef.current;
    const video = videoRef.current;
    if (!hls || !video) return;

    const shouldResume = !video.paused;
    isSwitchingLevelRef.current = true;
    hls.currentLevel = index;
    setCurrentLevel(index);
    setQualityOpen(false);

    const onLevelSwitched = (_e: string, data: { level: number }) => {
      isSwitchingLevelRef.current = false;
      hls.off(Hls.Events.LEVEL_SWITCHED, onLevelSwitched);
      if (shouldResume && video.paused) video.play().catch(() => {});
    };
    hls.on(Hls.Events.LEVEL_SWITCHED, onLevelSwitched);
  };

  // HLS lifecycle
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const resolved = resolveSrc(src);
    const saved = readSavedAudio();
    let hls: Hls | null = null;
    let cancelled = false;
    let manifestRetryTimer: ReturnType<typeof setTimeout> | null = null;
    let liveManifestAttempts = 0;

    const isCancelled = () => cancelled;

    const onPlay = () => {
      setIsPlaying(true);
      hlsRef.current?.startLoad();
    };
    const onPause = () => {
      setIsPlaying(false);
      if (mode === 'live') hlsRef.current?.stopLoad();
    };
    const onWaiting = () => {
      if (isSwitchingLevelRef.current) return;
      setIsLoading(true);
    };
    const onPlaying = () => {
      setIsLoading(false);
    };
    const onCanPlay = () => setIsLoading(false);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onCanPlay);

    video.volume = saved.volume / 100;
    video.muted = saved.muted;
    setVolume(saved.volume);
    setIsMuted(saved.muted);
    volumeRef.current = saved.volume;
    mutedRef.current = saved.muted;

    const attachHls = () => {
      if (isCancelled()) return;

      if (Hls.isSupported()) {
        hls?.destroy();
        hls = new Hls(mode === 'live' ? LIVE_HLS_CONFIG : VOD_HLS_CONFIG);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const parsed = hls!.levels.map((l, i) => ({
            index: i,
            height: l.height,
          }));
          setLevels(parsed);
          setIsLoading(false);
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.LEVEL_SWITCHING, () => {
          isSwitchingLevelRef.current = true;
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
          isSwitchingLevelRef.current = false;
          setCurrentLevel(data.level);
        });

        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!hls) return;

          const manifestMissing =
            data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
            data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT;

          if (mode === 'live' && manifestMissing && liveManifestAttempts < LIVE_MANIFEST_MAX_ATTEMPTS) {
            liveManifestAttempts += 1;
            setIsLoading(true);
            hls.destroy();
            hlsRef.current = null;
            hls = null;
            if (manifestRetryTimer) clearTimeout(manifestRetryTimer);
            manifestRetryTimer = setTimeout(() => {
              void startPlayback();
            }, LIVE_MANIFEST_RETRY_MS);
            return;
          }

          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else {
            hls.destroy();
            hlsRef.current = null;
          }
        });

        hls.loadSource(resolved);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = resolved;
        video.play().catch(() => {});
      }
    };

    const startPlayback = async () => {
      if (isCancelled()) return;

      if (mode === 'live') {
        setIsLoading(true);
        const ready = await waitForLiveManifest(resolved, isCancelled);
        if (isCancelled()) return;
        if (!ready) {
          if (manifestRetryTimer) clearTimeout(manifestRetryTimer);
          manifestRetryTimer = setTimeout(() => {
            void startPlayback();
          }, LIVE_MANIFEST_RETRY_MS);
          return;
        }
      }

      attachHls();
    };

    void startPlayback();

    return () => {
      cancelled = true;
      if (manifestRetryTimer) clearTimeout(manifestRetryTimer);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onCanPlay);
      hls?.destroy();
      hlsRef.current = null;
    };
  }, [src, mode]);

  useEffect(() => {
    setVideoAspectRatio(null);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncAspectRatio = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoAspectRatio(video.videoWidth / video.videoHeight);
      }
    };

    video.addEventListener('loadedmetadata', syncAspectRatio);
    syncAspectRatio();

    return () => video.removeEventListener('loadedmetadata', syncAspectRatio);
  }, [src]);

  const viewportFitActive = fitViewport && isEmbedded && !fillContainer && !isFullscreen;

  useLayoutEffect(() => {
    if (!viewportFitActive) {
      setViewportFitSize(null);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const parent = el.parentElement;
    if (!parent) return;
    fitParentRef.current = parent;

    const VIEWPORT_BOTTOM_GAP = 12;
    const MIN_HEIGHT = 180;

    const update = () => {
      const host = fitParentRef.current;
      const node = containerRef.current;
      if (!host || !node) return;

      const availableWidth = host.clientWidth;
      if (availableWidth <= 0) return;

      const top = node.getBoundingClientRect().top;
      const availableHeight = Math.max(MIN_HEIGHT, window.innerHeight - top - VIEWPORT_BOTTOM_GAP);
      const ratio = videoAspectRatio && videoAspectRatio > 0 ? videoAspectRatio : 16 / 9;

      // Prefer filling host width; only letterbox (narrower width) when height is capped.
      let width = availableWidth;
      let height = width / ratio;
      if (height > availableHeight) {
        height = availableHeight;
        width = height * ratio;
      }

      width = Math.max(1, Math.round(width));
      height = Math.max(MIN_HEIGHT, Math.round(height));

      setViewportFitSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
    };

    update();
    const raf = window.requestAnimationFrame(update);

    const ro = new ResizeObserver(() => update());
    ro.observe(parent);
    // Header / chrome above the player live in ancestor columns — watch them too.
    const column = parent.parentElement;
    if (column && column !== parent) ro.observe(column);
    const outer = column?.parentElement;
    if (outer && outer !== column) ro.observe(outer);

    window.addEventListener('resize', update);

    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [viewportFitActive, videoAspectRatio, src]);

  // Отставание от live edge (пауза, буфер, сеть)
  useEffect(() => {
    if (mode !== 'live') {
      setLiveDelaySec(0);
      return;
    }
    const tick = () => setLiveDelaySec(measureLiveDelay());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [mode, src, measureLiveDelay]);

  // Live anti-rewind
  useEffect(() => {
    if (mode !== 'live') return;
    const video = videoRef.current;
    if (!video) return;
    let maxAllowed = 0;
    const onTimeUpdate = () => {
      maxAllowed = Math.max(maxAllowed, video.currentTime);
    };
    const onSeeking = () => {
      if (video.currentTime < maxAllowed - 1) video.currentTime = maxAllowed;
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('seeking', onSeeking);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('seeking', onSeeking);
    };
  }, [mode, src]);

  useEffect(() => {
    const onFs = () => {
      const fsEl = getFullscreenElement();
      const target = fullscreenTargetRef?.current ?? containerRef.current;
      const fs = !!fsEl && !!target && (fsEl === target || fsEl === containerRef.current);
      setIsFullscreen(fs);
      onFullscreenChange?.(fs);
      if (fs) {
        if (isTouchUiRef.current) void lockLandscape();
      } else {
        unlockOrientation();
        onFullscreenChatChange?.(false);
      }
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
      unlockOrientation();
    };
  }, [fullscreenTargetRef, onFullscreenChange, onFullscreenChatChange]);

  useEffect(() => {
    if (!showControls) setQualityOpen(false);
  }, [showControls]);

  useEffect(() => {
    if (!qualityOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (qualityMenuRef.current?.contains(e.target as Node)) return;
      setQualityOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [qualityOpen]);

  useEffect(() => {
    if (isPlaying) resetHideTimer();
  }, [isPlaying, resetHideTimer]);

  useEffect(() => {
    if (prevPlayingRef.current === null) {
      prevPlayingRef.current = isPlaying;
      return;
    }
    if (prevPlayingRef.current === isPlaying) return;
    prevPlayingRef.current = isPlaying;

    if (!isPlaying) {
      setShowControls(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }

    setPlaybackFlash(isPlaying ? 'play' : 'pause');
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setPlaybackFlash(null), 650);

    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // e.code — физическая клавиша (KeyL = L/Д, KeyM = M/Ь и т.д. на EN/RU)
      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyM':
          toggleMute();
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'KeyP':
          togglePiP();
          break;
        case 'KeyL':
          if (mode === 'live') jumpToLive();
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(Math.min(100, volumeRef.current + 5));
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(Math.max(0, volumeRef.current - 5));
          break;
        default:
          if (e.key === '?' || (e.code === 'Slash' && e.shiftKey)) {
            setHelpOpen(true);
          }
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, toggleMute, toggleFullscreen, togglePiP, changeVolume, jumpToLive, mode]);

  const toggleQualityMenu = () => {
    setQualityOpen((open) => !open);
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const qualityLabel = currentLevel >= 0 && levels[currentLevel] ? `${levels[currentLevel].height}p` : 'Авто';

  const compactAspectRatio = videoAspectRatio ?? '16/9';
  const playerFillsHost = embeddedFills || isFullscreen;
  const useCompactLayout = isEmbedded && !playerFillsHost && !isFullscreen;
  const useViewportFitSize = viewportFitActive && viewportFitSize != null;

  if (!src) {
    return (
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          width: useViewportFitSize ? viewportFitSize.width : '100%',
          maxWidth: '100%',
          minWidth: 0,
          mx: useViewportFitSize ? 'auto' : undefined,
          height: useViewportFitSize ? viewportFitSize.height : undefined,
          // Must be able to shrink — fixed px width + flex-shrink:0 locked the column and chat.
          flex: isEmbedded ? (useViewportFitSize ? '0 1 auto' : 1) : undefined,
          aspectRatio: useViewportFitSize ? undefined : '16/9',
          bgcolor: '#000',
          borderRadius: isEmbedded ? 0 : 3,
        }}
      />
    );
  }

  return (
    <Box
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={handleContainerTouch}
      sx={{
        position: 'relative',
        width: useViewportFitSize ? viewportFitSize.width : '100%',
        maxWidth: isEmbedded ? '100%' : 960,
        minWidth: 0,
        mx: useViewportFitSize ? 'auto' : isEmbedded ? 0 : 'auto',
        // Allow shrink when chat reopens — otherwise old px width blocks the flex column.
        flex: playerFillsHost ? 1 : isEmbedded ? (useViewportFitSize ? '0 1 auto' : 1) : undefined,
        minHeight: playerFillsHost ? 0 : undefined,
        aspectRatio: useViewportFitSize
          ? undefined
          : useCompactLayout
            ? compactAspectRatio
            : isEmbedded && !isFullscreen
              ? undefined
              : isFullscreen || usesExternalFullscreen
                ? 'auto'
                : '16/9',
        // Avoid a one-frame oversized player before JS fit runs.
        maxHeight: viewportFitActive && !useViewportFitSize ? 'calc(100dvh - 140px)' : undefined,
        height: useViewportFitSize
          ? viewportFitSize.height
          : playerFillsHost && !isFullscreen
            ? '100%'
            : isFullscreen
              ? '100%'
              : useCompactLayout
                ? 'auto'
                : isEmbedded && !isFullscreen
                  ? 'auto'
                  : undefined,
        bgcolor: '#000',
        borderRadius: isFullscreen || isEmbedded ? 0 : 3,
        overflow: isFullscreen ? 'visible' : 'hidden',
        boxShadow: isEmbedded ? 'none' : '0 24px 80px rgba(0,0,0,0.55)',
        border: isEmbedded ? 'none' : '1px solid rgba(255,255,255,0.08)',
        cursor: showControls ? 'default' : 'none',
        transition: isEmbedded ? undefined : 'max-width 0.35s ease',
        ...(!usesExternalFullscreen && {
          '&:fullscreen': {
            width: '100%',
            height: '100%',
            maxWidth: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          },
          '&:-webkit-full-screen': {
            width: '100%',
            height: '100%',
            maxWidth: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          },
        }),
      }}
    >
      <Box
        component="video"
        ref={videoRef}
        playsInline
        onClick={handleVideoSurfaceClick}
        onDoubleClick={handleVideoDoubleClick}
        sx={{
          width: '100%',
          height: '100%',
          flex: playerFillsHost ? 1 : undefined,
          minHeight: playerFillsHost ? 0 : undefined,
          objectFit: 'contain',
          display: 'block',
          bgcolor: '#000',
        }}
      />

      {isLoading && (
        <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5 }} color="secondary" />
      )}

      {playbackFlash && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 6,
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: 'rgba(0,0,0,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'playbackFlash 0.65s ease-out forwards',
              '@keyframes playbackFlash': {
                '0%': { opacity: 0, transform: 'scale(0.9)' },
                '25%': { opacity: 1, transform: 'scale(1)' },
                '100%': { opacity: 0, transform: 'scale(1.08)' },
              },
            }}
          >
            {playbackFlash === 'play' ? (
              <PlayArrowIcon sx={{ fontSize: 40, color: '#fff' }} />
            ) : (
              <PauseIcon sx={{ fontSize: 40, color: '#fff' }} />
            )}
          </Box>
        </Box>
      )}

      {/* Верхняя строка: LIVE, catch-up, качество (без битрейта) */}
      {!(isFullscreen && streamer) && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            alignItems: 'center',
            zIndex: 5,
            pointerEvents: 'auto',
          }}
        >
          {mode === 'live' && (
            <Chip
              icon={<FiberManualRecordIcon sx={{ fontSize: 12, color: '#ff3b3b !important' }} />}
              label="LIVE"
              size="small"
              sx={{
                bgcolor: isBehindLive ? 'rgba(255,59,59,0.12)' : 'rgba(255,59,59,0.2)',
                color: isBehindLive ? '#ff8a8a' : '#ff6b6b',
                fontWeight: 700,
                border: '1px solid rgba(255,59,59,0.4)',
              }}
            />
          )}
          {isBehindLive && (
            <Tooltip title="Перейти к актуальному моменту (L)">
              <Chip
                icon={<SensorsIcon sx={{ fontSize: 14, color: '#fff !important' }} />}
                label="Вернуться в эфир"
                size="small"
                clickable
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToLive();
                }}
                sx={{
                  bgcolor: 'var(--live-btn)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: 0.5,
                  '&:hover': {
                    opacity: 0.85,
                    bgcolor: '#e63333',
                  },
                }}
              />
            </Tooltip>
          )}
          <Chip
            label={qualityLabel}
            size="small"
            sx={{ bgcolor: 'rgba(109,93,251,0.35)', color: '#fff', fontSize: 11 }}
          />
        </Box>
      )}

      {isFullscreen && streamer && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            alignItems: 'flex-start',
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            transition: 'opacity 0.25s',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              bgcolor: 'rgba(0,0,0,0.6)',
              borderRadius: 2,
              px: 1.25,
              py: 1,
              backdropFilter: 'blur(8px)',
            }}
          >
            <Avatar
              src={resolveStreamerAvatarUrl(streamer.avatarUrl)}
              alt={streamer.nickname}
              sx={{ width: 36, height: 36, border: '2px solid rgba(255,255,255,0.15)' }}
            />
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2, color: '#fff' }}>
                {streamer.nickname}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.35 }}>
                {mode === 'live' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
                    <FiberManualRecordIcon sx={{ fontSize: 10, color: '#ff3b3b' }} />
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#ff6b6b', letterSpacing: 0.5 }}>
                      LIVE
                    </Typography>
                  </Box>
                )}
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{qualityLabel}</Typography>
                {viewerCount > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
                    <VisibilityOutlinedIcon sx={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }} />
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{viewerCount}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
          {isBehindLive && (
            <Tooltip title="Перейти к актуальному моменту (L)">
              <Chip
                icon={<SensorsIcon sx={{ fontSize: 14, color: '#fff !important' }} />}
                label="Вернуться в эфир"
                size="small"
                clickable
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToLive();
                }}
                sx={{
                  bgcolor: 'var(--live-btn)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: 0.5,
                  '&:hover': {
                    opacity: 0.85,
                    bgcolor: '#e63333',
                  },
                }}
              />
            </Tooltip>
          )}
        </Box>
      )}

      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          px: 1.5,
          py: 1,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          transition: 'opacity 0.25s',
          zIndex: 4,
          overflow: 'visible',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={togglePlay} sx={{ color: '#fff' }} size="small">
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>

          <IconButton onClick={toggleMute} sx={{ color: '#fff' }} size="small">
            {isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
          </IconButton>
          <Slider
            size="small"
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={(_, v) => changeVolume(v as number)}
            sx={{ width: 90, color: '#fff' }}
          />

          <Box sx={{ flex: 1 }} />

          <Box ref={qualityMenuRef} sx={{ position: 'relative' }}>
            <Tooltip title="Качество">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  toggleQualityMenu();
                }}
                sx={{ color: qualityOpen ? '#8e7bff' : '#fff' }}
                size="small"
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {qualityOpen && (
              <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  mb: 0.75,
                  zIndex: 30,
                  bgcolor: 'rgba(0,0,0,0.92)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 1,
                  minWidth: 112,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}
              >
                <MenuList dense disablePadding sx={{ py: 0.5 }}>
                  <MenuItem selected={currentLevel === -1} onClick={() => setQuality(-1)}>
                    Авто
                  </MenuItem>
                  {levels.map((l) => (
                    <MenuItem key={l.index} selected={currentLevel === l.index} onClick={() => setQuality(l.index)}>
                      {l.height}p
                    </MenuItem>
                  ))}
                </MenuList>
              </Box>
            )}
          </Box>
          <Tooltip title="Картинка в картинке (P)">
            <IconButton onClick={togglePiP} sx={{ color: '#fff' }} size="small">
              <PictureInPictureAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {isFullscreen && canFullscreenChat && (
            <Tooltip title={fullscreenChatOpen ? 'Закрыть чат' : 'Открыть чат'}>
              <IconButton
                onClick={() => onFullscreenChatChange?.(!fullscreenChatOpen)}
                sx={{ color: fullscreenChatOpen ? '#8e7bff' : '#fff' }}
                size="small"
              >
                <ForumOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Справка (?)">
            <IconButton onClick={() => setHelpOpen(true)} sx={{ color: '#fff' }} size="small">
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Полный экран">
            <IconButton onClick={toggleFullscreen} sx={{ color: '#fff' }} size="small">
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Dialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        maxWidth="xs"
        fullWidth
        disablePortal={isFullscreen}
        disableScrollLock
        slotProps={{
          backdrop: isFullscreen ? { sx: { position: 'absolute' } } : undefined,
        }}
      >
        <DialogTitle>Горячие клавиши</DialogTitle>
        <DialogContent>
          {KEYBOARD_SHORTCUTS.map((s) => (
            <Typography key={s.keys} sx={{ py: 0.5 }}>
              <strong>{s.keys}</strong> — {s.action}
            </Typography>
          ))}
          <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#888' }}>
            ПК: клик по видео — только воспроизведение (если на паузе), пауза — кнопка или Space. Двойной клик — полный
            экран.
            <br />
            Телефон: тап по видео — показать панель управления. Полный экран — альбомная ориентация.
            <br />
            Клавиши срабатывают по физическому расположению (QWERTY): на русской раскладке M = Ь, L = Д и т.д.
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
