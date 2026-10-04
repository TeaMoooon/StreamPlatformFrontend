import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { StaffAuditEntry, auditActionLabel, fetchStaffAudit } from '../../../api/staffApi';
import { StyledDashboardSectionTitle } from '../../dashboardPage/StyledDashboardPage';

const panelSx = {
  p: 2,
  borderRadius: 2,
  bgcolor: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
};

export const StaffAuditSection = () => {
  const [entries, setEntries] = useState<StaffAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await fetchStaffAudit(100);
    setIsLoading(false);
    if (!result.success) {
      setError(result.message || 'Не удалось загрузить журнал');
      setEntries([]);
      return;
    }
    setEntries(result.entries);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} sx={{ color: '#8e7bff' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <StyledDashboardSectionTitle>История действий</StyledDashboardSectionTitle>
      </Box>

      {error && <Typography sx={{ color: '#ff8a8a', fontSize: 14 }}>{error}</Typography>}

      {entries.length === 0 ? (
        <Box sx={panelSx}>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Пока пусто</Typography>
        </Box>
      ) : (
        entries.map((entry) => (
          <Box key={entry.id} sx={{ ...panelSx, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
              {auditActionLabel(entry.action)}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
              {entry.actorNickname || entry.actorUserId}
              {entry.targetNickname || entry.targetUserId ? ` → ${entry.targetNickname || entry.targetUserId}` : ''}
              {entry.entityType ? ` · ${entry.entityType}${entry.entityId ? ` #${entry.entityId}` : ''}` : ''}
            </Typography>
            {entry.details && (
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{entry.details}</Typography>
            )}
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              {new Date(entry.createdAt).toLocaleString()}
            </Typography>
          </Box>
        ))
      )}
    </Box>
  );
};
