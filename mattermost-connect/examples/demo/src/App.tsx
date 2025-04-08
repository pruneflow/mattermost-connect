// examples/demo/src/App.tsx
import React, { useState } from "react";
import {
  MattermostProvider,
  MattermostThemeProvider,
  useMattermost,
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
  Tabs,
  Tab,
  CircularProgress,
} from "@mui/material";

// Material-UI Icons
import {
  Login as LoginIcon,
  Logout as LogoutIcon,
  ExitToApp as ExternalLinkIcon,
} from "@mui/icons-material";

// Import examples
import ClassicInterface from "./examples/ClassicInterface";

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

          // In real app, generate token from credentials here
          onLogin("direct", { serverUrl, token: "mock-token" });
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

// Wrapper for examples with tab navigation
const ExamplesContainer: React.FC<{
  onLogout: () => void;
}> = ({ onLogout }) => {
  const { currentUser, mode } = useMattermost();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* App bar */}
      <AppBar position="static">
        <Toolbar>
          {currentUser && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body2">
                {currentUser.first_name} {currentUser.last_name}
              </Typography>
              <Button
                color="inherit"
                onClick={onLogout}
                startIcon={<LogoutIcon />}
                sx={{ float: "right" }}
              ></Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Example content */}
      <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
        <ClassicInterface />
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
          <ExamplesContainer onLogout={handleLogout} />
        </MattermostProvider>
      )}
    </MattermostThemeProvider>
  );
};

export default App;
