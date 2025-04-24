// examples/demo/src/components/AuthenticationUI.tsx
import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Link,
  Divider,
  TextField,
  FormControl,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  Alert,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

// Types for auth methods
type AuthMode = "direct" | "proxy" | "demo";

interface AuthenticationProps {
  onSuccess: (result: any) => void;
  onError: (error: Error) => void;
}

/**
 * Authentication UI component
 * Provides a unified login interface with support for direct, proxy, and demo modes
 */
const AuthenticationUI: React.FC<AuthenticationProps> = ({
  onSuccess,
  onError,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<number>(0);
  const [authMode, setAuthMode] = useState<AuthMode>("direct");
  const [serverUrl, setServerUrl] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [proxyUrl, setProxyUrl] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setAuthMode(newValue === 0 ? "direct" : newValue === 1 ? "proxy" : "demo");
  };

  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Fill demo credentials
  const handleFillDemoCredentials = () => {
    if (authMode === "direct") {
      setServerUrl("https://mattermost.example.com");
      setUsername("demouser");
      setPassword("password123");
    } else if (authMode === "proxy") {
      setProxyUrl("https://proxy.example.com");
      setClientId("demo_client_123");
      setUsername("demouser");
      setPassword("password123");
    }
  };

  // Handle login form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate login for demo purposes
      if (authMode === "demo") {
        // Simulate successful demo login
        setTimeout(() => {
          setIsLoading(false);
          onSuccess({
            mode: "demo",
            user: {
              id: "demo_user_1",
              username: "demouser",
              first_name: "Demo",
              last_name: "User",
              email: "demo@example.com",
              update_at: Date.now(),
            },
          });
        }, 1500);
        return;
      }

      // Simulate direct mode login
      if (authMode === "direct") {
        if (!serverUrl || !username || !password) {
          throw new Error("Server URL, username, and password are required");
        }

        setIsLoading(true);

        try {
          // Construire l'URL d'authentification
          const loginUrl = `${serverUrl}/api/v4/users/login`;

          // Faire une vraie requête d'authentification
          const response = await fetch(loginUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              login_id: username,
              password: password,
            }),
          });

          if (!response.ok) {
            throw new Error(`Authentication failed: ${response.statusText}`);
          }

          // Récupérer le token depuis les headers
          const token = response.headers.get("Token");

          // Récupérer les données utilisateur depuis le corps de la réponse
          const userData = await response.json();

          // Informer le parent du succès de l'authentification avec le vrai token et les vraies données
          onSuccess({
            mode: "direct",
            serverUrl,
            token,
            user: userData,
          });
        } catch (error) {
          setIsLoading(false);
          const errorMessage =
            error instanceof Error ? error.message : "Authentication failed";
          setError(errorMessage);
          onError(error instanceof Error ? error : new Error(errorMessage));
        }

        return;
      }

      // Simulate proxy mode login
      if (authMode === "proxy") {
        if (!proxyUrl || !clientId || !username || !password) {
          throw new Error(
            "Proxy URL, client ID, username, and password are required",
          );
        }

        // Simulate API call to proxy service
        setTimeout(() => {
          setIsLoading(false);
          // For demo purposes, always succeed with proxy mode
          onSuccess({
            mode: "proxy",
            proxyUrl,
            clientId,
            token: "simulated_token_" + Math.random().toString(36).substring(7),
            user: {
              id: "proxy_user_1",
              username,
              first_name: "Proxy",
              last_name: "User",
              email: `${username}@example.com`,
              update_at: Date.now(),
            },
          });
        }, 1500);

        return;
      }
    } catch (err) {
      setIsLoading(false);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      onError(err instanceof Error ? err : new Error(errorMessage));
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        p: 2,
        bgcolor: "background.default",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 480,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Direct Mode" />
          <Tab label="Proxy Mode" />
          <Tab label="Demo Mode" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom fontWeight="medium">
            {activeTab === 0
              ? "Connect to Mattermost Server"
              : activeTab === 1
                ? "Connect via Proxy"
                : "Launch Demo Mode"}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* Direct Mode Fields */}
            {activeTab === 0 && (
              <>
                <TextField
                  label="Server URL"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  placeholder="https://mattermost.example.com"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography variant="body2" color="text.secondary">
                          🔗
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Username"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <TextField
                  label="Password"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                  }
                  label="Remember me"
                  sx={{ mt: 1 }}
                />
              </>
            )}

            {/* Proxy Mode Fields */}
            {activeTab === 1 && (
              <>
                <TextField
                  label="Proxy URL"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  placeholder="https://proxy.example.com"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography variant="body2" color="text.secondary">
                          🔗
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Client ID"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                />
                <TextField
                  label="Username"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <TextField
                  label="Password"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                  }
                  label="Remember me"
                  sx={{ mt: 1 }}
                />
              </>
            )}

            {/* Demo Mode Description */}
            {activeTab === 2 && (
              <Box sx={{ my: 2 }}>
                <Typography variant="body1" paragraph>
                  Demo mode uses mock data to demonstrate the functionality of
                  the MattermostConnect library without requiring an actual
                  Mattermost server.
                </Typography>
                <Typography variant="body1">
                  This mode is perfect for:
                </Typography>
                <ul>
                  <li>
                    <Typography variant="body1">
                      Testing and exploring the UI components
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body1">
                      Demonstrating features to stakeholders
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body1">
                      Development and debugging without a server
                    </Typography>
                  </li>
                </ul>
              </Box>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              color="primary"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading
                ? "Connecting..."
                : activeTab === 0
                  ? "Connect to Server"
                  : activeTab === 1
                    ? "Connect via Proxy"
                    : "Launch Demo Mode"}
            </Button>
          </form>

          {/* Help Links */}
          {activeTab !== 2 && (
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Button
                variant="text"
                color="primary"
                size="small"
                onClick={handleFillDemoCredentials}
              >
                Fill Demo Credentials
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Need help?{" "}
                <Link href="#" underline="hover">
                  View Documentation
                </Link>
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
        MattermostConnect Demo Application
      </Typography>
    </Box>
  );
};

export default AuthenticationUI;
