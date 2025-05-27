import React from "react";
import { Box } from "@mui/material";

// Import components
import { AppBar } from "../common/AppBar";
import { SidebarDrawer } from "../common/SidebarDrawer";
import { Channels } from "../channels";
import { useLayout } from "../../hooks";
import { Messages } from "../messages";

export function MattermostChat() {
  // Layout management
  const { isMobile } = useLayout();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* App Bar with all logic handled internally */}
      <AppBar showTeamSelector={true} />

      {/* Main content area */}
      <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
        {/* Mobile: Sidebar Drawer */}
        <SidebarDrawer />

        {/* Desktop: Fixed sidebar */}
        {!isMobile && (
          <Box
            sx={{
              width: 280,
              flexShrink: 0,
              borderRight: 1,
              borderColor: "divider",
              height: "100%",
              overflow: "auto",
            }}
          >
            <Channels />
          </Box>
        )}

        {/* Main content */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Messages showInput={true} showThread={true} />
        </Box>
      </Box>
    </Box>
  );
}

export default MattermostChat;
