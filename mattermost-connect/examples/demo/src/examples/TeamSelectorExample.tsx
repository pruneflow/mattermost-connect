// examples/demo/src/examples/TeamSelectorExample.tsx
import React, { useState, useEffect } from "react";
import {
  useMattermost,
  TeamSelector,
  ChannelList,
  ChannelViewer,
  MessageComposer,
  Team,
  Channel,
  TeamSelectorVariant,
} from "mattermost-connect";

// Material-UI Components
import {
  Box,
  Paper,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Switch,
  Alert,
  Drawer,
  Snackbar,
  useMediaQuery,
  useTheme,
  IconButton,
} from "@mui/material";

// Material-UI Icons
import {
  Menu as MenuIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  ViewDay as TabsIcon,
  ViewSidebar as SidebarIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

/**
 * Example component showcasing all TeamSelector variants
 */
const TeamSelectorExample: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { isConnected, error } = useMattermost();

  // Selected team and channel
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  // UI state
  const [variant, setVariant] = useState<TeamSelectorVariant>("list");
  const [showIcons, setShowIcons] = useState(true);
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [showMemberCount, setShowMemberCount] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Handle variant change
  const handleVariantChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVariant(event.target.value as TeamSelectorVariant);
  };

  // Handle team selection
  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    setSelectedChannel(null); // Reset channel selection when team changes
  };

  // Handle channel selection
  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    // On mobile, close the drawer when selecting a channel
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  // Auto-close drawer on mobile
  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    } else {
      setDrawerOpen(true);
    }
  }, [isMobile]);

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error connecting to Mattermost: {error.message}
      </Alert>
    );
  }

  if (!isConnected) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Connecting to Mattermost...
      </Alert>
    );
  }

  // Determine drawer width based on variant
  const getDrawerWidth = () => {
    switch (variant) {
      case "sidebar":
        return 72; // Sidebar is fixed width
      case "grid":
        return 320; // Grid needs more space
      default:
        return 280; // Default for list and tabs
    }
  };

  // Settings panel
  const renderSettings = () => (
    <Paper sx={{ p: 2, maxWidth: 500, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        TeamSelector Settings
      </Typography>

      <FormControl component="fieldset" sx={{ mt: 2 }}>
        <FormLabel component="legend">Display Variant</FormLabel>
        <RadioGroup
          row
          name="variant"
          value={variant}
          onChange={handleVariantChange}
        >
          <FormControlLabel
            value="list"
            control={<Radio />}
            label="List"
            labelPlacement="bottom"
            sx={{ alignItems: "center" }}
          />
          <FormControlLabel
            value="grid"
            control={<Radio />}
            label="Grid"
            labelPlacement="bottom"
            sx={{ alignItems: "center" }}
          />
          <FormControlLabel
            value="tabs"
            control={<Radio />}
            label="Tabs"
            labelPlacement="bottom"
            sx={{ alignItems: "center" }}
          />
          <FormControlLabel
            value="sidebar"
            control={<Radio />}
            label="Sidebar"
            labelPlacement="bottom"
            sx={{ alignItems: "center" }}
          />
        </RadioGroup>
      </FormControl>

      <Divider sx={{ my: 2 }} />

      <FormControl component="fieldset" sx={{ mt: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Display Options
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={showIcons}
              onChange={() => setShowIcons(!showIcons)}
            />
          }
          label="Show Team Icons"
        />

        <FormControlLabel
          control={
            <Switch
              checked={showDescriptions}
              onChange={() => setShowDescriptions(!showDescriptions)}
            />
          }
          label="Show Descriptions"
        />

        <FormControlLabel
          control={
            <Switch
              checked={showMemberCount}
              onChange={() => setShowMemberCount(!showMemberCount)}
            />
          }
          label="Show Member Count"
        />
      </FormControl>
    </Paper>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* App bar with settings toggle */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          p: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          TeamSelector Demo
        </Typography>

        <IconButton
          color="primary"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <SettingsIcon />
        </IconButton>
      </Box>

      {/* Settings panel */}
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        message=""
        sx={{
          top: "60px !important",
          right: "16px !important",
          position: "absolute",
        }}
      >
        <Box sx={{ position: "relative" }}>
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={() => setSettingsOpen(false)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1,
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          {renderSettings()}
        </Box>
      </Snackbar>

      {/* Main content area */}
      <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
        {/* Teams and channels drawer */}
        <Drawer
          variant={isMobile ? "temporary" : "persistent"}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            width: getDrawerWidth(),
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: getDrawerWidth(),
              boxSizing: "border-box",
              position: isMobile ? "fixed" : "relative",
            },
          }}
        >
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Team selector at the top or left */}
            {variant === "tabs" ? (
              <TeamSelector
                variant={variant}
                selectedTeamId={selectedTeam?.id}
                onSelectTeam={handleTeamSelect}
                showIcons={showIcons}
                showDescriptions={showDescriptions}
                showMemberCount={showMemberCount}
              />
            ) : variant === "sidebar" ? (
              <TeamSelector
                variant={variant}
                selectedTeamId={selectedTeam?.id}
                onSelectTeam={handleTeamSelect}
                showIcons={true} // Always true for sidebar
                showDescriptions={showDescriptions}
                showMemberCount={showMemberCount}
              />
            ) : (
              <Box sx={{ height: "auto", overflowY: "auto" }}>
                <TeamSelector
                  variant={variant}
                  selectedTeamId={selectedTeam?.id}
                  onSelectTeam={handleTeamSelect}
                  showIcons={showIcons}
                  showDescriptions={showDescriptions}
                  showMemberCount={showMemberCount}
                />
              </Box>
            )}

            {/* Channel list below teams (except for sidebar) */}
            {selectedTeam && variant !== "sidebar" && (
              <Box sx={{ flexGrow: 1, overflow: "auto" }}>
                <Divider />
                <ChannelList
                  teamId={selectedTeam.id}
                  selectedChannelId={selectedChannel?.id}
                  onSelectChannel={handleChannelSelect}
                  showSearch
                  groupByType
                />
              </Box>
            )}

            {/* For sidebar variant, show channels in a second column */}
            {variant === "sidebar" && (
              <Box
                sx={{
                  position: "absolute",
                  left: 72,
                  top: 0,
                  bottom: 0,
                  width: 220,
                  bgcolor: "background.paper",
                  borderRight: 1,
                  borderColor: "divider",
                }}
              >
                {selectedTeam ? (
                  <ChannelList
                    teamId={selectedTeam.id}
                    selectedChannelId={selectedChannel?.id}
                    onSelectChannel={handleChannelSelect}
                    showSearch
                    groupByType
                    sx={{ height: "100%" }}
                  />
                ) : (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Select a team to view channels
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Drawer>

        {/* Channel content */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            p: variant === "sidebar" && !isMobile ? "0 0 0 220px" : 0, // Add padding for sidebar's channel list
          }}
        >
          {selectedChannel ? (
            <>
              <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
                <ChannelViewer
                  channelId={selectedChannel.id}
                  showHeader
                  autoScrollToBottom
                  sx={{ height: "100%" }}
                />
              </Box>

              <MessageComposer
                channelId={selectedChannel.id}
                placeholder={`Message ${selectedChannel.display_name}`}
                allowAttachments
                showSendButton
              />
            </>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                p: 3,
              }}
            >
              <Typography variant="h5" gutterBottom>
                {selectedTeam
                  ? "Select a channel to start messaging"
                  : "Select a team to view channels"}
              </Typography>

              {isMobile && !drawerOpen && (
                <IconButton
                  color="primary"
                  onClick={() => setDrawerOpen(true)}
                  sx={{ mt: 2 }}
                >
                  <MenuIcon />
                </IconButton>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TeamSelectorExample;
