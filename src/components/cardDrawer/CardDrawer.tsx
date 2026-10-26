import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Tooltip } from '@mui/material';
import { useDrawer } from '../../context/DrawerContext';
import { CardDrawerBoxWatch, CardDrawerContainer } from './StyledCardDrawer';
import { CardTypography } from '../StylesComponents';
import { getStreamersLeagueLabel } from '../../utils/streamersLeague';
import { DEFAULT_AVATAR } from '../../constants/defaultAvatars';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

export type CardDrawerItem = {
  nickname: string;
  profileImage?: string | null;
  isOnline?: boolean;
  streamersLeague?: string | null;
  streamName?: string | null;
};

interface ICardDrawerProps {
  card: CardDrawerItem;
  variant?: 'full' | 'compact';
}

export const CardDrawer = ({ card, variant = 'full' }: ICardDrawerProps) => {
  const { nickname, profileImage, isOnline, streamersLeague, streamName } = card;
  const navigate = useNavigate();
  const { setOpen } = useDrawer();

  const avatarSrc = resolveMediaUrl(profileImage) || DEFAULT_AVATAR;
  const title = streamName?.trim() || nickname;
  const tooltip = streamName?.trim() ? `${nickname} — ${streamName}` : nickname;
  const leagueLabel = getStreamersLeagueLabel(streamersLeague);

  const handleClick = () => {
    setOpen(false);
    navigate(`/${nickname}`);
  };

  const avatarBlock = (
    <Box sx={{ position: 'relative', flexShrink: 0 }}>
      <Avatar
        alt={nickname}
        src={avatarSrc}
        sx={{ width: variant === 'compact' ? 44 : 48, height: variant === 'compact' ? 44 : 48 }}
      />
      {isOnline && <CardDrawerBoxWatch>Live</CardDrawerBoxWatch>}
    </Box>
  );

  if (variant === 'compact') {
    return (
      <Tooltip title={tooltip} placement="right">
        <Box
          component="button"
          type="button"
          onClick={handleClick}
          sx={{
            border: 'none',
            p: 0.5,
            m: 0,
            cursor: 'pointer',
            bgcolor: 'transparent',
            borderRadius: 1.5,
            display: 'flex',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        >
          {avatarBlock}
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box
      component="button"
      type="button"
      onClick={handleClick}
      sx={{
        border: 'none',
        width: '100%',
        textAlign: 'left',
        p: 0,
        m: 0,
        cursor: 'pointer',
        bgcolor: 'transparent',
        borderRadius: 1.5,
        '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
      }}
    >
      <CardDrawerContainer>
        {avatarBlock}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <CardTypography isEllipsis={true} sx={{ fontWeight: 600, color: '#fff' }}>
            {title}
          </CardTypography>
          <Box sx={{ display: 'flex', gap: 0.75, minWidth: 0 }}>
            <CardTypography c={'#b8adff'} fs={'13px'} isEllipsis={true}>
              {nickname}
            </CardTypography>
            {leagueLabel && (
              <CardTypography c={'rgba(255,255,255,0.4)'} fs={'13px'} isEllipsis={true}>
                {leagueLabel}
              </CardTypography>
            )}
          </Box>
        </Box>
      </CardDrawerContainer>
    </Box>
  );
};
