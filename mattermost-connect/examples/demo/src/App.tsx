import React, { useState, useCallback, useEffect } from "react";
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
} from "@mui/material";

// Import examples
import ClassicInterface from "./examples/ClassicInterface";

// Imports from our library
import {
  MattermostProvider,
  MattermostThemeProvider,
  useConnection,
  useMattermost,
  useAuth,
  createServiceContainer,
} from "mattermost-connect";
import createMockService from "./mockService";

// Connection modes configuration
const MODES = {
  DIRECT: "direct",
  PROXY: "proxy",
  MOCK: "mock",
};

// Interface for login credentials
interface LoginFormState {
  mode: string;
  serverUrl: string;
  username: string;
  password: string;
  token: string;
  proxyUrl: string;
  clientId: string;
  userId: string;
}

// Login form component
const LoginForm: React.FC<{
  onSubmit: (data: LoginFormState) => Promise<void>;
  loading: boolean;
  error: string | null;
}> = ({ onSubmit, loading, error }) => {
  // Form state
  const [formState, setFormState] = useState<LoginFormState>({
    mode: MODES.MOCK, // Default to MOCK mode for demo
    serverUrl: "http://localhost:8065",
    username: "",
    password: "",
    token: "",
    proxyUrl: "",
    clientId: "",
    userId: "",
  });

  // Handle field changes
  const handleChange =
    (field: keyof LoginFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
      setFormState((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(formState);
  };

  // Render mode-specific fields
  const renderModeSpecificFields = () => {
    switch (formState.mode) {
      case MODES.DIRECT:
        return (
          <>
            <TextField
              fullWidth
              label="URL du serveur Mattermost"
              variant="outlined"
              margin="normal"
              value={formState.serverUrl}
              onChange={handleChange("serverUrl")}
              placeholder="https://mattermost.votreentreprise.com"
              required
            />
            <TextField
              fullWidth
              label="Nom d'utilisateur"
              variant="outlined"
              margin="normal"
              value={formState.username}
              onChange={handleChange("username")}
              required={!formState.token}
            />
            <TextField
              fullWidth
              label="Mot de passe"
              type="password"
              variant="outlined"
              margin="normal"
              value={formState.password}
              onChange={handleChange("password")}
              required={!formState.token}
            />
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              OU
            </Typography>
            <TextField
              fullWidth
              label="Token d'accès personnel"
              variant="outlined"
              margin="normal"
              value={formState.token}
              onChange={handleChange("token")}
              required={!formState.username || !formState.password}
              helperText="Si un token est fourni, il sera utilisé à la place des identifiants"
            />
          </>
        );

      case MODES.PROXY:
        return (
          <>
            <TextField
              fullWidth
              label="URL du proxy Mattermost"
              variant="outlined"
              margin="normal"
              value={formState.proxyUrl}
              onChange={handleChange("proxyUrl")}
              placeholder="https://proxy.votreentreprise.com"
              required
            />
            <TextField
              fullWidth
              label="Client ID"
              variant="outlined"
              margin="normal"
              value={formState.clientId}
              onChange={handleChange("clientId")}
              required
            />
            <TextField
              fullWidth
              label="User ID (optionnel)"
              variant="outlined"
              margin="normal"
              value={formState.userId}
              onChange={handleChange("userId")}
            />
          </>
        );

      case MODES.MOCK:
        return (
          <Alert severity="info" sx={{ width: "100%", mt: 2 }}>
            Le mode Démo utilise des données simulées pour tester l'interface
            sans connexion à un serveur réel.
          </Alert>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper
        elevation={3}
        sx={{
          padding: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <Typography variant="h4" component="div">
          Connexion à Mattermost
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: "100%", mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          <FormControl fullWidth margin="normal" variant="outlined">
            <InputLabel>Mode de connexion</InputLabel>
            <Select
              value={formState.mode}
              label="Mode de connexion"
              onChange={(e) => handleChange("mode")(e)}
            >
              <MenuItem value={MODES.DIRECT}>Connexion Directe</MenuItem>
              <MenuItem value={MODES.PROXY}>Connexion via Proxy</MenuItem>
              <MenuItem value={MODES.MOCK}>Mode Démo</MenuItem>
            </Select>
          </FormControl>

          {renderModeSpecificFields()}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ mt: 3, mb: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : "Se connecter"}
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

// Footer showing connection info
const ConnectionFooter: React.FC = () => {
  const { mode } = useMattermost();

  return (
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
      <Typography variant="caption" component="div" color="text.secondary">
        Mode: {mode === "custom" ? "Demo (Mock Data)" : mode || "Non configuré"}
      </Typography>

      <Typography variant="caption" component="div" color="text.secondary">
        MattermostConnect Demo v1.0.0
      </Typography>
    </Box>
  );
};

// Main authenticated application component
// This is where we use the useAuth hook to react to authentication state
const AuthenticatedApp: React.FC = () => {
  // Get authentication state and methods from the context
  const { isAuthenticated, login, logout, currentUser } = useAuth();
  const { mode, hasCompleteConfig } = useMattermost();

  // Local state for login form
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle login form submission
  const handleLogin = async (formData: LoginFormState) => {
    setLoading(true);
    setError(null);

    try {
      let success = false;

      // Handle different authentication methods based on form data
      switch (formData.mode) {
        case MODES.DIRECT:
          if (formData.token) {
            // Direct mode with token
            success = await login({
              mode: "direct",
              token: formData.token,
              serverUrl: formData.serverUrl,
            });
          } else if (formData.username && formData.password) {
            // Direct mode with username/password
            success = await login({
              mode: "direct",
              username: formData.username,
              password: formData.password,
              serverUrl: formData.serverUrl,
            });
          } else {
            throw new Error(
              "Veuillez fournir un token ou des identifiants de connexion",
            );
          }
          break;

        case MODES.PROXY:
          if (!formData.proxyUrl || !formData.clientId) {
            throw new Error("L'URL du proxy et l'ID client sont requis");
          }

          success = await login({
            mode: "proxy",
            proxyUrl: formData.proxyUrl,
            clientId: formData.clientId,
            userId: formData.userId || undefined,
          });
          break;

        case MODES.MOCK:
          // In mock mode, we just update the configuration and let the AuthProvider handle it
          success = await login({
            mode: "mock",
          });
          break;
      }

      if (!success) {
        throw new Error("Échec de l'authentification");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la connexion",
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {isAuthenticated ? (
        // Authenticated UI
        <>
          <ClassicInterface onLogout={handleLogout} />
          <ConnectionFooter />
        </>
      ) : (
        // Login form when not authenticated
        <>
          <LoginForm onSubmit={handleLogin} loading={loading} error={error} />
          <ConnectionFooter />
        </>
      )}
    </Box>
  );
};

// The main application component
// This just wraps everything in the providers and doesn't manage authentication state
const App: React.FC = () => {
  return (
    <MattermostThemeProvider>
      <MattermostProvider
        // Initial configuration would go here
        // For example:
        // serverUrl="https://your-mattermost-server.com"
        // token={localStorage.getItem("mattermost_token") || undefined}
        useLocalStorage={true}
        tokenStorageKey="mattermost_token"
        onAuthSuccess={(user) =>
          console.log("Authenticated as:", user.username)
        }
        onAuthError={(error) => console.error("Authentication error:", error)}
      >
        <AuthenticatedApp />
      </MattermostProvider>
    </MattermostThemeProvider>
  );
};

export default App;
