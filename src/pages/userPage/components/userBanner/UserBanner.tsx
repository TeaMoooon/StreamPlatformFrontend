import { useCallback, useEffect, useState } from 'react';
import { Avatar, Box, Button, Typography } from '@mui/material';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { Socials } from '../../../../components/socials/Socials';
import { BannerEffect } from '../../../../components/ui/bannerEffect/BannerEffect';
import { ReportDialog } from '../../../../components/report/ReportDialog';
import { deleteSubscribe, streamerFolows, subscribeToUser } from '../../../../store/actions/SubscribersActions';
import { useAppSelector } from '../../../../hooks/redux';
import { useHeaderModal } from '../../../../context/HeaderModalContext';
import { IProfile, ISubscriber } from '../../../../types/share';
import { DEFAULT_AVATAR } from '../../../../constants/defaultAvatars';
import { resolveMediaUrl } from '../../../../utils/resolveMediaUrl';

const panelSx = {
  borderRadius: 2,
  bgcolor: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(16px)',
} as const;

const followButtonSx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: 14,
  borderRadius: 1.5,
  px: 2.5,
  py: 0.75,
  flexShrink: 0,
  bgcolor: '#6d5dfb',
  color: '#fff',
  '&:hover': { bgcolor: '#8e7bff' },
} as const;

const unfollowButtonSx = {
  ...followButtonSx,
  bgcolor: 'transparent',
  color: 'rgba(255,255,255,0.85)',
  border: '1px solid rgba(255,255,255,0.18)',
  '&:hover': {
    bgcolor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.28)',
  },
} as const;

const mediaUrl = (path?: string | null) => {
  const resolved = resolveMediaUrl(path);
  return resolved || undefined;
};

const formatSubscriberCount = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} подписчик`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} подписчика`;
  return `${count} подписчиков`;
};

const StreamerDescription = ({ text, compact = false }: { text: string; compact?: boolean }) => {
  const trimmed = text.trim();
  if (!trimmed) return null;

  return (
    <Typography
      sx={{
        fontSize: compact ? 13 : 14,
        color: 'rgba(255,255,255,0.65)',
        lineHeight: 1.55,
        maxWidth: compact ? 'none' : 560,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {trimmed}
    </Typography>
  );
};

type UserBannerProps = {
  userData: IProfile | null;
  isNotProfileData: boolean;
  isLive?: boolean;
};

export const UserBanner = ({ userData, isNotProfileData, isLive = false }: UserBannerProps) => {
  const { isAuth, data: currentUser } = useAppSelector((state) => state.user);
  const { showAlert } = useHeaderModal();

  const [subscribers, setSubscribers] = useState<ISubscriber[]>([]);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    if (!userData) return;
    const result = await streamerFolows(userData.id);
    setSubscribers(Array.isArray(result) ? result : []);
  }, [userData]);

  useEffect(() => {
    if (!currentUser || !Array.isArray(subscribers)) return;
    setIsSubscriber(subscribers.some((u) => u.nickname === currentUser.nickname));
  }, [subscribers, currentUser]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const handlerSubscribe = async () => {
    if (!isAuth) {
      showAlert('Сначала войдите в профиль', 'warning');
      return;
    }
    if (!userData) return;

    const result = await subscribeToUser(userData.id);
    if (result && !(result instanceof Error)) {
      fetchSubscribers();
      window.dispatchEvent(
        new CustomEvent('stream-subscription-changed', {
          detail: { streamerId: userData.id, subscribed: true },
        })
      );
    }
  };

  const handlerDeleteSubscribe = async () => {
    if (!userData) return;

    const result = await deleteSubscribe(userData.id);
    if (result && !(result instanceof Error)) {
      fetchSubscribers();
      window.dispatchEvent(
        new CustomEvent('stream-subscription-changed', {
          detail: { streamerId: userData.id, subscribed: false },
        })
      );
    }
  };

  const avatarSrc = mediaUrl(userData?.profileImage) ?? DEFAULT_AVATAR;
  const backgroundSrc = mediaUrl(userData?.backgroundImage);
  const subscriberLabel = formatSubscriberCount(subscribers.length);
  const profileDescription = userData?.profileDescription?.trim() ?? '';

  const followControl =
    isNotProfileData &&
    (isSubscriber ? (
      <Button onClick={handlerDeleteSubscribe} sx={unfollowButtonSx}>
        Отписаться
      </Button>
    ) : (
      <Button onClick={handlerSubscribe} sx={followButtonSx}>
        Подписаться
      </Button>
    ));

  const reportControl = isNotProfileData && isAuth && userData?.id && (
    <Button
      onClick={() => setReportOpen(true)}
      startIcon={<FlagOutlinedIcon sx={{ fontSize: '16px !important' }} />}
      sx={{
        ...unfollowButtonSx,
        color: 'rgba(255,255,255,0.65)',
        borderColor: 'rgba(255,255,255,0.16)',
      }}
    >
      Пожаловаться
    </Button>
  );

  const reportDialog = userData?.id ? (
    <ReportDialog
      open={reportOpen}
      title="Пожаловаться на канал"
      subtitle={userData.nickname}
      payload={{
        targetType: 'channel',
        targetUserId: userData.id,
        streamerId: userData.id,
      }}
      onClose={() => setReportOpen(false)}
    />
  ) : null;

  const subscriberRow = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
      <PeopleOutlineIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.45)' }} />
      <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{subscriberLabel}</Typography>
    </Box>
  );

  if (isLive) {
    return (
      <Box
        sx={{
          ...panelSx,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          p: 2,
          mt: 1.5,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            width: '100%',
          }}
        >
          <Avatar
            src={avatarSrc}
            alt={userData?.nickname ?? 'Аватар'}
            sx={{
              width: 56,
              height: 56,
              flexShrink: 0,
              border: '2px solid rgba(142,123,255,0.35)',
            }}
          />
          <Box sx={{ flex: '1 1 140px', minWidth: 0 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.25 }}>
              {userData?.nickname}
            </Typography>
            {subscriberRow}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', ml: { xs: 'auto', sm: 0 } }}>
            {followControl}
            {reportControl}
            <Socials socials={userData?.socialLinks} />
          </Box>
        </Box>

        {profileDescription && (
          <Box
            sx={{
              pt: 1.25,
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
                mb: 0.75,
              }}
            >
              О канале
            </Typography>
            <StreamerDescription text={profileDescription} compact />
          </Box>
        )}
        {reportDialog}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        ...panelSx,
        position: 'relative',
        overflow: 'hidden',
        mt: 1.5,
        minHeight: { xs: 'auto', sm: 220 },
      }}
    >
      {backgroundSrc ? (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${backgroundSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, rgba(12,10,28,0.88) 0%, rgba(12,10,28,0.55) 55%, rgba(12,10,28,0.75) 100%)',
            },
          }}
        />
      ) : (
        <BannerEffect />
      )}

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 2.5 },
          p: { xs: 2, sm: 3 },
        }}
      >
        <Avatar
          src={avatarSrc}
          alt={userData?.nickname ?? 'Аватар'}
          sx={{
            width: { xs: 96, sm: 120 },
            height: { xs: 96, sm: 120 },
            flexShrink: 0,
            border: '3px solid rgba(142,123,255,0.4)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Box>
            <Typography
              sx={{
                fontSize: { xs: 28, sm: 32 },
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1.15,
                wordBreak: 'break-word',
              }}
            >
              {userData?.nickname}
            </Typography>
            {subscriberRow}
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25 }}>
            {followControl}
            {reportControl}
            <Socials socials={userData?.socialLinks} />
          </Box>
        </Box>
      </Box>
      {reportDialog}
    </Box>
  );
};
