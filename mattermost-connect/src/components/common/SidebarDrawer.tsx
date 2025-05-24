import React from 'react';
import { 
  Box, 
  Drawer, 
  Divider,
  Typography
} from '@mui/material';

import { Team, Channel } from '../../api/types';
import { TeamList } from '../teams';
import { ChannelList } from '../channels';

// Default sidebar width
const DEFAULT_SIDEBAR_WIDTH = 280;

export interface SidebarDrawerProps {
  /**
   * Whether the drawer is open
   */
  open: boolean;
  
  /**
   * Called when the drawer should close
   */
  onClose: () => void;
  
  /**
   * Current team ID for channel list
   */
  teamId?: string;
  
  /**
   * Currently selected channel ID
   */
  selectedChannelId?: string;
  
  /**
   * Width of the drawer
   */
  width?: number;
  
  /**
   * Called when a team is selected
   */
  onSelectTeam?: (team: Team) => void;
  
  /**
   * Called when a channel is selected
   */
  onSelectChannel?: (channel: Channel) => void;
  
  /**
   * Custom title for the drawer
   */
  title?: string;
  
  /**
   * Whether to show the team list
   */
  showTeams?: boolean;
  
  /**
   * Additional content to render in the drawer
   */
  children?: React.ReactNode;
}

/**
 * Mobile drawer component with teams and channels for navigation
 */
export function SidebarDrawer({
  open,
  onClose,
  teamId,
  selectedChannelId,
  width = DEFAULT_SIDEBAR_WIDTH,
  onSelectTeam,
  onSelectChannel,
  title = 'Teams & Channels',
  showTeams = true,
  children
}: SidebarDrawerProps) {
  // Handle channel selection - also closes the drawer
  const handleChannelSelect = (channel: Channel) => {
    if (onSelectChannel) {
      onSelectChannel(channel);
    }
    onClose();
  };
  
  // Handle team selection
  const handleTeamSelect = (team: Team) => {
    if (onSelectTeam) {
      onSelectTeam(team);
    }
  };
  
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
        },
      }}
    >
      {/* Drawer header with title */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" component="div" fontWeight="bold">
          {title}
        </Typography>
      </Box>
      
      {/* Optional custom content */}
      {children}
      
      {/* Team list - optional */}
      {showTeams && (
        <>
          <TeamList
            layout="vertical"
            onSelectTeam={handleTeamSelect}
          />
          <Divider />
        </>
      )}
      
      {/* Channel list for the active team */}
      <Box sx={{ overflow: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {teamId ? (
          <ChannelList
            teamId={teamId}
            selectedChannelId={selectedChannelId}
            onSelectChannel={handleChannelSelect}
          />
        ) : (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Select a team to view channels
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

export default SidebarDrawer;