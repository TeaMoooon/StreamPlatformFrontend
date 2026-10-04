import { FormEvent, useState } from 'react';
import { Box, Button, Chip, CircularProgress, MenuItem, TextField, Typography } from '@mui/material';
import {
  SANCTION_DURATION_OPTIONS,
  SANCTION_TYPE_OPTIONS,
  STAFF_ROLE_OPTIONS,
  StaffUserDetail,
  StaffUserSearch,
  fetchStaffUser,
  issueStaffSanction,
  revokeStaffSanction,
  searchStaffUsers,
  setStaffUserRole,
} from '../../../api/staffApi';
import { sanctionTypeLabel } from '../../../api/appealsApi';
import { StyledDashboardSectionHint, StyledDashboardSectionTitle } from '../../dashboardPage/StyledDashboardPage';

const panelSx = {
  p: 2,
  borderRadius: 2,
  bgcolor: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    bgcolor: 'rgba(255,255,255,0.04)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.55)' },
  '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.6)' },
};

type Props = {
  canManageStaffRoles: boolean;
  canModeratePlatform: boolean;
  actorRole: string;
};

export const StaffUsersSection = ({ canManageStaffRoles, canModeratePlatform, actorRole }: Props) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<StaffUserSearch[]>([]);
  const [selected, setSelected] = useState<StaffUserDetail | null>(null);
  const [roleDraft, setRoleDraft] = useState('User');
  const [sanctionType, setSanctionType] = useState('chat_mute');
  const [sanctionDuration, setSanctionDuration] = useState<number | null>(60);
  const [sanctionReason, setSanctionReason] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSanctionBusy, setIsSanctionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const roleOptions =
    actorRole === 'SuperAdmin' ? STAFF_ROLE_OPTIONS : STAFF_ROLE_OPTIONS.filter((r) => r.value !== 'SuperAdmin');

  const onSearch = async (e?: FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError('Введите минимум 2 символа');
      return;
    }
    setIsSearching(true);
    setError(null);
    setNotice(null);
    const result = await searchStaffUsers(q);
    setIsSearching(false);
    if (!result.success) {
      setError(result.message || 'Ошибка поиска');
      setUsers([]);
      return;
    }
    setUsers(result.users);
    if (result.users.length === 0) setSelected(null);
  };

  const openUser = async (id: number) => {
    setIsLoadingUser(true);
    setError(null);
    setNotice(null);
    const result = await fetchStaffUser(id);
    setIsLoadingUser(false);
    if (!result.success) {
      setError(result.message || 'Не удалось загрузить пользователя');
      return;
    }
    setSelected(result.user);
    setRoleDraft(result.user.role);
    setSanctionReason('');
  };

  const saveRole = async () => {
    if (!selected) return;
    setIsSaving(true);
    setError(null);
    setNotice(null);
    const result = await setStaffUserRole(selected.id, roleDraft);
    setIsSaving(false);
    if (!result.success) {
      setError(result.message || 'Не удалось сменить роль');
      return;
    }
    setSelected(result.user);
    setRoleDraft(result.user.role);
    setUsers((prev) => prev.map((u) => (u.id === result.user.id ? { ...u, role: result.user.role } : u)));
    setNotice('Роль обновлена. Пользователю нужно войти заново, чтобы права применились.');
  };

  const issueSanction = async () => {
    if (!selected || sanctionReason.trim().length < 3) return;
    setIsSanctionBusy(true);
    setError(null);
    setNotice(null);
    const result = await issueStaffSanction({
      targetUserId: selected.id,
      type: sanctionType,
      reason: sanctionReason.trim(),
      durationMinutes: sanctionType === 'warning' ? null : sanctionDuration,
    });
    setIsSanctionBusy(false);
    if (!result.success) {
      setError(result.message || 'Не удалось выдать санкцию');
      return;
    }
    setSanctionReason('');
    setNotice('Санкция выдана');
    await openUser(selected.id);
  };

  const revokeSanction = async (id: number) => {
    setIsSanctionBusy(true);
    setError(null);
    setNotice(null);
    const result = await revokeStaffSanction(id);
    setIsSanctionBusy(false);
    if (!result.success) {
      setError(result.message || 'Не удалось снять санкцию');
      return;
    }
    setNotice('Санкция снята');
    if (selected) await openUser(selected.id);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <StyledDashboardSectionTitle>Мут и бан</StyledDashboardSectionTitle>
        {!canModeratePlatform && (
          <StyledDashboardSectionHint>Выдавать наказания могут только модераторы и админы.</StyledDashboardSectionHint>
        )}
      </Box>

      <Box component="form" onSubmit={onSearch} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label="Ник, email или id"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ ...fieldSx, minWidth: 240, flex: 1 }}
        />
        <Button
          type="submit"
          disabled={isSearching}
          variant="contained"
          sx={{ textTransform: 'none', bgcolor: '#6d5dfb', '&:hover': { bgcolor: '#8e7bff' } }}
        >
          {isSearching ? '...' : 'Найти'}
        </Button>
      </Box>

      {error && <Typography sx={{ color: '#ff8a8a', fontSize: 14 }}>{error}</Typography>}
      {notice && <Typography sx={{ color: '#6fff79', fontSize: 14 }}>{notice}</Typography>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {users.length === 0 ? (
            <Box sx={panelSx}>
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                Пока никого не искали. Введите ник и нажмите «Найти».
              </Typography>
            </Box>
          ) : (
            users.map((user) => (
              <Box
                key={user.id}
                onClick={() => void openUser(user.id)}
                sx={{
                  ...panelSx,
                  cursor: 'pointer',
                  borderColor: selected?.id === user.id ? 'rgba(142,123,255,0.45)' : 'rgba(255,255,255,0.08)',
                }}
              >
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{user.nickname}</Typography>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', mt: 0.5 }}>
                  #{user.id} · {user.role}
                  {user.activeSanctionCount > 0 ? ` · уже наказан: ${user.activeSanctionCount}` : ''}
                </Typography>
              </Box>
            ))
          )}
        </Box>

        {isLoadingUser ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} sx={{ color: '#8e7bff' }} />
          </Box>
        ) : selected ? (
          <Box sx={{ ...panelSx, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{selected.nickname}</Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
              id {selected.id} · {selected.email || '—'} · с {new Date(selected.createdAt).toLocaleDateString()}
            </Typography>
            <Chip
              size="small"
              label={`Роль на сайте: ${selected.role}`}
              sx={{ alignSelf: 'flex-start', bgcolor: 'rgba(142,123,255,0.2)', color: '#fff' }}
            />

            {canManageStaffRoles && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                  select
                  size="small"
                  label="Сменить роль сотрудника"
                  value={roleDraft}
                  onChange={(e) => setRoleDraft(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 200 }}
                >
                  {roleOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  size="small"
                  disabled={isSaving || roleDraft === selected.role}
                  onClick={() => void saveRole()}
                  variant="contained"
                  sx={{ textTransform: 'none', bgcolor: '#6d5dfb', '&:hover': { bgcolor: '#8e7bff' } }}
                >
                  {isSaving ? '...' : 'Сохранить роль'}
                </Button>
              </Box>
            )}

            {canModeratePlatform && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.25,
                  mt: 0.5,
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid rgba(229,57,53,0.45)',
                  bgcolor: 'rgba(198,40,40,0.12)',
                }}
              >
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#ff8a80' }}>Выдать мут или бан</Typography>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                  Здесь выдаются наказания всей платформы (не только чат одного стрима).
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <TextField
                    select
                    size="small"
                    label="Что сделать"
                    value={sanctionType}
                    onChange={(e) => setSanctionType(e.target.value)}
                    sx={{ ...fieldSx, minWidth: 220 }}
                  >
                    {SANCTION_TYPE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label} — {opt.hint}
                      </MenuItem>
                    ))}
                  </TextField>
                  {sanctionType !== 'warning' && (
                    <TextField
                      select
                      size="small"
                      label="На сколько"
                      value={sanctionDuration === null ? 'perm' : String(sanctionDuration)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSanctionDuration(v === 'perm' ? null : Number(v));
                      }}
                      sx={{ ...fieldSx, minWidth: 140 }}
                    >
                      {SANCTION_DURATION_OPTIONS.map((opt) => (
                        <MenuItem key={String(opt.value)} value={opt.value === null ? 'perm' : String(opt.value)}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Box>
                <TextField
                  size="small"
                  label="Почему (увидит пользователь)"
                  value={sanctionReason}
                  onChange={(e) => setSanctionReason(e.target.value.slice(0, 500))}
                  sx={fieldSx}
                  fullWidth
                />
                <Button
                  size="medium"
                  disabled={isSanctionBusy || sanctionReason.trim().length < 3}
                  onClick={() => void issueSanction()}
                  variant="contained"
                  sx={{
                    textTransform: 'none',
                    alignSelf: 'flex-start',
                    fontWeight: 700,
                    bgcolor: '#c62828',
                    '&:hover': { bgcolor: '#e53935' },
                  }}
                >
                  {isSanctionBusy
                    ? 'Выдаём...'
                    : `Выдать: ${SANCTION_TYPE_OPTIONS.find((o) => o.value === sanctionType)?.label || sanctionType}`}
                </Button>
              </Box>
            )}

            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#fff', mb: 1 }}>
                Уже действующие наказания
              </Typography>
              {selected.activeSanctions.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Пока нет</Typography>
              ) : (
                selected.activeSanctions.map((s) => (
                  <Box
                    key={s.id}
                    sx={{
                      mb: 1,
                      p: 1.25,
                      borderRadius: 1,
                      bgcolor: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Typography sx={{ fontSize: 13, color: '#ffb74d' }}>
                      {sanctionTypeLabel(s.type)} · #{s.id}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{s.reason}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                      с {new Date(s.createdAt).toLocaleString()}
                      {s.expiresAt ? ` · до ${new Date(s.expiresAt).toLocaleString()}` : ' · бессрочно'}
                    </Typography>
                    {canModeratePlatform && (
                      <Button
                        size="small"
                        disabled={isSanctionBusy}
                        onClick={() => void revokeSanction(s.id)}
                        sx={{ textTransform: 'none', color: '#6fff79', mt: 0.5, px: 0 }}
                      >
                        Снять наказание
                      </Button>
                    )}
                  </Box>
                ))
              )}
            </Box>
          </Box>
        ) : (
          <Box sx={panelSx}>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
              Слева выберите человека из результатов поиска
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
