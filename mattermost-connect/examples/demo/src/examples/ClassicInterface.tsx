// examples/demo/src/examples/ClassicInterface.tsx
import React, { useState, useCallback } from "react";
import {
  ChannelList,
  ChannelViewer,
  MessageComposer,
  NotificationCenter,
  TeamSelector,
  formatUserDisplayName,
  Notification,
  TeamChannelNavigator,
  useChannelContext,
  useConnection,
  useMessageContext,
  useTeamContext,
  useUserContext,
} from "mattermost-connect";

// Material-UI Components
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
} from "@mui/material";

// Material-UI Icons
import { Logout as LogoutIcon, Menu as MenuIcon } from "@mui/icons-material";

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
  const { error } = useConnection();
  const { activeTeam } = useTeamContext();
  const { activeChannel } = useChannelContext();
  const { navigateToMessage } = useMessageContext();
  const { currentUser } = useUserContext();

  // État
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  // Handler pour l'envoi de messages
  const handleSendMessage = async (message: string) => {
    if (!activeChannel) return;

    try {
      console.log("Message envoyé avec succès:", message);
    } catch (error) {
      console.error("Error after message sent:", error);
    }
  };

  // Handler pour la navigation depuis les notifications
  const handleNavigateToChannel = (notification: Notification) => {
    if (notification.channelId) {
      navigateToMessage(notification.channelId, notification.messageId);
    }
  };

  // Afficher les erreurs si présentes
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Erreur de connexion à Mattermost: {error.message}
      </Alert>
    );
  }

  // Mise en page mobile avec tiroir
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

            {/* Nom d'utilisateur à gauche */}
            <Typography variant="body2" component="div" sx={{ flexGrow: 1 }}>
              {currentUser ? formatUserDisplayName(currentUser) : ""}
            </Typography>

            {/* Centre de notifications et déconnexion à droite */}
            <NotificationCenter onNavigateToChannel={handleNavigateToChannel} />
            <IconButton color="inherit" onClick={onLogout} edge="end">
              <LogoutIcon />
            </IconButton>
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
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle1" component="div" fontWeight="bold">
              {currentUser ? formatUserDisplayName(currentUser) : "Navigation"}
            </Typography>
          </Box>

          {/* The new integrated TeamChannelNavigator component */}
          <TeamChannelNavigator
            closeOnSelect={true}
            onClose={handleCloseDrawer}
            showSearch={false}
            showPrivateChannels={true}
            showDirectMessages={true}
            groupByType={false}
          />
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
              <Box
                sx={{
                  flexGrow: 1,
                  overflow: "auto",
                }}
              >
                <ChannelViewer
                  channelId={activeChannel.id}
                  showHeader={true}
                  autoScrollToBottom
                  sx={{ height: "100%" }}
                />
              </Box>

              <MessageComposer
                channelId={activeChannel.id}
                placeholder={`Message ${activeChannel.display_name}`}
                allowAttachments
                onMessageSent={handleSendMessage}
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
                {activeTeam
                  ? "Sélectionnez un canal pour commencer à échanger"
                  : "Sélectionnez une équipe pour voir les canaux"}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={toggleDrawer}
                startIcon={<MenuIcon />}
                sx={{ mt: 2 }}
              >
                Ouvrir la navigation
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // Mise en page desktop avec deux colonnes
  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* AppBar principale */}
      <AppBar position="static">
        <Toolbar>
          {/* Nom d'utilisateur à gauche */}
          <Typography variant="body2" component="div" sx={{ flexGrow: 1 }}>
            {currentUser ? formatUserDisplayName(currentUser) : ""}
          </Typography>

          {/* Centre de notifications et déconnexion à droite */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <NotificationCenter onNavigateToChannel={handleNavigateToChannel} />
            <Button
              color="inherit"
              onClick={onLogout}
              startIcon={<LogoutIcon />}
              size="small"
            >
              Déconnexion
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sélecteur d'équipes en onglets sur toute la largeur */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          width: "100%",
        }}
      >
        <TeamSelector
          variant="tabs"
          showIcons
          showMemberCount={false}
          sx={{ width: "100%" }}
        />
      </Paper>

      {/* Contenu principal en deux colonnes */}
      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
          overflow: "hidden",
        }}
      >
        {/* Liste des canaux (colonne gauche) */}
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
              showSearch
              showPrivateChannels
              showDirectMessages
              groupByType
            />
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Sélectionnez une équipe pour voir les canaux
              </Typography>
            </Box>
          )}
        </Box>

        {/* Zone des messages (colonne droite) */}
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
              <Box sx={{ flexGrow: 1, overflow: "auto" }}>
                <ChannelViewer
                  channelId={activeChannel.id}
                  showHeader
                  autoScrollToBottom
                  sx={{ height: "100%" }}
                />
              </Box>
              <Box>
                <MessageComposer
                  channelId={activeChannel.id}
                  placeholder={`Message ${activeChannel.display_name}`}
                  allowAttachments
                  onMessageSent={handleSendMessage}
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
                {activeTeam
                  ? "Sélectionnez un canal pour commencer à échanger"
                  : "Sélectionnez une équipe pour voir les canaux"}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ClassicInterface;
