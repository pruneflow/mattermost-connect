import React from 'react';
import { 
  AppBar as MuiAppBar, 
  Toolbar, 
  IconButton, 
  Typography,
  Box
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';

import { Team, Channel, User } from '../../api/types';
import { TeamList } from '../teams';
import { UserMenu } from '../auth/UserMenu';
import { useChannelUtils } from '../../hooks/useChannelUtils';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../hooks/useUsers';

export interface AppBarProps {
  /**
   * Currently selected team
   */
  selectedTeam?: Team | null;
  
  /**
   * Currently selected channel
   */
  selectedChannel?: Channel | null;
  
  /**
   * Current user
   */
  user?: User | null;
  
  /**
   * Whether to show the team selector tabs
   */
  showTeamSelector?: boolean;
  
  /**
   * Whether we're in mobile mode (affects menu button)
   */
  isMobile?: boolean;
  
  /**
   * Whether the sidebar is open (for mobile toggle icon)
   */
  sidebarOpen?: boolean;
  
  /**
   * Called when sidebar toggle is clicked
   */
  onToggleSidebar?: () => void;
  
  /**
   * Called when a team is selected
   */
  onSelectTeam?: (team: Team) => void;
  
  /**
   * Called when logout is requested
   */
  onLogout?: () => void;
  
  /**
   * Additional content for the app bar
   */
  children?: React.ReactNode;
}

/**
 * Application top bar component with team selector and user menu
 */
export function AppBar({ 
  selectedTeam,
  selectedChannel,
  user,
  showTeamSelector = true,
  isMobile = false,
  sidebarOpen = false,
  onToggleSidebar,
  onSelectTeam,
  onLogout,
  children
}: AppBarProps) {
  // Get channel utils for display name formatting
  const { getDirectChannelDisplayName } = useChannelUtils();
  const { user: currentUser } = useAuth();
  
  // For direct channels, extract the other user's ID
  const getOtherUserId = (directChannel: Channel): string | undefined => {
    if (directChannel.type !== 'D' || !currentUser?.id) return undefined;
    
    // Direct channel names are in format "user1id__user2id"
    const userIds = directChannel.name.split('__');
    if (userIds.length !== 2) return undefined;
    
    // Return the ID that's not the current user
    return userIds[0] === currentUser.id ? userIds[1] : userIds[0];
  };
  
  const otherUserId = selectedChannel?.type === 'D' ? getOtherUserId(selectedChannel) : undefined;
  const { user: otherUser } = useUser(otherUserId || '');
  
  // Determine display title
  const getTitle = () => {
    if (selectedChannel) {
      // For direct or group channels, use special formatting
      if (selectedChannel.type === 'D') {
        // For direct channels, use the other user's formatted name
        return selectedChannel.display_name || getDirectChannelDisplayName(otherUser) || selectedChannel.name;
      }
      if (selectedChannel.type === 'G') {
        // For group channels, use display_name or fallback
        return selectedChannel.display_name || selectedChannel.name;
      }
      return selectedChannel.display_name || selectedChannel.name;
    }
    
    if (selectedTeam) {
      return selectedTeam.display_name || selectedTeam.name;
    }
    
    return 'Mattermost Connect';
  };
  
  return (
    <MuiAppBar position="static">
      <Toolbar>
        {isMobile && (
          <IconButton
            color="inherit"
            edge="start"
            onClick={onToggleSidebar}
            sx={{ mr: 2 }}
          >
            {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        )}
        
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {getTitle()}
        </Typography>
        
        {children}
        
        {/* User menu with avatar */}
        {user && (
          <UserMenu 
            user={user}
            size="medium"
            showStatus={true}
            showMenu={true}
            showProfile={true}
            onLogout={onLogout}
          />
        )}
      </Toolbar>
      
      {/* Team tabs below the toolbar - optional */}
      {showTeamSelector && (
        <TeamList
          layout="tabs"
          selectedTeamId={selectedTeam?.id}
          onSelectTeam={onSelectTeam}
        />
      )}
    </MuiAppBar>
  );
}

export default AppBar;