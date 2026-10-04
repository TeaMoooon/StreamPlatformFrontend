import { useDispatch } from 'react-redux';
import { Form, Formik, FieldArray } from 'formik';
import { Box, TextField, Typography } from '@mui/material';
import { AppDispatch } from '../../../store/store';
import { checkExistEmail, checkExistNickname } from '../../../store/actions/UserActions';
import { changeProfileData } from '../../../store/actions/SettingsActions';
import { validationChangeProfile } from '../../../validation/validation';
import { useAppSelector } from '../../../hooks/redux';
import { useSettingsNotice } from '../context/SettingsNoticeContext';
import { IProfileChange } from '../../../types/share';
import { normalizeSocialLinks } from '../../../constants/socialPlatforms';
import { SocialLinksEditor } from '../components/socialLinksEditor/SocialLinksEditor';
import { ProfileImageField, SettingsFieldBlock, SettingsFormActions } from '../components/ProfileImageField';
import { settingsFieldSx, settingsPanelSx } from '../settings.styles';
import { StyledSettingsSectionHint, StyledSettingsSectionTitle } from '../StyledSettingsPage';

export const SettingsProfileSection = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { data: userData } = useAppSelector((state) => state.user);
  const { showNotice } = useSettingsNotice();

  const initialValues: IProfileChange = {
    nickname: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    profileDescription: userData?.profileDescription ?? '',
    profileImage: null,
    backgroundImage: null,
    socialLinks: normalizeSocialLinks(userData?.socialLinks),
  };

  const resolveMediaUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const base = process.env.REACT_APP_API_LOCAL || '';
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const onSubmit = async (values: IProfileChange, { setFieldError, setSubmitting, resetForm }: any) => {
    const normalizedSocial = normalizeSocialLinks(values.socialLinks);
    const initialSocial = normalizeSocialLinks(userData?.socialLinks);
    const socialLinksChanged = JSON.stringify(normalizedSocial) !== JSON.stringify(initialSocial);

    const hasAnyValue =
      !!values.nickname?.trim() ||
      !!values.email?.trim() ||
      !!values.profileDescription?.trim() ||
      !!values.profileImage ||
      !!values.backgroundImage ||
      normalizedSocial.length > 0 ||
      socialLinksChanged;

    if (!hasAnyValue) {
      showNotice('Нечего сохранять — заполните хотя бы одно поле.', 'warning');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();

    try {
      if (values.nickname) {
        const nicknameResult = await checkExistNickname(values.nickname);
        if (!nicknameResult.success) throw new Error(nicknameResult.message);
        if (nicknameResult.data?.exists && values.nickname !== userData?.nickname) {
          setFieldError('nickname', 'Данный ник уже используется');
          return;
        }
      }

      if (values.email) {
        const emailResult = await checkExistEmail(values.email);
        if (!emailResult.success) throw new Error(emailResult.message);
        if (emailResult.data?.exists && values.email !== userData?.email) {
          setFieldError('email', 'Данная почта уже используется');
          return;
        }
      }

      if (values.nickname) formData.append('Nickname', values.nickname);
      if (values.email) formData.append('Email', values.email);
      if (values.profileDescription) formData.append('ProfileDescription', values.profileDescription);
      if (values.profileImage) formData.append('ProfileImage', values.profileImage);
      if (values.backgroundImage) formData.append('BackgroundImage', values.backgroundImage);

      const filteredSocialLinks = normalizedSocial;
      formData.append('SocialLinks', JSON.stringify(filteredSocialLinks));

      const result = await dispatch(changeProfileData(formData));
      if (!result.success) throw new Error(result.message);

      showNotice('Профиль обновлён', 'success');
      resetForm({
        values: {
          ...initialValues,
          profileDescription: values.profileDescription,
          socialLinks: filteredSocialLinks,
        },
      });
    } catch {
      showNotice('Не удалось обновить профиль', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationChangeProfile}
      onSubmit={onSubmit}
      enableReinitialize
    >
      {({ values, handleChange, handleBlur, touched, errors, resetForm, setFieldValue, isSubmitting }) => (
        <Form>
          <StyledSettingsSectionTitle>Профиль</StyledSettingsSectionTitle>
          <StyledSettingsSectionHint>Эти данные видны на странице канала</StyledSettingsSectionHint>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ ...settingsPanelSx, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <SettingsFieldBlock title="Никнейм" hint="Оставьте пустым, если не меняете">
                <TextField
                  fullWidth
                  name="nickname"
                  placeholder={userData?.nickname || 'Новый ник'}
                  value={values.nickname}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.nickname && Boolean(errors.nickname)}
                  helperText={touched.nickname && errors.nickname}
                  sx={settingsFieldSx}
                />
              </SettingsFieldBlock>

              <SettingsFieldBlock title="Описание" hint="До 500 символов">
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  maxRows={6}
                  name="profileDescription"
                  value={values.profileDescription}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.profileDescription && Boolean(errors.profileDescription)}
                  helperText={
                    (touched.profileDescription && errors.profileDescription) ||
                    `${values.profileDescription?.length ?? 0} / 500`
                  }
                  FormHelperTextProps={{ sx: { color: 'rgba(255,255,255,0.35)', textAlign: 'right' } }}
                  sx={settingsFieldSx}
                />
              </SettingsFieldBlock>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                alignItems: 'stretch',
              }}
            >
              <ProfileImageField
                label="Аватар"
                hint="JPEG, PNG или WEBP до 5 MB"
                name="profileImage"
                cropAspect="avatar"
                currentUrl={resolveMediaUrl(userData?.profileImage)}
                value={values.profileImage ?? null}
                setFieldValue={setFieldValue}
                touched={touched.profileImage}
                error={errors.profileImage as string}
              />
              <ProfileImageField
                label="Фон канала"
                hint="JPEG, PNG или WEBP до 5 MB"
                name="backgroundImage"
                cropAspect="cover"
                currentUrl={resolveMediaUrl(userData?.backgroundImage)}
                value={values.backgroundImage ?? null}
                setFieldValue={setFieldValue}
                touched={touched.backgroundImage}
                error={errors.backgroundImage as string}
              />
            </Box>

            <Box sx={{ ...settingsPanelSx, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Социальные сети</Typography>
              <FieldArray name="socialLinks">
                {(arrayHelpers) => <SocialLinksEditor arrayHelpers={arrayHelpers} />}
              </FieldArray>
            </Box>

            <SettingsFormActions onReset={() => resetForm()} isSubmitting={isSubmitting} />
          </Box>
        </Form>
      )}
    </Formik>
  );
};
