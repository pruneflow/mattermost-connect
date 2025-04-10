// examples/demo/src/examples/ClassicInterface.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  useMattermost,
  ChannelList,
  ChannelViewer,
  MessageComposer,
  Team,
  Channel,
} from "mattermost-connect";

// Material-UI Components
import {
  Box,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  AppBar,
  Toolbar,
  IconButton,
  Alert,
  useTheme,
  useMediaQuery,
  Button,
  Divider,
  Paper,
  Tabs,
  Tab,
} from "@mui/material";

// Material-UI Icons
import { Menu as MenuIcon } from "@mui/icons-material";
import TeamSelector from "../../../../src/components/TeamSelector/TeamSelector";

/**
 * Classic Mattermost-style interface with teams and channels always visible on desktop
 */
const ClassicInterface: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { isConnected, service, error } = useMattermost();

  // References for measuring initial heights
  const appBarRef = useRef<HTMLDivElement>(null);
  const teamsTabsRef = useRef<HTMLDivElement>(null);

  // State for layout management
  const [appBarHeight, setAppBarHeight] = useState<number>(0);
  const [tabsHeight, setTabsHeight] = useState<number>(0);

  // État
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Height for spacing below the chat to accommodate the fixed MessageComposer on mobile
  const messageComposerHeight = isMobile ? 64 : 0; // Hauteur estimée du MessageComposer

  // Load teams when component mounts
  useEffect(() => {
    if (isConnected) {
      const fetchTeams = async () => {
        try {
          const teamsData = await service.getTeams();
          setTeams(teamsData);

          // Auto-select first team
          if (teamsData.length > 0) {
            setSelectedTeam(teamsData[0]);
          }

          setLoading(false);
        } catch (err) {
          console.error("Error loading teams:", err);
          setLoading(false);
        }
      };

      void fetchTeams();
    }
  }, [isConnected, service]);

  // Measure heights of fixed elements after render
  useEffect(() => {
    if (appBarRef.current) {
      setAppBarHeight(appBarRef.current.offsetHeight);
    }
    if (teamsTabsRef.current) {
      setTabsHeight(teamsTabsRef.current.offsetHeight);
    }
  }, []);

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    // On mobile only, close the drawer
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    setSelectedChannel(null);
  };

  const handleTeamChange = (_event: React.SyntheticEvent, newValue: string) => {
    const team = teams.find((t) => t.id === newValue);
    if (team) {
      setSelectedTeam(team);
      setSelectedChannel(null);
    }
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error connecting to Mattermost: {error.message}
      </Alert>
    );
  }

  // Mobile layout with drawer
  if (isMobile) {
    return (
      <Box sx={{ height: "100%" }}>
        {/* Mobile App Bar */}
        <AppBar position="static">
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={toggleDrawer}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {selectedChannel
                ? selectedChannel.display_name
                : selectedTeam
                  ? selectedTeam.display_name
                  : "MattermostConnect"}
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Mobile Drawer for Navigation */}
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={toggleDrawer}
          sx={{
            "& .MuiDrawer-paper": {
              width: 280,
              boxSizing: "border-box",
            },
          }}
        >
          {/* Teams List */}
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" component="div" fontWeight="bold">
              Teams
            </Typography>
          </Box>
          <TeamSelector
            selectedTeamId={selectedTeam?.id}
            onSelectTeam={handleTeamSelect}
          />

          <Divider sx={{ my: 1 }} />

          {/* Channels List */}
          {selectedTeam && (
            <Box sx={{ flexGrow: 1, overflow: "auto" }}>
              <ChannelList
                teamId={selectedTeam.id}
                selectedChannelId={selectedChannel?.id}
                onSelectChannel={handleChannelSelect}
                showSearch
                showPrivateChannels
                showDirectMessages
                groupByType
              />
            </Box>
          )}
        </Drawer>

        {/* Content Area */}
        <Box
          sx={{
            height: `calc(100vh - 64px)`, // Hauteur totale moins la hauteur de l'AppBar
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {selectedChannel ? (
            <>
              <Box
                sx={{
                  flexGrow: 1,
                  overflow: "auto",
                  // Ajouter de l'espace en bas pour éviter que le contenu soit masqué par le MessageComposer
                  pb: `${messageComposerHeight}px`,
                }}
              >
                <ChannelViewer
                  channelId={selectedChannel.id}
                  showHeader={false} // We already show the header in the app bar
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
              <Typography variant="h5" component="div" gutterBottom>
                {selectedTeam
                  ? "Select a channel to start messaging"
                  : "Select a team to view channels"}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={toggleDrawer}
                startIcon={<MenuIcon />}
                sx={{ mt: 2 }}
              >
                Open Navigation
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // Desktop layout with fixed columns
  // Calculate heights based on other elements
  const topAppBarHeight = 64; // Standard AppBar height in MUI

  return (
    <Box sx={{ height: "100%" }}>
      {/* Team tabs if more than one team - positioned directly below AppBar */}
      {teams.length > 1 && (
        <Box
          ref={teamsTabsRef}
          sx={{
            position: "absolute",
            top: `${topAppBarHeight}px`, // AppBar height
            left: 0,
            right: 0,
            bgcolor: "background.paper",
            zIndex: 1100,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tabs
            value={selectedTeam?.id || ""}
            onChange={handleTeamChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {teams.map((team) => (
              <Tab key={team.id} label={team.display_name} value={team.id} />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Main content container - positioned below headers with fixed height */}
      <Box
        sx={{
          position: "absolute",
          top:
            teams.length > 1
              ? `${topAppBarHeight + tabsHeight + 48}px`
              : "64px", // AppBar height + Tabs height (if present)
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          overflow: "hidden",
        }}
      >
        {/* Teams Column - Left navigation, only if not using tabs */}
        {teams.length <= 1 && (
          <Box
            sx={{
              width: 200,
              height: "100%",
              borderRight: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle1" component="div" fontWeight="bold">
                Teams
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, overflow: "auto" }}>
              <List disablePadding>
                {teams.map((team) => (
                  <ListItemButton
                    key={team.id}
                    selected={selectedTeam?.id === team.id}
                    onClick={() => handleTeamSelect(team)}
                    sx={{
                      pl: 3,
                      pr: 2,
                      py: 1,
                      borderLeft: 3,
                      borderColor:
                        selectedTeam?.id === team.id
                          ? "primary.main"
                          : "transparent",
                    }}
                  >
                    <ListItemText
                      primary={team.display_name}
                      primaryTypographyProps={{
                        fontWeight: selectedTeam?.id === team.id ? 600 : 400,
                        noWrap: true,
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          </Box>
        )}

        {/* Channels Column */}
        <Box
          sx={{
            width: 280,
            height: "100%",
            borderRight: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {selectedTeam ? (
            <ChannelList
              teamId={selectedTeam.id}
              selectedChannelId={selectedChannel?.id}
              onSelectChannel={handleChannelSelect}
              showSearch
              showPrivateChannels
              showDirectMessages
              groupByType
              sx={{ height: "100%" }}
            />
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography
                variant="body2"
                component="div"
                color="text.secondary"
              >
                Select a team to view channels
              </Typography>
            </Box>
          )}
        </Box>

        {/* Content Area */}
        <Box
          sx={{
            flexGrow: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {selectedChannel ? (
            <>
              <Box
                sx={{
                  flexGrow: 1,
                  overflow: "hidden",
                }}
              >
                <ChannelViewer
                  channelId={selectedChannel.id}
                  showHeader
                  autoScrollToBottom
                  sx={{ height: "100%" }}
                />
              </Box>

              <Box>
                <MessageComposer
                  channelId={selectedChannel.id}
                  placeholder={`Message ${selectedChannel.display_name}`}
                  allowAttachments
                  showSendButton
                />
              </Box>
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
              <Typography variant="h5" component="div" gutterBottom>
                {selectedTeam
                  ? "Select a channel to start messaging"
                  : "Select a team to view channels"}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ClassicInterface;
