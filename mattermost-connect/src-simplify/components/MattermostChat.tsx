import React, { useState, useCallback, useEffect } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  Drawer, 
  Divider,
  Button,
  useMediaQuery,
  useTheme,
  Paper
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useTeams } from '../hooks/useTeams';
import { useChannels } from '../hooks/useChannels';
import { useUser } from '../hooks/useUsers';
import { useQueryClient } from '@tanstack/react-query';

// Import components
import TeamList from './TeamList';
import ChannelList from './ChannelList';
import MessageContainer from './MessageContainer';
import { Team, Channel, UserStatus } from '../api/types';
import UserAvatar from './UserAvatar';

// Sidebar width
const SIDEBAR_WIDTH = 280;

export interface MattermostChatProps {
  initialTeamId?: string;
  initialChannelId?: string;
}

export function MattermostChat({ 
  initialTeamId,
  initialChannelId
}: MattermostChatProps) {
  // Theme and responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Query client for cache management
  const queryClient = useQueryClient();
  
  // Auth context
  const { user, logout } = useAuth();
  
  // Get current user's status using the useUser hook
  const { status, updateStatus, isUpdatingStatus } = useUser(user?.id);
  
  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [profileOpen, setProfileOpen] = useState(false);
  
  // Selection state
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [threadMessageId, setThreadMessageId] = useState<string | undefined>(undefined);
  
  // Get teams to auto-select first team
  const { teams = [], isLoading: isLoadingTeams } = useTeams();
  
  // Handle team selection
  const handleTeamSelect = useCallback((team: Team) => {
    setSelectedTeam(team);
    setSelectedChannel(null);
  }, []);
  
  // Handle channel selection
  const handleChannelSelect = useCallback((channel: Channel) => {
    setSelectedChannel(channel);
    // Clear any active thread when changing channels
    setThreadMessageId(undefined);
    
    // On mobile, close the sidebar after selecting a channel
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);
  
  // Auto-select first team when teams load
  useEffect(() => {
    // If initialTeamId is provided, use it instead of auto-selecting
    if (initialTeamId && teams.length > 0) {
      const team = teams.find(t => t.id === initialTeamId);
      if (team) {
        setSelectedTeam(team);
      }
    } 
    // Otherwise, auto-select the first team if none is selected
    else if (!selectedTeam && teams.length > 0 && !isLoadingTeams) {
      setSelectedTeam(teams[0]);
    }
  }, [teams, initialTeamId, selectedTeam, isLoadingTeams]);
  
  // Get channels for selected team to auto-select first channel
  // Always call the hook, but with undefined if no team is selected
  const { channels = [], isLoading: isLoadingChannels } = useChannels(selectedTeam?.id);
    
  // Auto-select first channel when channels load
  useEffect(() => {
    // Only proceed if we have a selected team and channels are loaded
    if (!selectedTeam || isLoadingChannels) {
      return;
    }
    
    // If there are no channels, don't try to select anything
    if (channels.length === 0) {
      return;
    }
    
    // If initialChannelId is provided and we're in the right team, use it
    if (initialChannelId) {
      const channel = channels.find(c => c.id === initialChannelId);
      if (channel) {
        setSelectedChannel(channel);
        return;
      }
    } 
    
    // Otherwise, auto-select the first channel if none is selected
    if (!selectedChannel) {
      // Sort channels to prioritize public channels first
      const sortedChannels = [...channels].sort((a, b) => {
        // Public channels first, then private, then direct
        if (a.type === 'O' && b.type !== 'O') return -1;
        if (a.type !== 'O' && b.type === 'O') return 1;
        if (a.type === 'P' && b.type === 'D') return -1;
        if (a.type === 'D' && b.type === 'P') return 1;
        // Alphabetical by display name or name
        return (a.display_name || a.name).localeCompare(b.display_name || b.name);
      });
      
      if (sortedChannels.length > 0) {
        setSelectedChannel(sortedChannels[0]);
      }
    }
  }, [channels, initialChannelId, selectedTeam, selectedChannel, isLoadingChannels]);
  
  // Handle opening thread
  const handleOpenThread = useCallback((messageId: string) => {
    setThreadMessageId(messageId);
  }, []);
  
  // Handle closing thread
  const handleCloseThread = useCallback(() => {
    setThreadMessageId(undefined);
  }, []);
  
  // Toggle sidebar for mobile view
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Handle profile
  const openProfile = () => {
    setProfileOpen(true);
  };
  
  const closeProfile = () => {
    setProfileOpen(false);
    
    // Refresh user data after profile is closed
    if (user?.id) {
      // Trigger a refresh of the current user data
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      // Trigger a refresh of the user status
      queryClient.invalidateQueries({ queryKey: ['users', 'status', user.id] });
    }
  };
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top App Bar */}
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={toggleSidebar}
              sx={{ mr: 2 }}
            >
              {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>
          )}
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {selectedChannel 
              ? selectedChannel.display_name || selectedChannel.name 
              : selectedTeam 
                ? selectedTeam.display_name || selectedTeam.name 
                : 'Mattermost Chat'}
          </Typography>
          
          {/* User avatar with menu and profile capabilities */}
          <UserAvatar 
            user={user}
            status={status}
            size="medium"
            showStatus={true}
            showMenu={true}
            showProfile={true}
            onStatusChange={updateStatus}
            isUpdatingStatus={isUpdatingStatus}
            onLogout={logout}
          />
        </Toolbar>
        
        {/* Team tabs below the toolbar */}
        <TeamList
          layout="tabs"
          selectedTeamId={selectedTeam?.id}
          onSelectTeam={handleTeamSelect}
        />
      </AppBar>
      
      {/* Main content area with channels and messages */}
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1,
        height: 'calc(100% - 112px)', // Height minus AppBar height
        overflow: 'hidden'
      }}>
        {/* Mobile Drawer (only used on mobile) */}
        {isMobile && (
          <Drawer
            variant="temporary"
            open={sidebarOpen}
            onClose={toggleSidebar}
            sx={{
              width: SIDEBAR_WIDTH,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: SIDEBAR_WIDTH,
                boxSizing: 'border-box',
              },
            }}
          >
            <Box sx={{ overflow: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Team list for mobile */}
              <Box sx={{ p: 2 }}>
                <Typography variant="h6">Teams</Typography>
                <TeamList
                  selectedTeamId={selectedTeam?.id}
                  onSelectTeam={handleTeamSelect}
                />
              </Box>
              <Divider />
              
              {/* Channel list for mobile */}
              {selectedTeam ? (
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <ChannelList
                    teamId={selectedTeam.id}
                    selectedChannelId={selectedChannel?.id}
                    onSelectChannel={handleChannelSelect}
                  />
                </Box>
              ) : (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    Select a team to view channels
                  </Typography>
                </Box>
              )}
            </Box>
          </Drawer>
        )}
        
        {/* Desktop Layout: Channels sidebar (always visible on desktop) */}
        {!isMobile && (
          <Box 
            sx={{ 
              width: SIDEBAR_WIDTH, 
              flexShrink: 0,
              borderRight: '1px solid',
              borderColor: 'divider',
              height: '100%',
              overflow: 'auto'
            }}
          >
            {selectedTeam ? (
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flexGrow: 1, overflow: 'auto', marginTop: '4px' }}>
                  <ChannelList
                    teamId={selectedTeam.id}
                    selectedChannelId={selectedChannel?.id}
                    onSelectChannel={handleChannelSelect}
                  />
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  Select a team to view channels
                </Typography>
              </Box>
            )}
          </Box>
        )}
        
        {/* Main content area */}
        <Box
          sx={{
            flexGrow: 1,
            p: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {!selectedTeam ? (
            // No team selected
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                p: 3,
              }}
            >
              <PeopleIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
              <Typography variant="h5" color="text.primary" gutterBottom>
                Welcome to Mattermost Chat
              </Typography>
              <Typography variant="body1" color="text.secondary" align="center" sx={{ maxWidth: 500, mb: 3 }}>
                Select a team from the tabs above to start chatting with your teammates.
              </Typography>
            </Box>
          ) : !selectedChannel ? (
            // Team selected but no channel
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                p: 3,
              }}
            >
              <Typography variant="h5" color="text.primary" gutterBottom>
                {selectedTeam.display_name || selectedTeam.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" align="center" sx={{ maxWidth: 500, mb: 3 }}>
                Select a channel from the sidebar to start chatting.
              </Typography>
              {isMobile && (
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={() => setSidebarOpen(true)}
                  sx={{ mt: 2 }}
                >
                  Select a Channel
                </Button>
              )}
            </Box>
          ) : (
            // Channel view with unified MessageContainer
            <Box sx={{ 
              flexGrow: 1, 
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}>
              <MessageContainer
                channelId={selectedChannel.id}
                currentUserId={user?.id}
                showInput={true}
                showThread={true}
                threadMessageId={threadMessageId}
                onThreadClose={handleCloseThread}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default MattermostChat;