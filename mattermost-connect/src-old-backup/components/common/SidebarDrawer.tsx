import React from "react";
import { Box, Drawer, Divider, Typography } from "@mui/material";

import { Team, Channel } from "../../api/types";
import { TeamList } from "../teams";
import { Channels } from "../channels";
import { useLayout } from "../../hooks";

// Default sidebar width
const DEFAULT_SIDEBAR_WIDTH = 280;

export interface SidebarDrawerProps {
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
  width = DEFAULT_SIDEBAR_WIDTH,
  onSelectTeam,
  onSelectChannel,
  title = "Teams & Channels",
  showTeams = true,
  children,
}: SidebarDrawerProps) {
  const { sidebarOpen, closeSidebar } = useLayout();
  // Handle channel selection - also closes the drawer
  const handleChannelSelect = (channel: Channel) => {
    if (onSelectChannel) {
      onSelectChannel(channel);
    }
    closeSidebar();
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
      open={sidebarOpen}
      onClose={closeSidebar}
      sx={{
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
        },
      }}
    >
      {/* Drawer header with title */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle1" component="div" fontWeight="bold">
          {title}
        </Typography>
      </Box>

      {/* Optional custom content */}
      {children}

      {/* Team list - optional */}
      {showTeams && (
        <>
          <TeamList layout="vertical" onSelectTeam={handleTeamSelect} />
          <Divider />
        </>
      )}

      {/* Channel list for the active team */}
      <Box
        sx={{
          overflow: "auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Channels onSelectChannel={handleChannelSelect} />
      </Box>
    </Drawer>
  );
}

export default SidebarDrawer;
