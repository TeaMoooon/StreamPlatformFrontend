import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { DashboardMode } from '../dashboard.constants';
import { useStreamTeam } from '../../../hooks/useStreamTeam';
import { StreamTeamRole } from '../../../api/streamTeamApi';
import { StyledDashboardSectionHint, StyledDashboardSectionTitle } from '../StyledDashboardPage';

const ROLE_LABELS: Record<StreamTeamRole, string> = {
  Moderator: 'Модератор',
  Assistant: 'Ассистент',
};

const ROLE_COLORS: Record<StreamTeamRole, { color: string; bg: string; border: string }> = {
  Moderator: {
    color: '#6fff79',
    bg: 'rgba(111,255,121,0.12)',
    border: 'rgba(111,255,121,0.25)',
  },
  Assistant: {
    color: '#8e7bff',
    bg: 'rgba(142,123,255,0.12)',
    border: 'rgba(142,123,255,0.25)',
  },
};

export const DashboardTeamSection = ({ channelNickname, mode }: { channelNickname: string; mode: DashboardMode }) => {
  const { members, access, isLoading, error, actionError, addMember, removeMember } = useStreamTeam(
    channelNickname,
    mode
  );
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<StreamTeamRole>('Assistant');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableRoles = useMemo(() => {
    const roles: StreamTeamRole[] = [];
    if (access?.canAssignAssistants) roles.push('Assistant');
    if (access?.canAssignModerators) roles.push('Moderator');
    return roles;
  }, [access]);

  useEffect(() => {
    if (availableRoles.length > 0 && !availableRoles.includes(role)) {
      setRole(availableRoles[0]);
    }
  }, [availableRoles, role]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || availableRoles.length === 0) return;

    setIsSubmitting(true);
    const ok = await addMember(nickname.trim(), role);
    setIsSubmitting(false);
    if (ok) setNickname('');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} sx={{ color: '#8e7bff' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <StyledDashboardSectionTitle>Команда и модерация</StyledDashboardSectionTitle>
        <Typography sx={{ color: '#ff8a8a', fontSize: 14 }}>{error}</Typography>
      </Box>
    );
  }

  if (!access?.canManageTeam) {
    return (
      <Box>
        <StyledDashboardSectionTitle>Команда и модерация</StyledDashboardSectionTitle>
        <StyledDashboardSectionHint>Недостаточно прав для управления командой.</StyledDashboardSectionHint>
      </Box>
    );
  }

  return (
    <Box>
      <StyledDashboardSectionTitle>Команда и модерация</StyledDashboardSectionTitle>
      <StyledDashboardSectionHint>
        {mode === 'own'
          ? 'Назначайте модераторов и ассистентов по никнейму.'
          : 'Модератор может назначать только ассистентов.'}
      </StyledDashboardSectionHint>

      {availableRoles.length > 0 && (
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            mb: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <TextField
            size="small"
            placeholder="Никнейм"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            sx={{
              flex: '1 1 180px',
              minWidth: 160,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.04)',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
              },
            }}
          />
          <TextField
            select
            size="small"
            value={role}
            onChange={(e) => setRole(e.target.value as StreamTeamRole)}
            sx={{
              flex: '0 1 160px',
              minWidth: 140,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.04)',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
              },
              '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.6)' },
            }}
          >
            {availableRoles.map((item) => (
              <MenuItem key={item} value={item}>
                {ROLE_LABELS[item]}
              </MenuItem>
            ))}
          </TextField>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !nickname.trim()}
            startIcon={<PersonAddOutlinedIcon />}
            sx={{
              textTransform: 'none',
              bgcolor: '#6d5dfb',
              '&:hover': { bgcolor: '#8e7bff' },
            }}
          >
            Добавить
          </Button>
        </Box>
      )}

      {actionError && <Typography sx={{ color: '#ff8a8a', fontSize: 13, mb: 2 }}>{actionError}</Typography>}

      {members.length === 0 ? (
        <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
          Команда пока пуста. Добавьте модератора или ассистента.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {members.map((member) => {
            const palette = ROLE_COLORS[member.role];
            const canRemove = member.role === 'Moderator' ? access.canAssignModerators : access.canAssignAssistants;

            return (
              <Box
                key={member.userId}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Avatar
                  src={member.profileImage ? `${process.env.REACT_APP_API_LOCAL}${member.profileImage}` : undefined}
                  sx={{ width: 36, height: 36 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{member.nickname}</Typography>
                  <Chip
                    label={ROLE_LABELS[member.role]}
                    size="small"
                    sx={{
                      mt: 0.5,
                      height: 22,
                      fontSize: 11,
                      fontWeight: 700,
                      color: palette.color,
                      bgcolor: palette.bg,
                      border: `1px solid ${palette.border}`,
                    }}
                  />
                </Box>
                {canRemove && (
                  <IconButton
                    size="small"
                    onClick={() => removeMember(member.userId)}
                    aria-label={`Удалить ${member.nickname}`}
                    sx={{ color: 'rgba(255,255,255,0.45)', '&:hover': { color: '#ff8a8a' } }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
