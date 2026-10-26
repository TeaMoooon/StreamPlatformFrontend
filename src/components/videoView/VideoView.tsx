import { Avatar, Box, CardMedia } from '@mui/material';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import {
  CardTypography,
  StyledButtonLive,
  StyledVideoCard,
  StyledVideoCardInfo,
  StyledVideoCardLink,
} from '../StylesComponents';
import { IStreamOnline } from '../../types/share';
import { useCheckedImage } from '../../hooks/checkImgFunctions';
import { getStreamersLeagueLabel } from '../../utils/streamersLeague';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { DEFAULT_AVATAR } from '../../constants/defaultAvatars';

export const VideoView = ({ item }: { item: IStreamOnline }) => {
  const leagueLabel = getStreamersLeagueLabel(item.streamersLeague);
  const isLive = item.isOnline !== false;
  const previewCandidate = item.previewUrl || item.profileImage;
  const avatarFallback = resolveMediaUrl(item.profileImage) || DEFAULT_AVATAR;
  const previewSrc = useCheckedImage(previewCandidate, avatarFallback);
  const viewerCount = item.viewerCount ?? 0;

  return (
    <StyledVideoCard>
      <StyledVideoCardLink to={item.nickname} />
      <CardMedia
        component="img"
        height="200"
        image={previewSrc}
        alt={item.streamName || item.nickname}
        sx={{ objectFit: 'cover', bgcolor: 'rgba(255,255,255,0.04)' }}
      />
      {isLive && (
        <StyledButtonLive sx={{ position: 'absolute', top: '8px', left: '8px', zIndex: 2 }}>LIVE</StyledButtonLive>
      )}
      {isLive && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.35,
            borderRadius: 1,
            bgcolor: 'rgba(0,0,0,0.62)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <PeopleOutlineIcon sx={{ fontSize: 14 }} />
          {viewerCount}
        </Box>
      )}
      <StyledVideoCardInfo>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Avatar src={avatarFallback} alt={item.nickname} sx={{ width: 28, height: 28 }} />
          <CardTypography fs="13px" isEllipsis sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
            {item.nickname}
          </CardTypography>
        </Box>
        <CardTypography fs="18px" sx={{ fontWeight: 600 }} isEllipsis={false}>
          {item.streamName || 'Без названия'}
        </CardTypography>
        {leagueLabel && (
          <CardTypography fs="13px" c="var(--hover-header-menu)" isEllipsis={false} sx={{ mt: 0.25 }}>
            {leagueLabel}
          </CardTypography>
        )}
      </StyledVideoCardInfo>
    </StyledVideoCard>
  );
};
