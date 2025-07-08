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
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectCurrentChannel, selectCurrentTeam } from '../../store/selectors';

export interface CustomLayoutProps {
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * CustomLayout component - Alternative layout with AppBar and tabs
 * Provides a custom layout structure with teams tabs and channel sidebar
 */
export const CustomLayout: React.FC<CustomLayoutProps> = ({
  children,
  sx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const currentChannel = useAppSelector(selectCurrentChannel);
  const currentTeam = useAppSelector(selectCurrentTeam);

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
            <>
              {/* Header */}
              <Box sx={{ p: 2, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="h6">
                  {currentTeam?.display_name || "No Team Selected"}
                </Typography>
              </Box>

              {/* Content Area */}
              <Box sx={{ flex: 1, p: 3, overflow: "auto", bgcolor: "background.default" }}>
                {/* Current Team Info */}
                <Box sx={{ p: 2, mb: 3, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}>
                  <Typography variant="h6" sx={{ mb: 2, color: "text.primary" }}>
                    Current Team
                  </Typography>
                  {currentTeam ? (
                    <Box>
                      <Typography sx={{ mb: 1, wordBreak: "break-word" }}>
                        <strong>Name:</strong> {currentTeam.display_name}
                      </Typography>
                      <Typography sx={{ mb: 1, wordBreak: "break-word" }}>
                        <strong>Description:</strong> {currentTeam.description || "No description"}
                      </Typography>
                      <Typography sx={{ fontSize: "12px", color: "text.secondary", wordBreak: "break-all" }}>
                        ID: {currentTeam.id}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography sx={{ color: "text.secondary" }}>No team selected</Typography>
                  )}
                </Box>

                {/* Current Channel Info */}
                <Box sx={{ p: 2, mb: 3, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}>
                  <Typography variant="h6" sx={{ mb: 2, color: "text.primary" }}>
                    Current Channel
                  </Typography>
                  {currentChannel ? (
                    <Box>
                      <Typography sx={{ mb: 1, wordBreak: "break-word" }}>
                        <strong>Name:</strong> {currentChannel.display_name}
                      </Typography>
                      <Typography sx={{ mb: 1, wordBreak: "break-word" }}>
                        <strong>Type:</strong> {
                          currentChannel.type === "O" ? "Public" :
                          currentChannel.type === "P" ? "Private" :
                          currentChannel.type === "D" ? "Direct Message" : "Group Message"
                        }
                      </Typography>
                      {currentChannel.purpose && (
                        <Typography sx={{ mb: 1, wordBreak: "break-word" }}>
                          <strong>Purpose:</strong> {currentChannel.purpose}
                        </Typography>
                      )}
                      {currentChannel.header && (
                        <Typography sx={{ mb: 1, wordBreak: "break-word" }}>
                          <strong>Header:</strong> {currentChannel.header}
                        </Typography>
                      )}
                      <Typography sx={{ fontSize: "12px", color: "text.secondary", wordBreak: "break-all" }}>
                        ID: {currentChannel.id}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography sx={{ color: "text.secondary" }}>No channel selected</Typography>
                  )}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default CustomLayout;