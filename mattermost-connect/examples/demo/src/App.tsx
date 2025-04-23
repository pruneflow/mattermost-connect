import React, { useState } from "react";
// Material-UI Components
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Paper,
  FormControl,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel,
  FormControlLabel,
  Switch,
  Divider,
} from "@mui/material";

// Import examples
import ClassicInterface from "./examples/ClassicInterface";

// Imports for MattermostConnect library
import {
  MattermostProvider,
  MattermostThemeProvider,
  useAuth,
  useConnection,
  useMattermost,
} from "mattermost-connect";
import createMockService from "./mockService";

// Configuration for different connection modes
const MODES = {
  DIRECT: "direct",
  PROXY: "proxy",
  MOCK: "mock",
};

// Authentication UI component - uses the useAuth hook from MattermostConnect
const AuthenticationUI: React.FC = () => {
  // Get context from MattermostConnect
  const { login, isAuthenticating, error } = useAuth();
  const { isServiceConfigured, updateServiceConfig, mode } = useMattermost();

  // Connection mode and configuration state
  const [connectionMode, setConnectionMode] = useState(MODES.MOCK);

  // Direct mode fields
  const [serverUrl, setServerUrl] = useState("http://localhost:8065");
  const [useTokenAuth, setUseTokenAuth] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");

  // Proxy mode fields
  const [proxyUrl, setProxyUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [userId, setUserId] = useState("");

  // Handle form submission for authentication
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      switch (connectionMode) {
        case MODES.DIRECT:
          // If service is not configured, update the configuration first
          if (!isServiceConfigured || mode !== "direct") {
            updateServiceConfig({
              serverUrl,
              // Don't set token here - it will be set by the login method
              proxyUrl: undefined,
              clientId: undefined,
              userId: undefined,
              serviceProvider: undefined,
            });
          }

          if (useTokenAuth) {
            // Token-based authentication
            if (!token) {
              throw new Error("Token is required");
            }

            // Login with token
            await login(username, password, {
              serverUrl,
              token,
            });
          } else {
            // Username/password authentication
            if (!username || !password) {
              throw new Error("Username and password are required");
            }

            // Login with credentials
            await login(username, password, {
              serverUrl,
            });
          }
          break;

        case MODES.PROXY:
          // If service is not configured, update the configuration first
          if (!isServiceConfigured || mode !== "proxy") {
            updateServiceConfig({
              serverUrl: undefined,
              token: undefined,
              proxyUrl,
              clientId,
              userId,
              serviceProvider: undefined,
            });
          }

          // For proxy mode, we just need to make sure the configuration is updated
          // The actual authentication is handled by the login method
          await login(username, password, {
            proxyUrl,
            clientId,
            userId,
          });
          break;

        case MODES.MOCK:
          // For mock mode, we need to configure the service provider
          if (!isServiceConfigured || mode !== "custom") {
            updateServiceConfig({
              serverUrl: undefined,
              token: undefined,
              proxyUrl: undefined,
              clientId: undefined,
              userId: undefined,
              serviceProvider: {
                setupService: createMockService,
                isConnected: true,
                skipConnectionTest: true,
                currentUser: {
                  id: "user1",
                  username: "johndoe",
                  first_name: "John",
                  last_name: "Doe",
                  email: "john@example.com",
                  roles: "system_user",
                  update_at: Date.now(),
                },
              },
            });
          }

          // For mock mode, we don't need actual authentication
          // Just trigger login to update the auth state
          await login("demo", "demo");
          break;
      }
    } catch (err) {
      console.error("Authentication error:", err);
    }
  };

  // Determine the title based on the connection mode
  const getTitle = () => {
    switch (connectionMode) {
      case MODES.DIRECT:
        return "Connect to Mattermost";
      case MODES.PROXY:
        return "Proxy Authentication";
      case MODES.MOCK:
        return "Demo Mode";
      default:
        return "Authentication";
    }
  };

  // In mock mode, authentication can be automatic
  if (connectionMode === MODES.MOCK && isAuthenticating) {
    return (
      <Container maxWidth="xs">
        <Paper elevation={3} sx={{ p: 3, mt: 8, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            {getTitle()}
          </Typography>
          <CircularProgress sx={{ my: 2 }} />
          <Typography>Setting up demo environment...</Typography>
        </Paper>
      </Container>
    );
  }

  // Render the appropriate form fields based on connection mode
  const renderModeSpecificFields = () => {
    switch (connectionMode) {
      case MODES.DIRECT:
        return (
          <>
            <TextField
              fullWidth
              label="Mattermost Server URL"
              variant="outlined"
              margin="normal"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://mattermost.example.com"
              required
            />

            <FormControlLabel
              control={
                <Switch
                  checked={useTokenAuth}
                  onChange={(e) => setUseTokenAuth(e.target.checked)}
                  color="primary"
                />
              }
              label="Use Personal Access Token"
              sx={{ my: 1 }}
            />

            {useTokenAuth ? (
              <TextField
                fullWidth
                label="Personal Access Token"
                variant="outlined"
                margin="normal"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            ) : (
              <>
                <TextField
                  fullWidth
                  label="Username or Email"
                  variant="outlined"
                  margin="normal"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  variant="outlined"
                  margin="normal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </>
            )}
          </>
        );

      case MODES.PROXY:
        return (
          <>
            <TextField
              fullWidth
              label="Proxy URL"
              variant="outlined"
              margin="normal"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="https://proxy.example.com"
              required
            />
            <TextField
              fullWidth
              label="Client ID"
              variant="outlined"
              margin="normal"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="User ID (optional)"
              variant="outlined"
              margin="normal"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </>
        );

      case MODES.MOCK:
        return (
          <Alert severity="info" sx={{ mt: 2 }}>
            Demo mode uses simulated data for testing without a real server
            connection. No credentials required - just click "Login" to
            continue.
          </Alert>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper elevation={3} sx={{ p: 3, mt: 8 }}>
        <Typography variant="h5" align="center" gutterBottom>
          {getTitle()}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Connection Mode</InputLabel>
            <Select
              value={connectionMode}
              label="Connection Mode"
              onChange={(e) => setConnectionMode(e.target.value)}
            >
              <MenuItem value={MODES.DIRECT}>Direct Connection</MenuItem>
              <MenuItem value={MODES.PROXY}>Proxy Connection</MenuItem>
              <MenuItem value={MODES.MOCK}>Demo Mode</MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          {renderModeSpecificFields()}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={isAuthenticating}
            sx={{ mt: 3, mb: 2 }}
          >
            {isAuthenticating ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Login"
            )}
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

// The main application container - shown when authenticated
const AuthenticatedApp: React.FC = () => {
  const { logout } = useAuth();
  const { isConnected } = useConnection();
  const { mode } = useMattermost();

  // Wait for connection to be established
  if (!isConnected) {
    return (
      <Container maxWidth="sm">
        <Paper sx={{ p: 3, mt: 8, textAlign: "center" }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>Connecting to Mattermost server...</Typography>
        </Paper>
      </Container>
    );
  }

  return <ClassicInterface onLogout={logout} />;
};

// Content switcher based on authentication state
const MattermostContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <AuthenticatedApp /> : <AuthenticationUI />;
};

// Main application component
const App: React.FC = () => {
  return (
    <MattermostThemeProvider>
      <MattermostProvider
        // Default empty configuration - will be updated by AuthenticationUI
        enableWebsocket={true}
        refreshInterval={300000}
        useLocalStorage={true}
      >
        <MattermostContent />
      </MattermostProvider>
    </MattermostThemeProvider>
  );
};

export default App;
