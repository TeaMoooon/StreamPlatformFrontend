import { useState } from 'react';
import { Box, Chip, Divider, Typography } from '@mui/material';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import { IStream } from '../../../../types/share';
import { getStreamLanguageLabel } from '../../../../constants/streamLanguage.constants';
import { resolveMediaUrl } from '../../../../utils/resolveMediaUrl';

const mediaUrl = (path?: string | null) => resolveMediaUrl(path) || undefined;

const CategoryCover = ({ name, imageUrl }: { name: string; imageUrl?: string }) => {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !failed;

  return (
    <Box
      sx={{
        width: 64,
        height: 84,
        flexShrink: 0,
        borderRadius: 1.5,
        overflow: 'hidden',
        bgcolor: 'rgba(142,123,255,0.15)',
        border: '1px solid rgba(142,123,255,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {showImage ? (
        <Box
          component="img"
          src={imageUrl}
          alt={name}
          onError={() => setFailed(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Typography sx={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.35)' }}>
          {name.charAt(0).toUpperCase()}
        </Typography>
      )}
    </Box>
  );
};

export const StreamMetaPanel = ({ streamInfo }: { streamInfo: IStream | null }) => {
  if (!streamInfo) return null;

  const tags = streamInfo.tags ?? [];
  const hasCategory = Boolean(streamInfo.categoryName);
  const hasTags = tags.length > 0;
  const languageLabel = getStreamLanguageLabel(streamInfo.streamLanguage);

  if (!hasCategory && !hasTags && !languageLabel) return null;

  const categoryImage = mediaUrl(streamInfo.categoryBannerImageUrl);

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: { xs: 1.25, sm: 2 },
        px: 2,
        py: 1.75,
        minWidth: 0,
      }}
    >
      {hasCategory && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <CategoryCover name={streamInfo.categoryName!} imageUrl={categoryImage} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', mb: 0.25 }}>Категория</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
              {streamInfo.categoryName}
            </Typography>
          </Box>
        </Box>
      )}

      {hasCategory && (hasTags || languageLabel) && (
        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: 'rgba(255,255,255,0.12)', display: { xs: 'none', sm: 'block' }, alignSelf: 'stretch' }}
        />
      )}

      {hasTags && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, minWidth: 0, flex: '1 1 auto' }}>
          {tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                height: 28,
                fontSize: 12,
                bgcolor: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.88)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            />
          ))}
        </Box>
      )}

      {hasTags && languageLabel && (
        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: 'rgba(255,255,255,0.12)', display: { xs: 'none', sm: 'block' }, alignSelf: 'stretch' }}
        />
      )}

      {languageLabel && (
        <Chip
          icon={<LanguageOutlinedIcon sx={{ fontSize: '16px !important' }} />}
          label={languageLabel}
          size="small"
          sx={{
            height: 28,
            fontSize: 12,
            fontWeight: 600,
            bgcolor: 'rgba(142,123,255,0.12)',
            color: '#cfc5ff',
            border: '1px solid rgba(142,123,255,0.25)',
            '& .MuiChip-icon': { color: '#b8adff' },
          }}
        />
      )}
    </Box>
  );
};
