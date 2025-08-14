/**
 * Sidebar component combining team and channel lists in Mattermost layout
 * Provides responsive drawer variants with team icons and channel navigation
 */
import React from 'react';
import {
  Box,
  Drawer,
  Divider,
  SxProps,
  Theme,
} from '@mui/material';
import { TeamList } from './TeamList';
import { ChannelList } from './ChannelList';

export interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  variant?: 'temporary' | 'persistent' | 'permanent';
  width?: number;
  compact?: boolean;
  sx?: SxProps<Theme>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  open = true,
  onClose,
  variant = 'permanent',
  width = 320,
  compact = false,
  sx,
}) => {
  const sidebarContent = (
    <Box
      sx={{
        width: width,
        height: '100%',
        display: 'flex',
        flexDirection: 'row', // Side by side: teams | channels
        backgroundColor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      {/* Teams Sidebar - Left side with icons */}
      <Box
        sx={{
          width: 72,
          height: '100%',
          backgroundColor: 'grey.100', // Light grey instead of dark
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <TeamList
          layout="vertical"
          showCreateButton={true}
          compact={true}
          showMenu={false}
        />
      </Box>

      {/* Channel List - Right side */}
      <Box
        sx={{
          flex: 1,
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.paper', // Same as teams for fluid design
        }}
      >
        <ChannelList
          showSearch={!compact}
          compact={compact}
          showTeamHeader={true}
          onChannelSelect={onClose}
        />
      </Box>
    </Box>
  );

  if (variant === 'temporary') {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        variant="temporary"
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: width,
            boxSizing: 'border-box',
          },
          ...sx,
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  if (variant === 'persistent') {
    return (
      <Drawer
        open={open}
        variant="persistent"
        sx={{
          width: open ? width : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: width,
            boxSizing: 'border-box',
          },
          ...sx,
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  // Permanent variant
  return (
    <Box
      sx={{
        width: width,
        flexShrink: 0,
        ...sx,
      }}
    >
      {sidebarContent}
    </Box>
  );
};

export default Sidebar;