import { KeyboardEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  CircularProgress,
  ClickAwayListener,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import TagOutlinedIcon from '@mui/icons-material/TagOutlined';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import {
  GlobalSearchResult,
  SearchCategoryHit,
  SearchChannelHit,
  SearchScope,
  SearchTagHit,
  searchGlobal,
} from '../../../api/searchApi';
import { useAppSelector } from '../../../hooks/redux';
import { resolveMediaUrl } from '../../../utils/resolveMediaUrl';
import {
  clearSearchHistory,
  loadSearchHistory,
  pushSearchHistory,
  removeSearchHistoryEntry,
  SearchHistoryEntry,
} from '../../../utils/searchHistoryStorage';

const SCOPES: { id: SearchScope; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'channels', label: 'Каналы' },
  { id: 'categories', label: 'Категории' },
  { id: 'tags', label: 'Теги' },
];

const DEBOUNCE_MS = 280;

type Props = {
  width?: string;
  height?: string;
};

export const SearchInput = ({ width, height }: Props) => {
  const navigate = useNavigate();
  const { isAuth, data: profile } = useAppSelector((state) => state.user);
  const historyUserId = isAuth && profile?.id ? profile.id : null;

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult>({ channels: [], categories: [], tags: [] });
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const requestId = useRef(0);

  useEffect(() => {
    setHistory(loadSearchHistory(historyUserId));
  }, [historyUserId]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults({ channels: [], categories: [], tags: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      try {
        const data = await searchGlobal(q, scope);
        if (id !== requestId.current) return;
        setResults(data);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, scope]);

  const hasQuery = query.trim().length >= 2;
  const hasHits = results.channels.length > 0 || results.categories.length > 0 || results.tags.length > 0;
  const showHistory = open && !hasQuery && history.length > 0;
  const showPanel = open;

  const rememberChannel = (channel: SearchChannelHit) => {
    setHistory(
      pushSearchHistory(historyUserId, {
        type: 'channel',
        id: channel.id,
        nickname: channel.nickname,
        profileImage: channel.profileImage,
      })
    );
  };

  const rememberCategory = (category: SearchCategoryHit) => {
    setHistory(
      pushSearchHistory(historyUserId, {
        type: 'category',
        id: category.id,
        name: category.name,
        bannerImageUrl: category.bannerImageUrl,
      })
    );
  };

  const goChannel = (channel: SearchChannelHit | (SearchHistoryEntry & { type: 'channel' })) => {
    rememberChannel({
      id: channel.id,
      nickname: channel.nickname,
      profileImage: channel.profileImage,
      isOnline: false,
    });
    setOpen(false);
    setQuery('');
    navigate(`/${channel.nickname}`);
  };

  const goCategory = (category: SearchCategoryHit | (SearchHistoryEntry & { type: 'category' })) => {
    rememberCategory({
      id: category.id,
      name: category.name,
      bannerImageUrl: category.bannerImageUrl,
    });
    setOpen(false);
    setQuery('');
    navigate(`/?category=${category.id}`);
  };

  const goTag = (tag: SearchTagHit) => {
    setOpen(false);
    setQuery('');
    navigate(`/?tag=${encodeURIComponent(tag.slug)}`);
  };

  const onRemoveHistory = (entry: SearchHistoryEntry, e: MouseEvent) => {
    e.stopPropagation();
    setHistory(removeSearchHistoryEntry(historyUserId, entry));
  };

  const onClearHistory = () => {
    clearSearchHistory(historyUserId);
    setHistory([]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'Enter' && results.channels[0]) {
      e.preventDefault();
      goChannel(results.channels[0]);
    }
  };

  const rowSx = {
    display: 'flex',
    alignItems: 'center',
    gap: 1.25,
    px: 1.25,
    py: 1,
    borderRadius: 1.5,
    cursor: 'pointer',
    '&:hover': { bgcolor: 'rgba(142,123,255,0.12)' },
  };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative', width: width || '100%', maxWidth: '100%' }}>
        <TextField
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Поиск"
          fullWidth
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: loading ? (
              <InputAdornment position="end">
                <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.45)' }} />
              </InputAdornment>
            ) : undefined,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              height: height || 40,
              borderRadius: '20px',
              color: '#fff',
              bgcolor: 'var(--button-dark)',
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: 'rgba(142,123,255,0.35)' },
              '&.Mui-focused fieldset': { borderColor: 'rgba(142,123,255,0.55)' },
            },
            '& .MuiInputBase-input::placeholder': {
              color: 'rgba(255,255,255,0.45)',
              opacity: 1,
            },
          }}
        />

        {showPanel && (
          <Box
            sx={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              minWidth: 0,
              width: '100%',
              maxWidth: 'min(420px, calc(100vw - 24px))',
              zIndex: 1400,
              borderRadius: 2,
              border: '1px solid rgba(142,123,255,0.22)',
              bgcolor: 'rgba(18, 16, 32, 0.98)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
              overflow: 'hidden',
            }}
          >
            {hasQuery && (
              <Box sx={{ display: 'flex', gap: 0.75, p: 1.25, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {SCOPES.map((item) => {
                  const active = scope === item.id;
                  return (
                    <Box
                      key={item.id}
                      component="button"
                      type="button"
                      onClick={() => setScope(item.id)}
                      sx={{
                        border: 'none',
                        cursor: 'pointer',
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 99,
                        fontSize: 12,
                        fontWeight: 600,
                        color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                        bgcolor: active ? 'rgba(109,93,251,0.45)' : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      {item.label}
                    </Box>
                  );
                })}
              </Box>
            )}

            <Box sx={{ maxHeight: 360, overflow: 'auto', p: 0.75 }}>
              {showHistory && (
                <Box sx={{ mb: hasQuery ? 0.5 : 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 1.25,
                      pt: 0.75,
                      pb: 0.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                        color: 'rgba(255,255,255,0.4)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Недавние
                    </Typography>
                    <Typography
                      component="button"
                      type="button"
                      onClick={onClearHistory}
                      sx={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: 11,
                        color: 'rgba(142,123,255,0.85)',
                        '&:hover': { color: '#fff' },
                      }}
                    >
                      Очистить
                    </Typography>
                  </Box>
                  {history.map((entry) => (
                    <Box
                      key={entry.type === 'channel' ? `c-${entry.id}` : `cat-${entry.id}`}
                      onClick={() => (entry.type === 'channel' ? goChannel(entry) : goCategory(entry))}
                      sx={rowSx}
                    >
                      {entry.type === 'channel' ? (
                        <>
                          <Avatar
                            src={resolveMediaUrl(entry.profileImage) || undefined}
                            sx={{ width: 32, height: 32, bgcolor: 'rgba(142,123,255,0.25)' }}
                          >
                            <PersonOutlineIcon sx={{ fontSize: 18 }} />
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#fff' }} noWrap>
                              {entry.nickname}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }} noWrap>
                              Канал
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <>
                          <Avatar
                            src={resolveMediaUrl(entry.bannerImageUrl) || undefined}
                            variant="rounded"
                            sx={{ width: 36, height: 24, bgcolor: 'rgba(142,123,255,0.2)' }}
                          >
                            <CategoryOutlinedIcon sx={{ fontSize: 16 }} />
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#fff' }} noWrap>
                              {entry.name}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }} noWrap>
                              Категория
                            </Typography>
                          </Box>
                        </>
                      )}
                      <HistoryIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                      <IconButton
                        size="small"
                        aria-label="Удалить из истории"
                        onClick={(e) => onRemoveHistory(entry, e)}
                        sx={{
                          ml: -0.5,
                          color: 'rgba(255,255,255,0.35)',
                          '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

              {!hasQuery && !showHistory && (
                <Typography sx={{ px: 1.25, py: 1.5, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                  Введите минимум 2 символа
                </Typography>
              )}

              {hasQuery && query.trim().length < 2 && (
                <Typography sx={{ px: 1.25, py: 1.5, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                  Введите минимум 2 символа
                </Typography>
              )}

              {hasQuery && !loading && !hasHits && (
                <Typography sx={{ px: 1.25, py: 1.5, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                  Ничего не найдено
                </Typography>
              )}

              {results.channels.length > 0 && (
                <Box sx={{ mb: 0.5 }}>
                  <Typography
                    sx={{
                      px: 1.25,
                      pt: 0.75,
                      pb: 0.5,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      color: 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Каналы
                  </Typography>
                  {results.channels.map((channel) => (
                    <Box key={channel.id} onClick={() => goChannel(channel)} sx={rowSx}>
                      <Avatar
                        src={resolveMediaUrl(channel.profileImage) || undefined}
                        sx={{ width: 32, height: 32, bgcolor: 'rgba(142,123,255,0.25)' }}
                      >
                        <PersonOutlineIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#fff' }} noWrap>
                          {channel.nickname}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }} noWrap>
                          {channel.isOnline
                            ? channel.streamName
                              ? `В эфире · ${channel.streamName}`
                              : 'В эфире'
                            : 'Оффлайн'}
                        </Typography>
                      </Box>
                      {channel.isOnline && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'var(--live-btn)',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              )}

              {results.categories.length > 0 && (
                <Box>
                  <Typography
                    sx={{
                      px: 1.25,
                      pt: 0.75,
                      pb: 0.5,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      color: 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Категории
                  </Typography>
                  {results.categories.map((category) => (
                    <Box key={category.id} onClick={() => goCategory(category)} sx={rowSx}>
                      <Avatar
                        src={resolveMediaUrl(category.bannerImageUrl) || undefined}
                        variant="rounded"
                        sx={{ width: 36, height: 24, bgcolor: 'rgba(142,123,255,0.2)' }}
                      >
                        <CategoryOutlinedIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#fff' }} noWrap>
                        {category.name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {results.tags.length > 0 && (
                <Box>
                  <Typography
                    sx={{
                      px: 1.25,
                      pt: 0.75,
                      pb: 0.5,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      color: 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Теги
                  </Typography>
                  {results.tags.map((tag) => (
                    <Box key={tag.slug} onClick={() => goTag(tag)} sx={rowSx}>
                      <TagOutlinedIcon sx={{ color: 'rgba(142,123,255,0.85)', fontSize: 20 }} />
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#fff' }} noWrap>
                        {tag.name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
};
