import { FC, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import DashboardCustomizeOutlinedIcon from '@mui/icons-material/DashboardCustomizeOutlined';
import { ContainerBox } from '../../components/StylesComponents';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';
import { DashboardMode, DashboardSection, getDashboardNavItems, isDashboardSection } from './dashboard.constants';
import { DashboardStreamSection } from './sections/DashboardStreamSection';
import { DashboardTeamSection } from './sections/DashboardTeamSection';
import { DashboardChatSection } from './sections/DashboardChatSection';
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
} from './StyledDashboardPage';

const SECTION_COMPONENTS: Record<DashboardSection, FC<{ channelNickname: string; mode: DashboardMode }>> = {
  stream: DashboardStreamSection,
  team: DashboardTeamSection,
  chat: DashboardChatSection,
};

type DashboardShellProps = {
  mode: DashboardMode;
  channelNickname: string;
  activeSection: DashboardSection;
  roleLabel?: string;
  canManageStream?: boolean;
  canManageTeam?: boolean;
};

export const DashboardShell = ({
  mode,
  channelNickname,
  activeSection,
  roleLabel,
  canManageStream = true,
  canManageTeam = true,
}: DashboardShellProps) => {
  const navigate = useNavigate();
  const { isMobile } = useDeviceDetect();
  const basePath = mode === 'own' ? '/dashboard' : `/${channelNickname}/manage`;
  const navItems = useMemo(
    () =>
      getDashboardNavItems(basePath).filter((item) => {
        if (mode === 'own') return true;
        if (item.value === 'stream') return canManageStream;
        if (item.value === 'team') return canManageTeam;
        return true;
      }),
    [basePath, mode, canManageStream, canManageTeam]
  );

  const ActiveSection = SECTION_COMPONENTS[activeSection];

  return (
    <ContainerBox>
      <StyledDashboardContainer sx={{ flexDirection: isMobile ? 'column' : 'row' }}>
        <StyledDashboardSidebar
          sx={{
            maxWidth: isMobile ? '100%' : 320,
            pr: isMobile ? 0 : 3,
            mb: isMobile ? 2 : 0,
          }}
        >
          <StyledDashboardHero sx={isMobile ? { p: '16px 16px', mb: 1.5 } : undefined}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DashboardCustomizeOutlinedIcon sx={{ color: '#8e7bff', fontSize: 22 }} />
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                {mode === 'own' ? 'Панель стрима' : 'Управление каналом'}
              </Typography>
            </Box>
            {!isMobile && (
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                {mode === 'own'
                  ? 'Управление эфиром, командой и чатом.'
                  : 'Управление чужим каналом по роли в команде.'}
              </Typography>
            )}
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', mt: 0.5 }}>
              Канал: {channelNickname}
              {roleLabel ? ` · ${roleLabel}` : ''}
            </Typography>
          </StyledDashboardHero>

          <StyledDashboardNavList
            sx={
              isMobile
                ? {
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    overflowX: 'auto',
                    gap: 1,
                    WebkitOverflowScrolling: 'touch',
                    pb: 0.5,
                  }
                : undefined
            }
          >
            {navItems.map((item) => (
              <StyledDashboardNavItem
                key={item.value}
                active={activeSection === item.value}
                onClick={() => navigate(item.path)}
                sx={
                  isMobile
                    ? {
                        flex: '1 0 auto',
                        minWidth: 'max-content',
                        padding: '10px 14px',
                        gap: 0,
                      }
                    : undefined
                }
              >
                <StyledDashboardNavTitle>{item.title}</StyledDashboardNavTitle>
                {!isMobile && <StyledDashboardNavDescription>{item.description}</StyledDashboardNavDescription>}
              </StyledDashboardNavItem>
            ))}
          </StyledDashboardNavList>
        </StyledDashboardSidebar>

        <StyledDashboardContent sx={{ width: isMobile ? '100%' : undefined, minWidth: 0 }}>
          <StyledDashboardPanel sx={isMobile ? { p: '16px' } : undefined}>
            <ActiveSection channelNickname={channelNickname} mode={mode} />
          </StyledDashboardPanel>
        </StyledDashboardContent>
      </StyledDashboardContainer>
    </ContainerBox>
  );
};

export const resolveDashboardSection = (section?: string): DashboardSection | null => {
  if (!section) return null;
  return isDashboardSection(section) ? section : null;
};
