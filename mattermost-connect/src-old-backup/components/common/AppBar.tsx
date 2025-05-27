import React from "react";
import {
  AppBar as MuiAppBar,
  Toolbar,
  IconButton,
  Typography,
} from "@mui/material";
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
} from "@mui/icons-material";

import { Team, Channel, User } from "../../api/types";
import { TeamList } from "../teams";
import { UserMenu } from "../auth/UserMenu";
import { useAuth } from "../../context/AuthContext";
import { useUser } from "../../hooks";
import { useChannels, useLayout, useTeams } from "../../hooks";
import { getDirectChannelDisplayName } from "../../utils/channelUtils";

export interface AppBarProps {
  /**
   * Currently selected team
   */
  activeTeam?: Team | null;

  /**
   * Currently selected channel
   */
  activeChannel?: Channel | null;

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
   * Additional content for the app bar
   */
  children?: React.ReactNode;
}

/**
 * Application top bar component with team selector and user menu
 */
export function AppBar({
  showTeamSelector = true,
  onSelectTeam,
  children,
}: AppBarProps) {
  const { user } = useAuth();
  const { activeTeam } = useTeams();
  const { activeChannel } = useChannels(activeTeam?.id);
  const { isMobile, sidebarOpen, toggleSidebar } = useLayout();
  const { user: currentUser } = useAuth();

  // For direct channels, extract the other user's ID
  const getOtherUserId = (directChannel: Channel): string | undefined => {
    if (directChannel.type !== "D" || !currentUser?.id) return undefined;

    // Direct channel names are in format "user1id__user2id"
    const userIds = directChannel.name.split("__");
    if (userIds.length !== 2) return undefined;

    // Return the ID that's not the current user
    return userIds[0] === currentUser.id ? userIds[1] : userIds[0];
  };

  const otherUserId =
    activeChannel?.type === "D" ? getOtherUserId(activeChannel) : undefined;
  const { user: otherUser } = useUser(otherUserId || "");

  // Determine display title
  const getTitle = () => {
    if (activeChannel) {
      // For direct or group channels, use special formatting
      if (activeChannel.type === "D") {
        // For direct channels, use the other user's formatted name
        return (
          activeChannel.display_name ||
          getDirectChannelDisplayName(otherUser) ||
          activeChannel.name
        );
      }
      if (activeChannel.type === "G") {
        // For group channels, use display_name or fallback
        return activeChannel.display_name || activeChannel.name;
      }
      return activeChannel.display_name || activeChannel.name;
    }

    if (activeTeam) {
      return activeTeam.display_name || activeTeam.name;
    }

    return "Mattermost Connect";
  };

  return (
    <MuiAppBar position="static">
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
          {getTitle()}
        </Typography>

        {children}

        {/* User menu with avatar */}
        {user && (
          <UserMenu
            size="medium"
            showStatus={true}
            showMenu={true}
            showProfile={true}
          />
        )}
      </Toolbar>

      {/* Team tabs below the toolbar - optional */}
      {showTeamSelector && (
        <TeamList layout="tabs" onSelectTeam={onSelectTeam} />
      )}
    </MuiAppBar>
  );
}

export default AppBar;
