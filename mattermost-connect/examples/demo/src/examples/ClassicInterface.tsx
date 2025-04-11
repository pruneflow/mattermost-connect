// examples/demo/src/examples/ClassicInterface.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  useMattermost,
  ChannelList,
  ChannelViewer,
  MessageComposer,
  Team,
  Channel,
  // Nouveaux composants de notification
  NotificationCenter,
  notificationService,
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
  Badge,
} from "@mui/material";

// Material-UI Icons
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
} from "@mui/icons-material";
import TeamSelector from "../../../../src/components/team/TeamSelector/TeamSelector";

/**
 * Interface Mattermost classique avec notifications et mises à jour en temps réel
 */
const ClassicInterface: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const {
    isConnected,
    service,
    error,
    navigateToChannel,
    activeChannel,
    setActiveChannel,
    currentUser,
  } = useMattermost();

  // Références pour mesurer les hauteurs initiales
  const appBarRef = useRef<HTMLDivElement>(null);
  const teamsTabsRef = useRef<HTMLDivElement>(null);

  // État pour la gestion de la mise en page
  const [appBarHeight, setAppBarHeight] = useState<number>(0);
  const [tabsHeight, setTabsHeight] = useState<number>(0);

  // État
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState<
    string | undefined
  >(undefined);

  // État des non-lus pour afficher des badges
  const [unreadState, setUnreadState] = useState<
    Record<string, { messageCount: number; mentionCount: number }>
  >({});

  // Hauteur pour l'espacement sous le chat pour le MessageComposer fixe sur mobile
  const messageComposerHeight = isMobile ? 64 : 0;

  // Charger les équipes au montage du composant
  useEffect(() => {
    if (isConnected) {
      const fetchTeams = async () => {
        try {
          const teamsData = await service.getTeams();
          setTeams(teamsData);

          // Sélectionner automatiquement la première équipe
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

  // S'abonner aux mises à jour de l'état des non-lus
  useEffect(() => {
    const unsubscribe = notificationService.addEventListener(
      "unread_updated",
      (updatedUnreadState) => {
        setUnreadState(updatedUnreadState);
      },
    );

    return unsubscribe;
  }, []);

  // Mesurer les hauteurs des éléments fixes après le rendu
  useEffect(() => {
    if (appBarRef.current) {
      setAppBarHeight(appBarRef.current.offsetHeight);
    }
    if (teamsTabsRef.current) {
      setTabsHeight(teamsTabsRef.current.offsetHeight);
    }
  }, []);

  // Synchroniser selectedChannel avec activeChannel du contexte
  useEffect(() => {
    if (activeChannel) {
      setSelectedChannel(activeChannel);
    }
  }, [activeChannel]);

  // Handler pour la sélection d'un canal
  const handleChannelSelect = useCallback(
    (channel: Channel) => {
      setSelectedChannel(channel);
      setActiveChannel(channel);
      setHighlightMessageId(undefined);

      // Sur mobile uniquement, fermer le tiroir
      if (isMobile) {
        setDrawerOpen(false);
      }
    },
    [isMobile, setActiveChannel],
  );

  // Handler pour la sélection d'une équipe
  const handleTeamSelect = useCallback(
    (team: Team) => {
      setSelectedTeam(team);
      setSelectedChannel(null);
      setActiveChannel(null);
    },
    [setActiveChannel],
  );

  // Handler pour le changement d'équipe via les onglets
  const handleTeamChange = useCallback(
    (_event: React.SyntheticEvent, newValue: string) => {
      const team = teams.find((t) => t.id === newValue);
      if (team) {
        setSelectedTeam(team);
        setSelectedChannel(null);
        setActiveChannel(null);
      }
    },
    [teams, setActiveChannel],
  );

  // Basculer le tiroir
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Handler pour l'envoi de messages
  const handleSendMessage = async (message: string) => {
    if (!selectedChannel) return;

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
    (channelId: string, messageId?: string) => {
      navigateToChannel(channelId, messageId);

      // Si un messageId est fourni, le définir pour la mise en évidence
      if (messageId) {
        setHighlightMessageId(messageId);
      }
    },
    [navigateToChannel],
  );

  // Obtenir le nombre total de messages et mentions non lus
  const getTotalUnreads = useCallback(() => {
    let totalMessages = 0;
    let totalMentions = 0;

    Object.values(unreadState).forEach((channelUnread) => {
      totalMessages += channelUnread.messageCount || 0;
      totalMentions += channelUnread.mentionCount || 0;
    });

    return { totalMessages, totalMentions };
  }, [unreadState]);

  // Obtenir les non-lus pour un canal spécifique
  const getChannelUnreads = useCallback(
    (channelId: string) => {
      return unreadState[channelId] || { messageCount: 0, mentionCount: 0 };
    },
    [unreadState],
  );

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error connecting to Mattermost: {error.message}
      </Alert>
    );
  }

  // Mise en page mobile avec tiroir
  if (isMobile) {
    const { totalMentions } = getTotalUnreads();

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
              {selectedChannel
                ? selectedChannel.display_name
                : selectedTeam
                  ? selectedTeam.display_name
                  : "MattermostConnect"}
            </Typography>

            {/* Centre de notifications */}
            <NotificationCenter onNavigateToChannel={handleNavigateToChannel} />
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
                  showHeader={false} // Nous montrons déjà l'en-tête dans l'AppBar
                  autoScrollToBottom
                  sx={{ height: "100%" }}
                  highlightMessageId={highlightMessageId}
                />
              </Box>

              <MessageComposer
                channelId={selectedChannel.id}
                placeholder={`Message ${selectedChannel.display_name}`}
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

  // Mise en page desktop avec colonnes fixes
  // Calculer les hauteurs en fonction des autres éléments
  const topAppBarHeight = 64; // Hauteur standard AppBar dans MUI
  const { totalMentions } = getTotalUnreads();

  return (
    <Box sx={{ height: "100%" }}>
      {/* AppBar principale */}
      <AppBar position="static" ref={appBarRef}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {selectedChannel
              ? selectedChannel.display_name
              : selectedTeam
                ? selectedTeam.display_name
                : "MattermostConnect"}
          </Typography>

          {/* Centre de notifications */}
          <NotificationCenter onNavigateToChannel={handleNavigateToChannel} />
        </Toolbar>
      </AppBar>

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
              <Tab
                key={team.id}
                label={
                  <Badge
                    badgeContent={
                      getTotalUnreads().totalMentions > 0
                        ? getTotalUnreads().totalMentions
                        : null
                    }
                    color="error"
                  >
                    {team.display_name}
                  </Badge>
                }
                value={team.id}
              />
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
                      primary={
                        <Badge
                          badgeContent={
                            getTotalUnreads().totalMentions > 0
                              ? getTotalUnreads().totalMentions
                              : null
                          }
                          color="error"
                        >
                          {team.display_name}
                        </Badge>
                      }
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
                  highlightMessageId={highlightMessageId}
                />
              </Box>

              <Box>
                <MessageComposer
                  channelId={selectedChannel.id}
                  placeholder={`Message ${selectedChannel.display_name}`}
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
              <Typography variant="body2" component="div" gutterBottom>
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
