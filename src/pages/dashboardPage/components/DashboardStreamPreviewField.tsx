import { Box, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { ImageCropDialog } from '../../../components/imageCrop/ImageCropDialog';
import { resolveMediaUrl } from '../../../utils/resolveMediaUrl';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

type DashboardStreamPreviewFieldProps = {
  currentUrl?: string | null;
  value: File | null;
  onChange: (file: File | null) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
};

export const DashboardStreamPreviewField = ({
  currentUrl,
  value,
  onChange,
  onError,
  disabled,
}: DashboardStreamPreviewFieldProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!value) {
      setLocalPreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setLocalPreview(reader.result as string);
    reader.readAsDataURL(value);
  }, [value]);

  useEffect(
    () => () => {
      if (cropObjectUrlRef.current) URL.revokeObjectURL(cropObjectUrlRef.current);
    },
    []
  );

  const displayUrl = localPreview || resolveMediaUrl(currentUrl) || null;

  const clearCropSrc = () => {
    if (cropObjectUrlRef.current) {
      URL.revokeObjectURL(cropObjectUrlRef.current);
      cropObjectUrlRef.current = null;
    }
    setCropSrc(null);
    setCropOpen(false);
  };

  const applyFile = (file: File | null) => {
    onChange(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startCropOrApply = (file: File | null) => {
    if (!file) {
      clearCropSrc();
      applyFile(null);
      return;
    }

    if (file.size > MAX_SIZE) {
      onError?.('Файл слишком большой (макс. 5 MB)');
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      onError?.('Разрешены только JPG, PNG и WEBP');
      return;
    }

    if (cropObjectUrlRef.current) URL.revokeObjectURL(cropObjectUrlRef.current);
    const url = URL.createObjectURL(file);
    cropObjectUrlRef.current = url;
    setCropSrc(url);
    setCropOpen(true);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>Превью стрима</Typography>
        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>
          Показывается на карточках эфира. Можно обрезать кадр, до 5 MB.
        </Typography>
      </Box>

      {displayUrl && (
        <Box
          component="img"
          src={displayUrl}
          alt=""
          sx={{
            width: '100%',
            maxHeight: 220,
            objectFit: 'cover',
            borderRadius: 1.5,
            border: '1px solid rgba(255,255,255,0.08)',
            aspectRatio: '16 / 9',
          }}
        />
      )}

      <Box
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (disabled) return;
          startCropOrApply(e.dataTransfer.files[0] || null);
        }}
        sx={{
          p: 2,
          borderRadius: 1.5,
          border: `1px dashed ${dragActive ? 'rgba(142,123,255,0.55)' : 'rgba(255,255,255,0.16)'}`,
          bgcolor: dragActive ? 'rgba(142,123,255,0.08)' : 'rgba(255,255,255,0.02)',
          textAlign: 'center',
          opacity: disabled ? 0.6 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
        }}
      >
        <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', mb: 1 }}>
          Перетащите изображение или выберите файл
        </Typography>
        <Box
          component="label"
          sx={{
            display: 'inline-flex',
            px: 2,
            py: 0.75,
            borderRadius: 1,
            bgcolor: 'rgba(142,123,255,0.18)',
            color: '#ddd',
            fontSize: 13,
            fontWeight: 600,
            cursor: disabled ? 'default' : 'pointer',
            '&:hover': { bgcolor: disabled ? 'rgba(142,123,255,0.18)' : 'rgba(142,123,255,0.28)' },
          }}
        >
          Загрузить
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled}
            onChange={(e) => startCropOrApply(e.currentTarget.files?.[0] || null)}
          />
        </Box>
        {value && (
          <Typography
            component="button"
            type="button"
            onClick={() => startCropOrApply(null)}
            sx={{
              display: 'block',
              mx: 'auto',
              mt: 1,
              border: 0,
              background: 'none',
              color: 'rgba(255,255,255,0.45)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Сбросить выбор
          </Typography>
        )}
      </Box>

      <ImageCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        aspect="preview"
        title="Область превью"
        onCancel={() => {
          clearCropSrc();
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        onComplete={(file) => {
          clearCropSrc();
          applyFile(file);
        }}
      />
    </Box>
  );
};
