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
  focusedPostId?: string; // Optional focused post ID for permalinks (for external usage)
}

/**
 * CustomLayout component - Alternative layout with AppBar and tabs
 * Provides a custom layout structure with teams tabs and channel sidebar
 * EXACT Mattermost pattern for library usage (no internal navigation)
 */
export const CustomLayout: React.FC<CustomLayoutProps> = ({
  children,
  sx,
  focusedPostId,
}) => {
  console.debug("🔄 CustomLayout re-render");
  console.debug("🔍 CustomLayout props:", {
    hasChildren: !!children,
    sx: !!sx,
    focusedPostId,
    sxStringified: JSON.stringify(sx)
  });
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  console.debug("🔍 CustomLayout isMobile:", isMobile);
  
  const currentChannel = useAppSelector(selectCurrentChannel);
  console.debug("🔍 CustomLayout currentChannel:", {
    hasChannel: !!currentChannel,
    channelId: currentChannel?.id,
    channelName: currentChannel?.name
  });

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
                  onChannelInfo={() => console.log('Channel info clicked')}
                  onAddMembers={() => console.log('Add members clicked')}
                  onChannelSettings={() => console.log('Channel settings clicked')}
                  onToggleFavorite={() => console.log('Toggle favorite clicked')}
                  onToggleMute={() => console.log('Toggle mute clicked')}
                />

                {/* Post List - EXACT Mattermost PostView usage */}
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