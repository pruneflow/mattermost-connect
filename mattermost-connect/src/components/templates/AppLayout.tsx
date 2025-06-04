import React, { useState } from 'react';
import {
  Box,
  IconButton,
  useTheme,
  useMediaQuery,
  SxProps,
  Theme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Sidebar } from '../organisms/Sidebar';
import { ChannelHeader } from '../molecules/ChannelHeader';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectCurrentChannel } from '../../store/selectors';

export interface AppLayoutProps {
  children?: React.ReactNode;
  showChannelHeader?: boolean;
  sidebarWidth?: number;
  sx?: SxProps<Theme>;
}

/**
 * AppLayout component following Mattermost application layout
 * Provides main layout structure with responsive sidebar
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  showChannelHeader = true,
  sidebarWidth = 280,
  sx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const currentChannel = useAppSelector(selectCurrentChannel);

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleDrawerClose = () => {
    setMobileDrawerOpen(false);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        ...sx,
      }}
    >
      {/* Sidebar */}
      <Sidebar
        open={isMobile ? mobileDrawerOpen : true}
        onClose={handleDrawerClose}
        variant={isMobile ? 'temporary' : 'permanent'}
        width={sidebarWidth}
        compact={false}
      />

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0, // Allow content to shrink
        }}
      >
        {/* Mobile Menu Button */}
        {isMobile && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 1,
              borderBottom: 1,
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            }}
          >
            <IconButton
              onClick={handleDrawerToggle}
              edge="start"
              aria-label="toggle sidebar"
              sx={{ mr: 1 }}
            >
              {mobileDrawerOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          </Box>
        )}

        {/* Channel Header */}
        {showChannelHeader && currentChannel && (
          <ChannelHeader
            channel={currentChannel}
            sx={{
              flexShrink: 0,
            }}
          />
        )}

        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children || (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
                typography: 'h6',
              }}
            >
              {currentChannel ? (
                `Welcome to ${currentChannel.display_name}`
              ) : (
                'Select a channel to start messaging'
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;