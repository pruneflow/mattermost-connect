// examples/demo/src/components/ClassicInterface.tsx
import React, { useState, useCallback, useEffect } from "react";
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

// Importer les composants de la bibliothèque mattermost-connect
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
  Channel,
  Team,
  Message,
} from "mattermost-connect";

interface ClassicInterfaceProps {
  onLogout: () => void;
  mockService?: any; // Service mock optionnel pour le mode démo
}

/**
 * Interface Mattermost classique avec notifications et mises à jour en temps réel
 *
 * Structure responsive:
 * - Desktop: Layout en grille avec équipes en haut, canaux à gauche et messages à droite
 * - Mobile: App bar + tiroir latéral pour navigation + zone de contenu pour messages
 */
const ClassicInterface: React.FC<ClassicInterfaceProps> = ({
  onLogout,
  mockService,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Hooks d'authentification
  const { currentUser, isAuthenticated } = useAuth();

  // Hooks d'équipes
  const {
    teams,
    activeTeam,
    setActiveTeam,
    isLoading: teamsLoading,
  } = useTeams();

  // Hooks de canaux
  const {
    channels,
    activeChannel,
    setActiveChannel,
    publicChannels,
    isLoading: channelsLoading,
  } = useChannels(activeTeam?.id);

  // Hooks WebSocket pour les mises à jour en temps réel
  const { isConnected: isWebSocketConnected, connect: connectWebSocket } =
    useWebSocket();

  const [wsConnectionTimedOut, setWsConnectionTimedOut] = useState(false);

  // Initialiser WebSocket si on utilise le service mock
  useEffect(() => {
    if (mockService && !isWebSocketConnected) {
      // Configurer les gestionnaires WebSocket mock
      mockService.connectWebSocket();

      // Nettoyer lors du démontage
      return () => {
        mockService.disconnectWebSocket();
      };
    }
  }, [mockService, isWebSocketConnected]);

  useEffect(() => {
    if (!mockService && activeTeam && !isWebSocketConnected) {
      // Définir un timeout de 10 secondes pour la connexion WebSocket
      const timeout = setTimeout(() => {
        console.warn("WebSocket connection timeout, proceeding anyway");
        setWsConnectionTimedOut(true);
      }, 10000);

      // Nettoyer le timeout si la connexion réussit
      return () => {
        clearTimeout(timeout);
        setWsConnectionTimedOut(false);
      };
    }
  }, [mockService, activeTeam, isWebSocketConnected]);

  // Enregistrer les gestionnaires WebSocket pour les mises à jour de messages
  useWebSocketMessageEvents(
    (data) => {
      // Actualiser les messages lorsque nous recevons une mise à jour de message
      if (activeChannel && data.channel_id === activeChannel.id) {
        console.log("Message event received:", data);
      }
    },
    [activeChannel?.id],
  );

  // État local pour l'interface utilisateur
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [currentThreadRootId, setCurrentThreadRootId] = useState<string | null>(
    null,
  );

  // Basculer le tiroir de navigation (mobile uniquement)
  const toggleDrawer = useCallback(() => {
    setDrawerOpen(!drawerOpen);
  }, [drawerOpen]);

  // Fermer le tiroir
  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // Gérer une sélection d'équipe
  const handleTeamSelect = useCallback(
    (team: Team) => {
      handleCloseDrawer();
    },
    [handleCloseDrawer],
  );

  // Gérer une sélection de canal
  const handleChannelSelect = useCallback(
    (channel: Channel) => {
      handleCloseDrawer();
    },
    [handleCloseDrawer],
  );

  // Gérer l'ouverture d'un fil de discussion
  const handleOpenThread = useCallback((message: Message) => {
    setCurrentThreadRootId(message.id);
    setThreadOpen(true);
  }, []);

  // Gérer la fermeture d'un fil de discussion
  const handleCloseThread = useCallback(() => {
    setThreadOpen(false);
    setCurrentThreadRootId(null);
  }, []);

  // Afficher un indicateur de chargement pendant le chargement des équipes
  if (teamsLoading) {
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
        <Typography variant="body1" component={"div"} sx={{ mt: 2 }}>
          Loading teams...
        </Typography>
      </Box>
    );
  }

  // Afficher une erreur si non authentifié
  if (!isAuthenticated && !mockService) {
    return (
      <Container maxWidth="sm">
        <Alert severity="error" sx={{ m: 2 }}>
          Not authenticated. Please log in.
        </Alert>
      </Container>
    );
  }

  // Afficher un indicateur de chargement pendant la connexion WebSocket (uniquement pour les connexions réelles)
  if (
    !mockService &&
    activeTeam &&
    !isWebSocketConnected &&
    !wsConnectionTimedOut
  ) {
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
        <Typography variant="body1" component={"div"} sx={{ mt: 2 }}>
          Connecting to Mattermost...
        </Typography>
      </Box>
    );
  }

  // Layout mobile
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

            {/* Informations utilisateur */}
            {currentUser && (
              <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
                <UserAvatar
                  userId={currentUser.id}
                  size="small"
                  showStatus={true}
                />
                <Typography variant="body2" component={"div"} sx={{ ml: 1 }}>
                  {currentUser.first_name
                    ? `${currentUser.first_name} ${currentUser.last_name || ""}`
                    : currentUser.username}
                </Typography>
              </Box>
            )}

            {/* Bouton de déconnexion */}
            <IconButton color="inherit" onClick={onLogout}>
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Tiroir de navigation mobile */}
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
            <Typography variant="subtitle1" component={"div"} fontWeight="bold">
              Teams & Channels
            </Typography>
          </Box>

          {/* Liste des équipes */}
          <TeamList
            variant="list"
            density="compact"
            onTeamSelect={handleTeamSelect}
          />

          {/* Liste des canaux pour l'équipe active */}
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

        {/* Zone de contenu */}
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
              {/* En-tête du canal */}
              <ChannelHeader
                channelId={activeChannel.id}
                size="small"
                showSearch={true}
                showSettings={true}
                showLeave={true}
              />

              {/* Vue du fil de discussion (si le fil est ouvert) */}
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

                  {/* Input de message */}
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
              <Typography variant="h5" component={"div"} gutterBottom>
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

  // Layout desktop
  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top App Bar */}
      <AppBar position="static">
        <Toolbar>
          {/* Informations utilisateur */}
          {currentUser && (
            <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
              <UserAvatar
                userId={currentUser.id}
                size="small"
                showStatus={true}
              />
              <Typography variant="body2" component={"div"} sx={{ ml: 1 }}>
                {currentUser.first_name
                  ? `${currentUser.first_name} ${currentUser.last_name || ""}`
                  : currentUser.username}
              </Typography>
            </Box>
          )}

          {/* Bouton de déconnexion */}
          <Button color="inherit" onClick={onLogout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {/* Sélecteur d'équipes */}
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

      {/* Grille de contenu principal */}
      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
          overflow: "hidden",
        }}
      >
        {/* Colonne des canaux */}
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
              <Typography
                variant="body2"
                component={"div"}
                color="text.secondary"
              >
                Select a team to view channels
              </Typography>
            </Box>
          )}
        </Box>

        {/* Colonne des messages */}
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
              {/* En-tête du canal */}
              <ChannelHeader
                channelId={activeChannel.id}
                size="medium"
                showSearch={true}
                showSettings={true}
                showLeave={true}
              />

              {/* Vue du fil de discussion (si le fil est ouvert) */}
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

                  {/* Input de message */}
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
              <Typography variant="h5" component={"div"} gutterBottom>
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
