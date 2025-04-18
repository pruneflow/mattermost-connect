// examples/demo/src/examples/ClassicInterface.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  useMattermost,
  ChannelList,
  ChannelViewer,
  MessageComposer,
  NotificationCenter,
  TeamSelector,
  formatUserDisplayName,
  Notification,
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
  Divider,
} from "@mui/material";

// Material-UI Icons
import { Logout as LogoutIcon, Menu as MenuIcon } from "@mui/icons-material";

/**
 * Interface Mattermost classique avec notifications et mises à jour en temps réel
 */
const ClassicInterface = ({ onLogout }: { onLogout: () => void }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { error, navigateToMessage, activeChannel, currentUser, activeTeam } =
    useMattermost();

  // Références pour mesurer les hauteurs initiales
  const appBarRef = useRef<HTMLDivElement>(null);
  const teamsTabsRef = useRef<HTMLDivElement>(null);

  // État pour la gestion de la mise en page
  const [appBarHeight, setAppBarHeight] = useState<number>(64); // valeur par défaut
  const [tabsHeight, setTabsHeight] = useState<number>(48); // valeur par défaut

  // État
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Hauteur pour l'espacement sous le chat pour le MessageComposer fixe sur mobile
  const messageComposerHeight = isMobile ? 64 : 0;

  useEffect(() => {
    if (appBarRef.current) {
      setAppBarHeight(appBarRef.current.offsetHeight);
    }
    if (teamsTabsRef.current) {
      setTabsHeight(teamsTabsRef.current.offsetHeight);
    }
  }, []);

  // Handler pour la sélection d'un canal
  const handleChannelSelect = useCallback(() => {
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [isMobile]);

  // Basculer le tiroir
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Handler pour l'envoi de messages
  const handleSendMessage = async (message: string) => {
    if (!activeChannel) return;

    try {
      // Puisque nous sommes en mode AUTO (par défaut),
      // l'envoi du message a déjà été géré par le composant MessageComposer
      console.log("Message envoyé avec succès:", message);
    } catch (error) {
      console.error("Error after message sent:", error);
    }
  };

  // Handler pour la navigation depuis les notifications
  const handleNavigateToChannel = useCallback(
    (notification: Notification) => {
      navigateToMessage(notification);
    },
    [navigateToMessage],
  );

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
      <Box sx={{ height: "100%" }}>
        {/* Mobile App Bar */}
        <AppBar position="static" ref={appBarRef}>
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
              {activeChannel
                ? activeChannel.display_name
                : activeTeam
                  ? activeTeam.display_name
                  : "MattermostConnect"}
            </Typography>

            {/* Centre de notifications */}
            <NotificationCenter onNavigateToChannel={handleNavigateToChannel} />
            <IconButton color="inherit" onClick={onLogout}>
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
          {/* Teams List */}
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" component="div" fontWeight="bold">
              Équipes
            </Typography>
          </Box>
          <TeamSelector showIcons showDescriptions={false} />

          <Divider sx={{ my: 1 }} />

          {/* Channels List */}
          {activeTeam && (
            <Box sx={{ flexGrow: 1, overflow: "auto" }}>
              <ChannelList
                teamId={activeTeam.id}
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
          {activeChannel ? (
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
                  channelId={activeChannel.id}
                  showHeader={false} // Nous montrons déjà l'en-tête dans l'AppBar
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

  // Mise en page desktop avec colonnes fixes
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* AppBar principale */}
      <AppBar position="static" ref={appBarRef}>
        <Toolbar>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {currentUser && (
              <Typography variant="body2" component="div">
                {formatUserDisplayName(currentUser)}
              </Typography>
            )}

            {/* Centre de notifications */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <NotificationCenter
                onNavigateToChannel={handleNavigateToChannel}
              />
              <Button
                color="inherit"
                onClick={onLogout}
                startIcon={<LogoutIcon />}
              >
                Déconnexion
              </Button>
            </div>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Contenu principal */}
      <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
        {/* Barre latérale des équipes */}
        <Box
          sx={{
            width: "70px",
            borderRight: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
          }}
          ref={teamsTabsRef}
        >
          <TeamSelector
            showDescriptions
            showIcons
            showMemberCount
            variant={"tabs"}
          />
        </Box>

        {/* Barre latérale des canaux */}
        <Box
          sx={{
            position: "absolute",
            top: `${appBarHeight + tabsHeight + 48}px`,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            overflow: "hidden",
          }}
        >
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
            {activeTeam ? (
              <ChannelList
                teamId={activeTeam.id}
                onSelectChannel={handleChannelSelect}
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

          {/* Zone de contenu */}
          <Box
            sx={{
              flexGrow: 1,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {activeChannel ? (
              <>
                <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
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
    </Box>
  );
};

export default ClassicInterface;
