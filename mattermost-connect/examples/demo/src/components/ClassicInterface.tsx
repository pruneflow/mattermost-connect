// examples/demo/src/examples/ClassicInterface.tsx
import React, { useState, useCallback } from "react";
import {
  Box,
  Typography,
  Drawer,
  AppBar,
  Toolbar,
  IconButton,
  Alert,
  useTheme,
  useMediaQuery,
  Button,
  Paper,
  CircularProgress,
  Container,
} from "@mui/material";

import { Logout as LogoutIcon, Menu as MenuIcon } from "@mui/icons-material";

// Import components from the new mattermost-connect library
import {
  ChannelHeader,
  ChannelList,
  MessageList,
  MessageInput,
  MessageThread,
  TeamList,
  UserAvatar,
  useAuth,
  useChannels,
  useTeams,
  useWebSocket,
  useWebSocketMessageEvents,
  useWebSocketChannelEvents,
  Team,
} from "mattermost-connect";

/**
 * Interface Mattermost classique avec notifications et mises à jour en temps réel
 *
 * Structure responsive:
 * - Desktop: Layout en grille avec équipes en haut, canaux à gauche et messages à droite
 * - Mobile: App bar + tiroir latéral pour navigation + zone de contenu pour messages
 */
const ClassicInterface = ({ onLogout }: { onLogout: () => void }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Authentication hooks
  const { currentUser, isAuthenticated } = useAuth();

  // Teams hooks
  const { activeTeam, setActiveTeam } = useTeams();

  // Channels hooks
  const { activeChannel } = useChannels(activeTeam?.id);

  // WebSocket hooks for real-time updates
  const { isConnected: isWebSocketConnected } = useWebSocket();

  // Register WebSocket handlers for message updates
  useWebSocketMessageEvents(
    (data) => {
      // Refresh messages when we receive a message update
      if (activeChannel && data.channel_id === activeChannel.id) {
        // In a real implementation, you would handle the message update here
        console.log("Message event received:", data);
      }
    },
    [activeChannel?.id],
  );

  // Register WebSocket handlers for channel updates
  useWebSocketChannelEvents((data) => {
    console.log("Channel event received:", data);
  }, []);

  // Local state for UI
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [currentThreadRootId, setCurrentThreadRootId] = useState<string | null>(
    null,
  );

  // Toggle the navigation drawer (mobile only)
  const toggleDrawer = useCallback(() => {
    setDrawerOpen(!drawerOpen);
  }, [drawerOpen]);

  // Close the drawer
  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // Handle a team selection
  const handleTeamSelect = useCallback(
    (team: Team | null) => {
      setActiveTeam(team);
      handleCloseDrawer();
    },
    [setActiveTeam, handleCloseDrawer],
  );

  // Handle a channel selection
  const handleChannelSelect = useCallback(() => {
    // In the actual implementation, this would be handled by the ChannelList component
    // and the activeChannel would be updated automatically
    handleCloseDrawer();
  }, [handleCloseDrawer]);

  // Handle closing a thread
  const handleCloseThread = useCallback(() => {
    setThreadOpen(false);
    setCurrentThreadRootId(null);
  }, []);

  // Display an error if not authenticated
  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm">
        <Alert severity="error" sx={{ m: 2 }}>
          Not authenticated. Please log in.
        </Alert>
      </Container>
    );
  }

  // Display a loading indicator while websocket is connecting
  if (activeTeam && !isWebSocketConnected) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Connecting to Mattermost...
        </Typography>
      </Box>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
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

            {/* User information */}
            {currentUser && (
              <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
                <UserAvatar
                  userId={currentUser.id}
                  size="small"
                  showStatus={true}
                />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {currentUser.first_name
                    ? `${currentUser.first_name} ${currentUser.last_name || ""}`
                    : currentUser.username}
                </Typography>
              </Box>
            )}

            {/* Logout button */}
            <IconButton color="inherit" onClick={onLogout}>
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Mobile Navigation Drawer */}
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={handleCloseDrawer}
          sx={{
            "& .MuiDrawer-paper": {
              width: 280,
              boxSizing: "border-box",
            },
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Teams & Channels
            </Typography>
          </Box>

          {/* Teams List */}
          <TeamList
            variant="list"
            density="compact"
            onTeamSelect={handleTeamSelect}
          />

          {/* Channels List for active team */}
          {activeTeam && (
            <ChannelList
              teamId={activeTeam.id}
              showSearch={true}
              groupByType={true}
              showFavorites={true}
              onChannelSelect={handleChannelSelect}
            />
          )}
        </Drawer>

        {/* Content Area */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {activeChannel ? (
            <>
              {/* Channel Header */}
              <ChannelHeader
                channelId={activeChannel.id}
                size="small"
                showSearch={true}
                showSettings={true}
                showLeave={true}
              />

              {/* Thread View (if thread is open) */}
              {threadOpen && currentThreadRootId ? (
                <MessageThread
                  rootMessageId={currentThreadRootId}
                  channelId={activeChannel.id}
                  showReplyInput={true}
                  allowAttachments={true}
                  allowEmojis={true}
                  onClose={handleCloseThread}
                  sx={{ height: "100%" }}
                />
              ) : (
                <>
                  {/* Messages */}
                  <Box sx={{ flexGrow: 1, overflow: "auto" }}>
                    <MessageList
                      channelId={activeChannel.id}
                      showInput={false}
                      onMessageEdited={(message) =>
                        console.log("Message edited:", message)
                      }
                      onMessageDeleted={(messageId) =>
                        console.log("Message deleted:", messageId)
                      }
                    />
                  </Box>

                  {/* Message Input */}
                  <MessageInput
                    channelId={activeChannel.id}
                    allowAttachments={true}
                    allowEmojis={true}
                    onMessageSent={(message) =>
                      console.log("Message sent:", message)
                    }
                  />
                </>
              )}
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
                {activeTeam
                  ? "Select a channel to start chatting"
                  : "Select a team to see channels"}
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

  // Desktop layout
  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top App Bar */}
      <AppBar position="static">
        <Toolbar>
          {/* User information */}
          {currentUser && (
            <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
              <UserAvatar
                userId={currentUser.id}
                size="small"
                showStatus={true}
              />
              <Typography variant="body2" sx={{ ml: 1 }}>
                {currentUser.first_name
                  ? `${currentUser.first_name} ${currentUser.last_name || ""}`
                  : currentUser.username}
              </Typography>
            </Box>
          )}

          {/* Logout button */}
          <Button color="inherit" onClick={onLogout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {/* Teams Selector */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          width: "100%",
        }}
      >
        <TeamList
          variant="tabs"
          density="compact"
          onTeamSelect={handleTeamSelect}
        />
      </Paper>

      {/* Main Content Grid */}
      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
          overflow: "hidden",
        }}
      >
        {/* Channels Column */}
        <Box
          sx={{
            width: 280,
            borderRight: 1,
            borderColor: "divider",
            overflow: "auto",
          }}
        >
          {activeTeam ? (
            <ChannelList
              teamId={activeTeam.id}
              showSearch={true}
              groupByType={true}
              showFavorites={true}
              onChannelSelect={handleChannelSelect}
            />
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Select a team to view channels
              </Typography>
            </Box>
          )}
        </Box>

        {/* Messages Column */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {activeChannel ? (
            <>
              {/* Channel Header */}
              <ChannelHeader
                channelId={activeChannel.id}
                size="medium"
                showSearch={true}
                showSettings={true}
                showLeave={true}
              />

              {/* Thread View (if thread is open) */}
              {threadOpen && currentThreadRootId ? (
                <MessageThread
                  rootMessageId={currentThreadRootId}
                  channelId={activeChannel.id}
                  showReplyInput={true}
                  allowAttachments={true}
                  allowEmojis={true}
                  onClose={handleCloseThread}
                  sx={{ height: "100%" }}
                />
              ) : (
                <>
                  {/* Messages */}
                  <Box sx={{ flexGrow: 1, overflow: "auto" }}>
                    <MessageList
                      channelId={activeChannel.id}
                      showInput={false}
                      onMessageEdited={(message) =>
                        console.log("Message edited:", message)
                      }
                      onMessageDeleted={(messageId) =>
                        console.log("Message deleted:", messageId)
                      }
                    />
                  </Box>

                  {/* Message Input */}
                  <MessageInput
                    channelId={activeChannel.id}
                    allowAttachments={true}
                    allowEmojis={true}
                    onMessageSent={(message) =>
                      console.log("Message sent:", message)
                    }
                  />
                </>
              )}
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
                {activeTeam
                  ? "Select a channel to start chatting"
                  : "Select a team to see channels"}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ClassicInterface;
