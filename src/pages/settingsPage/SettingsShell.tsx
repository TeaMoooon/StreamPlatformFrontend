import { FC, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { ContainerBox } from '../../components/StylesComponents';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';
import { useAppSelector } from '../../hooks/redux';
import { getSettingsNavItems, SettingsSection } from './settings.constants';
import { SettingsProfileSection } from './sections/SettingsProfileSection';
import { SettingsSecuritySection } from './sections/SettingsSecuritySection';
import { SettingsSupportSection } from './sections/SettingsSupportSection';
import { SettingsNoticeProvider } from './context/SettingsNoticeContext';
import {
  StyledSettingsContainer,
  StyledSettingsContent,
  StyledSettingsHero,
  StyledSettingsNavDescription,
  StyledSettingsNavItem,
  StyledSettingsNavList,
  StyledSettingsNavTitle,
  StyledSettingsPanel,
  StyledSettingsSidebar,
} from './StyledSettingsPage';

const SECTION_COMPONENTS: Record<SettingsSection, FC> = {
  profile: SettingsProfileSection,
  security: SettingsSecuritySection,
  support: SettingsSupportSection,
};

type SettingsShellProps = {
  activeSection: SettingsSection;
};

export const SettingsShell = ({ activeSection }: SettingsShellProps) => {
  const navigate = useNavigate();
  const { isMobile } = useDeviceDetect();
  const { data: profile } = useAppSelector((state) => state.user);
  const navItems = useMemo(() => getSettingsNavItems(), []);
  const ActiveSection = SECTION_COMPONENTS[activeSection];

  return (
    <ContainerBox>
      <StyledSettingsContainer sx={{ flexDirection: isMobile ? 'column' : 'row' }}>
        <StyledSettingsSidebar sx={{ maxWidth: isMobile ? '100%' : 320, pr: isMobile ? 0 : 3, mb: isMobile ? 2 : 0 }}>
          <StyledSettingsHero>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsOutlinedIcon sx={{ color: '#8e7bff', fontSize: 22 }} />
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Настройки аккаунта</Typography>
            </Box>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
              Настройки эфира — в панели стрима.
            </Typography>
            {profile?.nickname && (
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', mt: 0.5 }}>
                Аккаунт: {profile.nickname}
              </Typography>
            )}
          </StyledSettingsHero>

          <StyledSettingsNavList>
            {navItems.map((item) => (
              <StyledSettingsNavItem
                key={item.value}
                active={activeSection === item.value}
                onClick={() => navigate(item.path)}
              >
                <StyledSettingsNavTitle>{item.title}</StyledSettingsNavTitle>
                <StyledSettingsNavDescription>{item.description}</StyledSettingsNavDescription>
              </StyledSettingsNavItem>
            ))}
          </StyledSettingsNavList>
        </StyledSettingsSidebar>

        <StyledSettingsContent>
          <StyledSettingsPanel>
            <SettingsNoticeProvider>
              <ActiveSection />
            </SettingsNoticeProvider>
          </StyledSettingsPanel>
        </StyledSettingsContent>
      </StyledSettingsContainer>
    </ContainerBox>
  );
};
