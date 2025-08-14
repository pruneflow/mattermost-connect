/**
 * Custom layout component with app bar and team tabs
 * Alternative to Mattermost layout with horizontal team navigation and responsive design
 */
import React from 'react';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  SxProps,
  Theme,
} from '@mui/material';
import { AppBar } from '../organisms/AppBar';
import { TeamList } from '../organisms/TeamList';
import { ChannelList } from '../organisms/ChannelList';
import { ChannelHeader } from '../molecules/ChannelHeader';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectCurrentChannel } from '../../store/selectors';
import {ChatContainer} from '../organisms/PostView';

export interface CustomLayoutProps {
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
  focusedPostId?: string;
}

export const CustomLayout: React.FC<CustomLayoutProps> = ({
  children,
  sx,
  focusedPostId,
}) => {
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const currentChannel = useAppSelector(selectCurrentChannel);

  return (
    <Box sx={{ display: "flex", flex: 1, flexDirection: "column", overflow: "hidden", ...sx }}>
      {/* AppBar with mobile drawer built-in */}
      <AppBar />

      {/* Teams Tabs - Hidden on mobile */}
      {!isMobile && (
        <Box sx={{ bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
          <TeamList layout="tabs" />
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Channels Sidebar - Hidden on mobile */}
        {!isMobile && <ChannelList showSearch={true} compact={false} />}

        {/* Main Content Area */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {children || (
            currentChannel ? (
              <>
                {/* Channel Header */}
                <ChannelHeader
                  channel={currentChannel}
                  menuOptions={{
                    showMarkUnread: true,
                    showToggleFavorite: false,
                    showMute: false,
                    showMoveTo: true,
                    showAddMembers: true,
                    showLeave: true
                  }}
                />

                {/* Chat container with message list */}
                <ChatContainer autoLoad={true}  />
              </>
            ) : (
              <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default" }}>
                <Typography variant="h6" sx={{ color: "text.secondary" }}>
                  Select a channel to start messaging
                </Typography>
              </Box>
            )
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default CustomLayout;