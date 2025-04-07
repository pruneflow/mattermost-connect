// examples/demo/src/App.tsx
import React, { useState, useEffect } from "react";
import {
  MattermostProvider,
  MattermostThemeProvider,
  ChannelList,
  ChannelViewer,
  MessageComposer,
  useMattermost,
  MattermostAPI,
  Channel,
  Team,
} from "mattermost-connect";

// Material-UI Components
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  TextField,
  Paper,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Alert,
  Drawer,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Tab,
  Tabs,
} from "@mui/material";

// Material-UI Icons
import {
  Menu as MenuIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  ExitToApp as ExternalLinkIcon,
} from "@mui/icons-material";

// Create mock service
import createMockService from "./mockService";

// Login form component
const LoginForm: React.FC<{
  onLogin: (mode: "direct" | "proxy", credentials: any) => void;
}> = ({ onLogin }) => {
  const [mode, setMode] = useState<"direct" | "proxy">("direct");
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [proxyUrl, setProxyUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useToken, setUseToken] = useState(false);

  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMode(event.target.value as "direct" | "proxy");
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "direct") {
        if (useToken) {
          if (!serverUrl || !token) {
            throw new Error("Server URL and token are required");
          }
          onLogin("direct", { serverUrl, token });
        } else {
          if (!serverUrl || !username || !password) {
            throw new Error("Server URL, username and password are required");
          }

          // Generate token from credentials
          const generatedToken = await MattermostAPI.createUserToken({
            serverUrl,
            username,
            password,
          });

          onLogin("direct", { serverUrl, token: generatedToken });
        }
      } else {
        if (!proxyUrl || !clientId) {
          throw new Error("Proxy URL and Client ID are required");
        }
        onLogin("proxy", { proxyUrl, clientId, userId });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 500, mx: "auto", mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Connect to Mattermost
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <RadioGroup name="mode" value={mode} onChange={handleModeChange}>
            <FormControlLabel
              value="direct"
              control={<Radio />}
              label="Direct Mode"
            />
            <FormControlLabel
              value="proxy"
              control={<Radio />}
              label="Proxy Mode"
            />
          </RadioGroup>
        </FormControl>

        {mode === "direct" ? (
          <>
            <TextField
              label="Server URL"
              fullWidth
              margin="normal"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://mattermost.example.com"
              required
              disabled={loading}
            />

            <FormControlLabel
              control={
                <Radio
                  checked={useToken}
                  onChange={() => setUseToken(!useToken)}
                  disabled={loading}
                />
              }
              label="Use Personal Access Token"
            />

            {useToken ? (
              <TextField
                label="Personal Access Token"
                fullWidth
                margin="normal"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                type="password"
                required
                disabled={loading}
              />
            ) : (
              <>
                <TextField
                  label="Username or Email"
                  fullWidth
                  margin="normal"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                />
                <TextField
                  label="Password"
                  fullWidth
                  margin="normal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  disabled={loading}
                />
              </>
            )}
          </>
        ) : (
          <>
            <TextField
              label="Proxy URL"
              fullWidth
              margin="normal"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="https://proxy.example.com"
              required
              disabled={loading}
            />
            <TextField
              label="Client ID"
              fullWidth
              margin="normal"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              disabled={loading}
            />
            <TextField
              label="User ID (optional)"
              fullWidth
              margin="normal"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={loading}
            />
          </>
        )}

        <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
          <Button
            variant="outlined"
            onClick={() => onLogin("direct", { useMockService: true })}
            disabled={loading}
            startIcon={<ExternalLinkIcon />}
          >
            Demo Mode
          </Button>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
          >
            {loading ? "Connecting..." : "Connect"}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

// Main app interface once connected
const MattermostInterface: React.FC<{
  onLogout: () => void;
}> = ({ onLogout }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { isConnected, currentUser, getTeams, error, mode } = useMattermost();

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);

  // Load teams when component mounts
  useEffect(() => {
    if (isConnected) {
      const fetchTeams = async () => {
        try {
          const teamsData = await getTeams();
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
  }, [isConnected, getTeams]);

  // Close drawer on mobile when a channel is selected
  useEffect(() => {
    if (isMobile && selectedChannel) {
      setDrawerOpen(false);
    }
  }, [selectedChannel, isMobile]);

  // Auto-close drawer when switching to mobile
  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    } else {
      setDrawerOpen(true);
    }
  }, [isMobile]);

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
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

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
        <Button variant="outlined" onClick={onLogout}>
          Back to Login
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* App bar */}
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={toggleDrawer}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MattermostConnect Demo
          </Typography>

          {currentUser && (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography variant="body2" sx={{ mr: 2 }}>
                {currentUser.first_name} {currentUser.last_name}
              </Typography>
              <Tooltip title="Logout">
                <IconButton color="inherit" onClick={onLogout}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Toolbar>

        {/* Team tabs */}
        {teams.length > 0 && (
          <Tabs
            value={selectedTeam?.id || ""}
            onChange={handleTeamChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ bgcolor: "primary.dark" }}
          >
            {teams.map((team) => (
              <Tab
                key={team.id}
                label={team.display_name}
                value={team.id}
                sx={{ color: "white" }}
              />
            ))}
          </Tabs>
        )}
      </AppBar>

      {/* Main content */}
      <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
        {/* Channel sidebar - Responsive drawer on mobile */}
        <Drawer
          variant={isMobile ? "temporary" : "persistent"}
          open={drawerOpen}
          onClose={toggleDrawer}
          sx={{
            width: 280,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: 280,
              boxSizing: "border-box",
              position: isMobile ? "fixed" : "relative",
            },
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
              <Typography variant="body2">No teams available</Typography>
            </Box>
          )}
        </Drawer>

        {/* Messages area */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
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

              {!isMobile && !drawerOpen && (
                <Button
                  variant="outlined"
                  onClick={toggleDrawer}
                  startIcon={<MenuIcon />}
                  sx={{ mt: 2 }}
                >
                  Show Channels
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Status footer */}
      <Box
        sx={{
          p: 1,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Mode: {mode === "custom" ? "Demo (Mock Data)" : mode}
        </Typography>

        <Typography variant="caption" color="text.secondary">
          MattermostConnect Demo v1.0.0
        </Typography>
      </Box>
    </Box>
  );
};

// Main App component
const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authConfig, setAuthConfig] = useState<any>(null);

  const handleLogin = (mode: "direct" | "proxy", credentials: any) => {
    setAuthConfig({
      mode,
      ...credentials,
    });
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthConfig(null);
  };

  return (
    <MattermostThemeProvider>
      {!isAuthenticated ? (
        <Container>
          <Box sx={{ my: 4, textAlign: "center" }}>
            <Typography variant="h4" component="h1" gutterBottom>
              MattermostConnect Demo
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" paragraph>
              A modern React component library for Mattermost integration
            </Typography>
          </Box>

          <LoginForm onLogin={handleLogin} />
        </Container>
      ) : (
        <MattermostProvider
          // Direct mode props
          serverUrl={
            authConfig.mode === "direct" ? authConfig.serverUrl : undefined
          }
          token={authConfig.mode === "direct" ? authConfig.token : undefined}
          // Proxy mode props
          proxyUrl={
            authConfig.mode === "proxy" ? authConfig.proxyUrl : undefined
          }
          clientId={
            authConfig.mode === "proxy" ? authConfig.clientId : undefined
          }
          userId={authConfig.mode === "proxy" ? authConfig.userId : undefined}
          // Demo mode props
          serviceProvider={
            authConfig.useMockService
              ? {
                  setupService: createMockService,
                  isConnected: true,
                }
              : undefined
          }
          // Common options
          enableWebsocket={true}
        >
          <MattermostInterface onLogout={handleLogout} />
        </MattermostProvider>
      )}
    </MattermostThemeProvider>
  );
};

export default App;
