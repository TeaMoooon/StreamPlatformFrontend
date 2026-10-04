import { FC, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Box, Chip, CircularProgress, Typography } from '@mui/material';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import { settingLayout } from '../../layout/SettingLayout';
import { ContainerBox } from '../../components/StylesComponents';
import { fetchStaffMe } from '../../api/reportsApi';
import { StaffQueueStats, fetchStaffStats } from '../../api/appealsApi';
import { StaffReportsSection } from './sections/StaffReportsSection';
import { StaffTicketsSection } from './sections/StaffTicketsSection';
import { StaffAppealsSection } from './sections/StaffAppealsSection';
import { StaffUsersSection } from './sections/StaffUsersSection';
import { StaffAuditSection } from './sections/StaffAuditSection';
import { STAFF_DEFAULT_SECTION, StaffSection, getStaffNavItems, isStaffSection } from './staff.constants';
import {
  StyledDashboardContainer,
  StyledDashboardContent,
  StyledDashboardHero,
  StyledDashboardNavDescription,
  StyledDashboardNavItem,
  StyledDashboardNavList,
  StyledDashboardNavTitle,
  StyledDashboardPanel,
  StyledDashboardSidebar,
} from '../dashboardPage/StyledDashboardPage';

type StaffPermissions = {
  canAccessStaffPanel: boolean;
  canModeratePlatform: boolean;
  canManageStaffRoles: boolean;
};

type StaffShellProps = {
  activeSection: StaffSection;
  permissions: StaffPermissions;
  role: string;
};

const StaffStatsStrip = ({ canModeratePlatform }: { canModeratePlatform: boolean }) => {
  const [stats, setStats] = useState<StaffQueueStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchStaffStats();
      if (cancelled || !result.success) return;
      setStats(result.stats);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return null;

  const items = [
    canModeratePlatform ? { label: `Жалоб ждут: ${stats.reportsNew + stats.reportsInProgress}` } : null,
    canModeratePlatform ? { label: `Просьб снять бан: ${stats.appealsOpen}` } : null,
    {
      label: `Вопросов в поддержке: ${stats.ticketsOpen + stats.ticketsInProgress + stats.ticketsWaitingUser}`,
    },
    stats.staleReports + stats.staleTickets > 0
      ? { label: `Давно без ответа: ${stats.staleReports + stats.staleTickets}`, warn: true }
      : null,
  ].filter(Boolean) as { label: string; warn?: boolean }[];

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.25 }}>
      {items.map((item) => (
        <Chip
          key={item.label}
          size="small"
          label={item.label}
          sx={{
            height: 22,
            fontSize: 11,
            bgcolor: item.warn ? 'rgba(255,167,38,0.18)' : 'rgba(255,255,255,0.06)',
            color: item.warn ? '#ffb74d' : 'rgba(255,255,255,0.75)',
          }}
        />
      ))}
    </Box>
  );
};

const StaffShell = ({ activeSection, permissions, role }: StaffShellProps) => {
  const navigate = useNavigate();
  const navItems = useMemo(() => getStaffNavItems(permissions.canModeratePlatform), [permissions.canModeratePlatform]);

  useEffect(() => {
    if ((activeSection === 'reports' || activeSection === 'appeals') && !permissions.canModeratePlatform) {
      navigate('/staff/tickets', { replace: true });
    }
  }, [activeSection, permissions.canModeratePlatform, navigate]);

  return (
    <ContainerBox>
      <StyledDashboardContainer>
        <StyledDashboardSidebar>
          <StyledDashboardHero>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GavelOutlinedIcon sx={{ color: '#8e7bff', fontSize: 22 }} />
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Панель модерации</Typography>
            </Box>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, mt: 0.75 }}>
              {permissions.canModeratePlatform ? (
                <>
                  <Box component="span" sx={{ color: '#cfc5ff', fontWeight: 600 }}>
                    Нужен мут или бан?
                  </Box>{' '}
                  откройте «Мут и бан» → найдите человека → выберите наказание.
                  <br />
                  Жалоба пришла с сайта — раздел «Жалобы». Вопрос про ключ/аккаунт — «Вопросы в поддержку».
                </>
              ) : (
                <>Вы в поддержке: отвечайте на вопросы пользователей. Баны выдают модераторы в разделе «Мут и бан».</>
              )}
            </Typography>
            <StaffStatsStrip canModeratePlatform={permissions.canModeratePlatform} />
          </StyledDashboardHero>

          <StyledDashboardNavList>
            {navItems.map((item) => (
              <StyledDashboardNavItem
                key={item.value}
                active={item.value === activeSection}
                onClick={() => navigate(item.path)}
              >
                <StyledDashboardNavTitle>{item.title}</StyledDashboardNavTitle>
                <StyledDashboardNavDescription>{item.description}</StyledDashboardNavDescription>
              </StyledDashboardNavItem>
            ))}
          </StyledDashboardNavList>
        </StyledDashboardSidebar>

        <StyledDashboardContent>
          <StyledDashboardPanel>
            {activeSection === 'reports' && permissions.canModeratePlatform && <StaffReportsSection />}
            {activeSection === 'appeals' && permissions.canModeratePlatform && <StaffAppealsSection />}
            {activeSection === 'tickets' && <StaffTicketsSection />}
            {activeSection === 'users' && (
              <StaffUsersSection
                canManageStaffRoles={permissions.canManageStaffRoles}
                canModeratePlatform={permissions.canModeratePlatform}
                actorRole={role}
              />
            )}
            {activeSection === 'audit' && <StaffAuditSection />}
          </StyledDashboardPanel>
        </StyledDashboardContent>
      </StyledDashboardContainer>
    </ContainerBox>
  );
};

const resolveStaffSection = (section?: string): StaffSection | null => {
  if (!section) return null;
  return isStaffSection(section) ? section : null;
};

export const StaffPage: FC = settingLayout(() => {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const activeSection = resolveStaffSection(section);
  const [access, setAccess] = useState<'loading' | 'ok' | 'denied'>('loading');
  const [role, setRole] = useState('');
  const [permissions, setPermissions] = useState<StaffPermissions>({
    canAccessStaffPanel: false,
    canModeratePlatform: false,
    canManageStaffRoles: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchStaffMe();
      if (cancelled) return;
      if (!result.success || !result.permissions.canAccessStaffPanel) {
        setAccess('denied');
        return;
      }
      setRole(result.role);
      setPermissions({
        canAccessStaffPanel: result.permissions.canAccessStaffPanel,
        canModeratePlatform: result.permissions.canModeratePlatform,
        canManageStaffRoles: result.permissions.canManageStaffRoles,
      });
      setAccess('ok');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (access !== 'ok') return;

    const defaultSection = permissions.canModeratePlatform ? STAFF_DEFAULT_SECTION : 'tickets';

    if (!section) {
      navigate(`/staff/${defaultSection}`, { replace: true });
      return;
    }
    if (!activeSection) {
      navigate(`/staff/${defaultSection}`, { replace: true });
      return;
    }
    if ((activeSection === 'reports' || activeSection === 'appeals') && !permissions.canModeratePlatform) {
      navigate('/staff/tickets', { replace: true });
    }
  }, [section, activeSection, navigate, access, permissions.canModeratePlatform]);

  if (access === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={28} sx={{ color: '#8e7bff' }} />
      </Box>
    );
  }

  if (access === 'denied') {
    return <Navigate to="/" replace />;
  }

  if (!section) {
    const defaultSection = permissions.canModeratePlatform ? STAFF_DEFAULT_SECTION : 'tickets';
    return <Navigate to={`/staff/${defaultSection}`} replace />;
  }

  if (!activeSection) return <></>;

  return <StaffShell activeSection={activeSection} permissions={permissions} role={role} />;
});
