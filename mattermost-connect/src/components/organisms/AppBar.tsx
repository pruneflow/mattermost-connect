/**
 * Application top bar with mobile drawer and user context
 * Displays current channel/team name and provides navigation controls
 */
import React, { useState } from 'react';
import {
  AppBar as MuiAppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  SxProps,
  Theme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import { Sidebar } from './Sidebar';
import { UserMenu } from './UserMenu';
import { useLayout } from '../../hooks/useLayout';
import { getAuthenticatedUser } from '../../services/authService';
import { useTeams } from '../../hooks/useTeams';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectCurrentChannel } from '../../store/selectors';

export interface AppBarProps {
  /**
   * Additional content for the app bar
   */
  children?: React.ReactNode;

  /**
   * Custom styles
   */
  sx?: SxProps<Theme>;
  onLogout?: () => void;
}

/**
 * Application top bar component with mobile drawer and user menu
 * Based on old AppBar but using new architecture with hooks
 */
export const AppBar: React.FC<AppBarProps> = ({
  children,
  sx,
  onLogout
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // Use new hooks
  const { isMobile } = useLayout();
  const currentUser = getAuthenticatedUser();
  const { currentTeam } = useTeams();
  const currentChannelData = useAppSelector(selectCurrentChannel);

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleDrawerClose = () => {
    setMobileDrawerOpen(false);
  };

  // Determine display title
  const getTitle = () => {
    if (currentChannelData) {
      return currentChannelData.computedDisplayName || currentChannelData.display_name || currentChannelData.name;
    }

    if (currentTeam) {
      return currentTeam.display_name || currentTeam.name;
    }

    return 'MattermostConnect';
  };

  return (
    <>
      <MuiAppBar position="static" sx={sx}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              {mobileDrawerOpen ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>
          )}

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {getTitle()}
          </Typography>

          {children}

          {/* User menu with avatar */}
          {currentUser && (
            <UserMenu
              user={currentUser}
              size="medium"
              onLogout={onLogout}
            />
          )}
        </Toolbar>
      </MuiAppBar>

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={handleDrawerClose}
          ModalProps={{
            keepMounted: true, // Better performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 280,
            },
          }}
        >
          <Sidebar 
            width={280} 
            onClose={handleDrawerClose}
            compact={false}
          />
        </Drawer>
      )}
    </>
  );
};

export default AppBar;