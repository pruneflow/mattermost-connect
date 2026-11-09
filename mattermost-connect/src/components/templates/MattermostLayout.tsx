/**
 * Mattermost-style layout component with sidebar and responsive design
 * Provides authentic Mattermost layout structure with teams and channels sidebar
 */
import React, { useState, useMemo } from "react";
import {
  Box,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  SxProps,
  Theme,
} from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
import { Sidebar } from "../organisms/Sidebar";
import { ChannelHeader } from "../molecules/ChannelHeader";
import { useAppSelector } from "../../hooks/useAppSelector";
import { selectCurrentChannel } from "../../store/selectors";
import { ChatContainer } from "../organisms/PostView";
import { AppBar } from "../organisms/AppBar";
import UserMenu from "../organisms/UserMenu";
import { getAuthenticatedUser } from "../../services/authService";

// Static styles extracted for performance
const STATIC_STYLES = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
  } as const,

  desktopContainer: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  } as const,

  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minWidth: 0,
  } as const,

  mobileAppBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    px: 2,
    py: 1,
    minHeight: 64,
    borderBottom: 1,
    borderColor: "divider",
    backgroundColor: "primary.main",
    color: "white",
  } as const,

  mobileMenuButton: {
    mr: 2,
    color: "inherit",
  } as const,

  mobileTitle: {
    flex: 1,
  } as const,

  channelHeader: {
    flexShrink: 0,
  } as const,

  contentArea: {
    flex: 1,
    overflow: "auto",
    backgroundColor: "background.default",
    display: "flex",
    flexDirection: "column",
  } as const,

  welcomeMessage: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "text.secondary",
    typography: "h6",
  } as const,
};

export interface MattermostLayoutProps {
  children?: React.ReactNode;
  showChannelHeader?: boolean;
  sidebarWidth?: number;
  sx?: SxProps<Theme>;
}

export const MattermostLayout: React.FC<MattermostLayoutProps> = ({
  children,
  showChannelHeader = true,
  sidebarWidth = 300,
  sx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const currentUser = getAuthenticatedUser();

  const currentChannel = useAppSelector(selectCurrentChannel);

  // Memoized container styles with custom sx
  const containerStyles = useMemo(
    () => ({
      ...STATIC_STYLES.container,
      ...sx,
    }),
    [sx],
  );

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleDrawerClose = () => {
    setMobileDrawerOpen(false);
  };

  return (
    <Box sx={containerStyles}>
      {/* AppBar for desktop only */}
      {!isMobile && (
        <Box sx={{ bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
          <AppBar />
        </Box>
      )}

      {/* Main layout with sidebar and content */}
      <Box sx={STATIC_STYLES.desktopContainer}>
        {/* Sidebar */}
        <Sidebar
          open={isMobile ? mobileDrawerOpen : true}
          onClose={handleDrawerClose}
          variant={isMobile ? "temporary" : "permanent"}
          width={sidebarWidth}
          compact={false}
          showMenu={!isMobile}
        />

        {/* Main Content Area */}
        <Box sx={STATIC_STYLES.mainContent}>
        {/* Mobile App Bar */}
        {isMobile && (
          <Box sx={STATIC_STYLES.mobileAppBar}>
            <IconButton
              onClick={handleDrawerToggle}
              edge="start"
              aria-label="toggle sidebar"
              sx={STATIC_STYLES.mobileMenuButton}
            >
              <MenuIcon />
            </IconButton>

            <Typography variant="h6" sx={STATIC_STYLES.mobileTitle}>
              {currentChannel?.computedDisplayName || currentChannel?.display_name || currentChannel?.name || "MattermostConnect"}
            </Typography>

            {currentUser && (
              <UserMenu
                user={currentUser}
                size="medium"
              />
            )}
          </Box>
        )}

        {/* Channel Header */}
        {showChannelHeader && currentChannel && (
          <>
            {/* Channel Header */}
            <ChannelHeader
              channel={currentChannel}
              menuOptions={{
                showManageRead: true,
                showToggleFavorite: false,
                showMute: false,
                showMoveTo: true,
                showAddMembers: true,
                showLeave: true,
              }}
            />

            {/* Chat container with message list */}
            <ChatContainer autoLoad={true} />
          </>
        )}

        {/* Main Content */}
        <Box sx={STATIC_STYLES.contentArea}>
          {children || (
            <Box sx={STATIC_STYLES.welcomeMessage}>
              {currentChannel
                ? `Welcome to ${currentChannel.display_name}`
                : "Select a channel to start messaging"}
            </Box>
          )}
        </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default MattermostLayout;
