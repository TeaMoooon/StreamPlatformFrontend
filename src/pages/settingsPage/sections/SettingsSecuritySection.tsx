import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Form, Formik } from 'formik';
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ComputerOutlinedIcon from '@mui/icons-material/ComputerOutlined';
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined';
import TabletMacOutlinedIcon from '@mui/icons-material/TabletMacOutlined';
import DevicesOtherOutlinedIcon from '@mui/icons-material/DevicesOtherOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import * as Yup from 'yup';
import { AppDispatch } from '../../../store/store';
import { checkExistEmail, logoutUser } from '../../../store/actions/UserActions';
import {
  AuthSession,
  changeProfileData,
  fetchAuthSessions,
  fetchLoginHistory,
  LoginHistoryItem,
  revokeAllAuthSessions,
  revokeAuthSession,
  revokeOtherAuthSessions,
} from '../../../store/actions/SettingsActions';
import { useAppSelector } from '../../../hooks/redux';
import { useSettingsNotice } from '../context/SettingsNoticeContext';
import { email as emailSchema, passwordSchema } from '../../../validation/validation';
import {
  settingsFieldSx,
  settingsOutlinedButtonSx,
  settingsPanelSx,
  settingsPrimaryButtonSx,
} from '../settings.styles';
import { StyledSettingsSectionHint, StyledSettingsSectionTitle } from '../StyledSettingsPage';

const HISTORY_PAGE_SIZE = 5;

const DEVICE_LABELS: Record<string, string> = {
  Desktop: 'Компьютер',
  Mobile: 'Телефон',
  Tablet: 'Планшет',
  Unknown: 'Неизвестно',
};

const CATEGORY_ORDER = ['Desktop', 'Mobile', 'Tablet', 'Unknown'];

const formatDeviceLabel = (raw: string) => DEVICE_LABELS[raw] || raw || '—';

const formatLoginDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '—', time: '—' };
  return {
    date: d.toLocaleDateString('ru-RU'),
    time: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
  };
};

const formatRelative = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const sessionWord = (n: number) => {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return 'сеанс';
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 'сеанса';
  return 'сеансов';
};

const categoryGroupTitle = (category: string, count: number) => {
  const word = `${count} ${sessionWord(count)}`;
  switch (category) {
    case 'Desktop':
      return `${word} на компьютерах`;
    case 'Mobile':
      return `${word} на телефонах`;
    case 'Tablet':
      return `${word} на планшетах`;
    default:
      return `${word} на других устройствах`;
  }
};

const CategoryIcon = ({ category }: { category: string }) => {
  const sx = { color: 'rgba(255,255,255,0.7)', fontSize: 28 };
  if (category === 'Mobile') return <SmartphoneOutlinedIcon sx={sx} />;
  if (category === 'Tablet') return <TabletMacOutlinedIcon sx={sx} />;
  if (category === 'Desktop') return <ComputerOutlinedIcon sx={sx} />;
  return <DevicesOtherOutlinedIcon sx={sx} />;
};

const loginHistoryTableSx = {
  '& .MuiTableCell-root': {
    borderColor: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    py: 1.25,
    px: 1.5,
  },
  '& .MuiTableCell-head': {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 600,
    fontSize: 12,
  },
};

const dialogPaperSx = {
  bgcolor: 'rgba(18,16,32,0.98)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
};

const changeEmailSchema = Yup.object({
  newEmail: emailSchema,
  currentPassword: Yup.string().required('Введите текущий пароль'),
});

const changePasswordSchema = Yup.object({
  currentPassword: Yup.string().required('Введите текущий пароль'),
  newPassword: passwordSchema,
  confirmPassword: Yup.string()
    .required('Повторите новый пароль')
    .oneOf([Yup.ref('newPassword')], 'Пароли не совпадают'),
});

type ChangeEmailForm = {
  newEmail: string;
  currentPassword: string;
};

type ChangePasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export const SettingsSecuritySection = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { data: userData } = useAppSelector((state) => state.user);
  const { showNotice } = useSettingsNotice();

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsBusy, setSessionsBusy] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const forceLocalLogout = useCallback(async () => {
    await dispatch(logoutUser());
    navigate('/', { replace: true });
  }, [dispatch, navigate]);

  const reloadSessions = useCallback(async () => {
    setSessionsLoading(true);
    const result = await fetchAuthSessions();
    if (result.success && result.data) {
      setSessions(result.data);
      setSessionsError(null);
      const next: Record<string, boolean> = {};
      result.data.forEach((s) => {
        next[s.deviceCategory] = true;
      });
      setExpandedCategories(next);
    } else {
      setSessionsError(result.message || 'Не удалось загрузить сеансы');
    }
    setSessionsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      const [historyResult] = await Promise.all([fetchLoginHistory(0, HISTORY_PAGE_SIZE), reloadSessions()]);
      if (cancelled) return;
      if (historyResult.success && historyResult.data) {
        setLoginHistory(historyResult.data.items);
        setHistoryTotal(historyResult.data.total);
        setHistoryError(null);
      } else {
        setHistoryError(historyResult.message || 'Не удалось загрузить историю входов');
      }
      setHistoryLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadSessions]);

  const sessionGroups = useMemo(() => {
    const map = new Map<string, AuthSession[]>();
    sessions.forEach((s) => {
      const key = s.deviceCategory || 'Unknown';
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    });
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((category) => ({
      category,
      items: map.get(category)!,
      labels: Array.from(new Set(map.get(category)!.map((s) => s.deviceLabel))),
    }));
  }, [sessions]);

  const hasOtherSessions = sessions.some((s) => !s.isCurrent);

  const hasMoreHistory = loginHistory.length < historyTotal;
  const canCollapseHistory = loginHistory.length > HISTORY_PAGE_SIZE;
  const remainingCount = Math.max(0, historyTotal - loginHistory.length);

  const loadMoreHistory = useCallback(async () => {
    if (historyLoadingMore || !hasMoreHistory) return;
    setHistoryLoadingMore(true);
    const result = await fetchLoginHistory(loginHistory.length, HISTORY_PAGE_SIZE);
    if (result.success && result.data) {
      setLoginHistory((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        const appended = result.data!.items.filter((r) => !seen.has(r.id));
        return [...prev, ...appended];
      });
      setHistoryTotal(result.data.total);
      setHistoryError(null);
    } else {
      setHistoryError(result.message || 'Не удалось загрузить историю входов');
    }
    setHistoryLoadingMore(false);
  }, [historyLoadingMore, hasMoreHistory, loginHistory.length]);

  const collapseHistory = useCallback(() => {
    setLoginHistory((prev) => prev.slice(0, HISTORY_PAGE_SIZE));
  }, []);

  const handleRevokeSession = async (session: AuthSession) => {
    setSessionsBusy(true);
    const result = await revokeAuthSession(session.id);
    setSessionsBusy(false);
    if (!result.success) {
      showNotice(result.message || 'Не удалось завершить сеанс', 'error');
      return;
    }
    if (result.currentRevoked) {
      showNotice('Текущий сеанс завершён', 'success');
      await forceLocalLogout();
      return;
    }
    showNotice('Сеанс завершён', 'success');
    await reloadSessions();
  };

  const handleRevokeOthers = async () => {
    setSessionsBusy(true);
    const result = await revokeOtherAuthSessions();
    setSessionsBusy(false);
    if (!result.success) {
      showNotice(result.message || 'Не удалось завершить сеансы', 'error');
      return;
    }
    showNotice('Вы вышли на остальных устройствах', 'success');
    await reloadSessions();
  };

  const handleRevokeAll = async () => {
    setSessionsBusy(true);
    const result = await revokeAllAuthSessions();
    setSessionsBusy(false);
    if (!result.success) {
      showNotice(result.message || 'Не удалось завершить сеансы', 'error');
      return;
    }
    showNotice('Все сеансы завершены', 'success');
    await forceLocalLogout();
  };

  const submitEmailChange = async (values: ChangeEmailForm, { setFieldError, setSubmitting, resetForm }: any) => {
    const nextEmail = values.newEmail.trim().toLowerCase();
    if (nextEmail === (userData?.email || '').toLowerCase()) {
      setFieldError('newEmail', 'Введите адрес, отличный от текущего');
      return;
    }

    setSubmitting(true);
    try {
      const emailResult = await checkExistEmail(nextEmail);
      if (!emailResult.success) throw new Error(emailResult.message);
      if (emailResult.data?.exists) {
        setFieldError('newEmail', 'Данная почта уже используется');
        return;
      }

      const formData = new FormData();
      formData.append('Email', nextEmail);
      formData.append('CurrentPassword', values.currentPassword);

      const result = await dispatch(changeProfileData(formData));
      if (!result.success) throw new Error(result.message);

      showNotice('Почта обновлена', 'success');
      resetForm();
      setEmailDialogOpen(false);
    } catch (error: any) {
      const message = error?.message || 'Не удалось сменить почту';
      if (/парол/i.test(message)) setFieldError('currentPassword', message);
      else showNotice(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitPasswordChange = async (values: ChangePasswordForm, { setFieldError, setSubmitting, resetForm }: any) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('CurrentPassword', values.currentPassword);
      formData.append('NewPassword', values.newPassword);

      const result = await dispatch(changeProfileData(formData));
      if (!result.success) throw new Error(result.message);

      showNotice('Пароль успешно обновлен', 'success');
      resetForm();
      setPasswordDialogOpen(false);
      await reloadSessions();
    } catch (error: any) {
      const message = error?.message || 'Не удалось сменить пароль';
      if (/текущ|неверен|парол/i.test(message)) setFieldError('currentPassword', message);
      else showNotice(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <StyledSettingsSectionTitle>Безопасность</StyledSettingsSectionTitle>
      <StyledSettingsSectionHint>Почта и пароль видны только вам.</StyledSettingsSectionHint>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <Box
          sx={{
            ...settingsPanelSx,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Электронная почта</Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', mt: 0.5, wordBreak: 'break-all' }}>
              {userData?.email || '—'}
            </Typography>
          </Box>
          <Button variant="outlined" onClick={() => setEmailDialogOpen(true)} sx={settingsOutlinedButtonSx}>
            Изменить почту
          </Button>
        </Box>

        <Box
          sx={{
            ...settingsPanelSx,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Пароль</Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', mt: 0.5 }}>
              Рекомендуем менять пароль периодически
            </Typography>
          </Box>
          <Button variant="outlined" onClick={() => setPasswordDialogOpen(true)} sx={settingsOutlinedButtonSx}>
            Изменить пароль
          </Button>
        </Box>
      </Box>

      <Dialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Смена почты</DialogTitle>
        <Formik
          initialValues={{ newEmail: '', currentPassword: '' } satisfies ChangeEmailForm}
          validationSchema={changeEmailSchema}
          onSubmit={submitEmailChange}
          enableReinitialize
        >
          {({ values, handleChange, handleBlur, touched, errors, isSubmitting, resetForm }) => (
            <Form>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                  fullWidth
                  label="Текущая почта"
                  value={userData?.email || ''}
                  InputProps={{ readOnly: true }}
                  sx={settingsFieldSx}
                />
                <TextField
                  fullWidth
                  name="newEmail"
                  type="email"
                  label="Новая почта"
                  autoComplete="email"
                  value={values.newEmail}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.newEmail && Boolean(errors.newEmail)}
                  helperText={touched.newEmail && errors.newEmail}
                  sx={settingsFieldSx}
                />
                <TextField
                  fullWidth
                  name="currentPassword"
                  type="password"
                  label="Текущий пароль"
                  autoComplete="current-password"
                  value={values.currentPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.currentPassword && Boolean(errors.currentPassword)}
                  helperText={touched.currentPassword && errors.currentPassword}
                  sx={settingsFieldSx}
                />
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                  onClick={() => {
                    resetForm();
                    setEmailDialogOpen(false);
                  }}
                  sx={settingsOutlinedButtonSx}
                >
                  Отмена
                </Button>
                <Button type="submit" variant="contained" disabled={isSubmitting} sx={settingsPrimaryButtonSx}>
                  {isSubmitting ? 'Сохранение…' : 'Сохранить'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>

      <Dialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Смена пароля</DialogTitle>
        <Formik
          initialValues={{ currentPassword: '', newPassword: '', confirmPassword: '' } satisfies ChangePasswordForm}
          validationSchema={changePasswordSchema}
          onSubmit={submitPasswordChange}
          enableReinitialize
        >
          {({ values, handleChange, handleBlur, touched, errors, isSubmitting, resetForm }) => (
            <Form>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                  fullWidth
                  name="currentPassword"
                  type="password"
                  label="Текущий пароль"
                  autoComplete="current-password"
                  value={values.currentPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.currentPassword && Boolean(errors.currentPassword)}
                  helperText={touched.currentPassword && errors.currentPassword}
                  sx={settingsFieldSx}
                />
                <TextField
                  fullWidth
                  name="newPassword"
                  type="password"
                  label="Новый пароль"
                  autoComplete="new-password"
                  value={values.newPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.newPassword && Boolean(errors.newPassword)}
                  helperText={(touched.newPassword && errors.newPassword) || 'Минимум 6 символов, буква и цифра'}
                  sx={settingsFieldSx}
                />
                <TextField
                  fullWidth
                  name="confirmPassword"
                  type="password"
                  label="Повторите новый пароль"
                  autoComplete="new-password"
                  value={values.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                  helperText={touched.confirmPassword && errors.confirmPassword}
                  sx={settingsFieldSx}
                />
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                  onClick={() => {
                    resetForm();
                    setPasswordDialogOpen(false);
                  }}
                  sx={settingsOutlinedButtonSx}
                >
                  Отмена
                </Button>
                <Button type="submit" variant="contained" disabled={isSubmitting} sx={settingsPrimaryButtonSx}>
                  {isSubmitting ? 'Сохранение…' : 'Сохранить'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>

      <Box sx={{ mt: 4 }}>
        <StyledSettingsSectionTitle>Ваши устройства</StyledSettingsSectionTitle>
        <StyledSettingsSectionHint>Устройства, на которых вы вошли в аккаунт</StyledSettingsSectionHint>

        <Box sx={{ ...settingsPanelSx, mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sessionsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} sx={{ color: '#8e7bff' }} />
            </Box>
          ) : sessionsError ? (
            <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>{sessionsError}</Typography>
          ) : sessions.length === 0 ? (
            <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
              Активных сеансов нет. Войдите снова, чтобы увидеть это устройство.
            </Typography>
          ) : (
            <>
              {sessionGroups.map((group) => {
                const open = expandedCategories[group.category] ?? true;
                return (
                  <Box
                    key={group.category}
                    sx={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <Box
                      onClick={() =>
                        setExpandedCategories((prev) => ({
                          ...prev,
                          [group.category]: !open,
                        }))
                      }
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2,
                        py: 1.5,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                      }}
                    >
                      <CategoryIcon category={group.category} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                          {categoryGroupTitle(group.category, group.items.length)}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.45)',
                            mt: 0.25,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {group.labels.join(', ')}
                        </Typography>
                      </Box>
                      {open ? (
                        <ExpandLessIcon sx={{ color: 'rgba(255,255,255,0.45)' }} />
                      ) : (
                        <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.45)' }} />
                      )}
                    </Box>

                    <Collapse in={open}>
                      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {group.items.map((session) => (
                          <Box
                            key={session.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              px: 2,
                              py: 1.5,
                              borderTop: '1px solid rgba(255,255,255,0.04)',
                            }}
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                                {session.deviceLabel}
                                {session.isCurrent && (
                                  <Typography
                                    component="span"
                                    sx={{ ml: 1, fontSize: 12, fontWeight: 600, color: '#8e7bff' }}
                                  >
                                    · этот сеанс
                                  </Typography>
                                )}
                              </Typography>
                              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', mt: 0.35 }}>
                                Активность {formatRelative(session.lastSeenAt)}
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              disabled={sessionsBusy}
                              onClick={() => handleRevokeSession(session)}
                              title={session.isCurrent ? 'Выйти на этом устройстве' : 'Завершить сеанс'}
                              sx={{ color: 'rgba(255,255,255,0.7)' }}
                            >
                              <LogoutOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pt: 0.5 }}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={sessionsBusy || !hasOtherSessions}
                  onClick={handleRevokeOthers}
                  sx={settingsOutlinedButtonSx}
                >
                  Выйти на всех остальных
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={sessionsBusy || sessions.length === 0}
                  onClick={handleRevokeAll}
                  sx={{
                    ...settingsOutlinedButtonSx,
                    borderColor: 'rgba(255,100,100,0.35)',
                    color: 'rgba(255,160,160,0.95)',
                    '&:hover': {
                      borderColor: 'rgba(255,100,100,0.55)',
                      bgcolor: 'rgba(255,80,80,0.08)',
                    },
                  }}
                >
                  Выйти везде
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Box>

      <Box sx={{ mt: 4 }}>
        <StyledSettingsSectionTitle>История входов</StyledSettingsSectionTitle>
        <StyledSettingsSectionHint>Последние успешные входы в аккаунт</StyledSettingsSectionHint>

        <Box sx={{ ...settingsPanelSx, mt: 1 }}>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} sx={{ color: '#8e7bff' }} />
            </Box>
          ) : historyError ? (
            <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>{historyError}</Typography>
          ) : loginHistory.length === 0 ? (
            <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
              Пока нет записей. Они появятся после следующего входа.
            </Typography>
          ) : (
            <>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={loginHistoryTableSx}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Дата</TableCell>
                      <TableCell>Время</TableCell>
                      <TableCell>Устройство</TableCell>
                      <TableCell>IP-адрес</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loginHistory.map((row) => {
                      const { date, time } = formatLoginDate(row.loggedInAt);
                      return (
                        <TableRow key={row.id}>
                          <TableCell>{date}</TableCell>
                          <TableCell>{time}</TableCell>
                          <TableCell>{formatDeviceLabel(row.deviceType)}</TableCell>
                          <TableCell sx={{ fontFamily: 'ui-monospace, monospace' }}>{row.ipAddress}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Collapse in={hasMoreHistory || canCollapseHistory}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5, alignItems: 'center' }}>
                  {hasMoreHistory && (
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={
                        historyLoadingMore ? (
                          <CircularProgress size={14} sx={{ color: 'inherit' }} />
                        ) : (
                          <ExpandMoreIcon />
                        )
                      }
                      disabled={historyLoadingMore}
                      onClick={loadMoreHistory}
                      sx={settingsOutlinedButtonSx}
                    >
                      Показать ещё {Math.min(HISTORY_PAGE_SIZE, remainingCount)}
                    </Button>
                  )}
                  {canCollapseHistory && (
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={<ExpandLessIcon />}
                      disabled={historyLoadingMore}
                      onClick={collapseHistory}
                      sx={settingsOutlinedButtonSx}
                    >
                      Свернуть
                    </Button>
                  )}
                </Box>
              </Collapse>
            </>
          )}
        </Box>
      </Box>
    </>
  );
};
