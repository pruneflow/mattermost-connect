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
} from "@mui/material";

// Import examples
import ClassicInterface from "./examples/ClassicInterface";

// Imports pour l'authentification
import {
  MattermostProvider,
  MattermostThemeProvider,
  useMattermost,
  createServiceContainer,
} from "mattermost-connect";
import createMockService from "./mockService";

// Configuration pour différents modes de connexion
const MODES = {
  DIRECT: "direct",
  PROXY: "proxy",
  MOCK: "mock",
};

// Interface pour les informations de connexion
interface LoginCredentials {
  mode: string;
  serverUrl?: string;
  token?: string;
  username?: string;
  password?: string;
  proxyUrl?: string;
  clientId?: string;
  userId?: string;
}

// Composant de formulaire de connexion
const LoginForm: React.FC<{
  onLogin: (credentials: LoginCredentials) => void;
}> = ({ onLogin }) => {
  const [mode, setMode] = useState(MODES.MOCK); // Définir MOCK comme mode par défaut
  const [serverUrl, setServerUrl] = useState("http://localhost:8065");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [proxyUrl, setProxyUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      switch (mode) {
        case MODES.DIRECT:
          if (token) {
            onLogin({
              mode: MODES.DIRECT,
              serverUrl,
              token,
            });
          } else if (username && password && serverUrl) {
            // Validation des champs
            if (!serverUrl) {
              throw new Error("L'URL du serveur est requise");
            }

            onLogin({
              mode: MODES.DIRECT,
              serverUrl,
              username,
              password,
            });
          } else {
            throw new Error(
              "Veuillez fournir un token ou des identifiants de connexion",
            );
          }
          break;

        case MODES.PROXY:
          if (!proxyUrl || !clientId) {
            throw new Error("L'URL du proxy et l'ID client sont requis");
          }

          onLogin({
            mode: MODES.PROXY,
            proxyUrl,
            clientId,
            userId,
          });
          break;

        case MODES.MOCK:
          // Aucune validation requise pour le mode mock
          onLogin({ mode: MODES.MOCK });
          break;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la connexion",
      );
    } finally {
      setLoading(false);
    }
  };

  // Rendu des champs spécifiques selon le mode
  const renderModeSpecificFields = () => {
    switch (mode) {
      case MODES.DIRECT:
        return (
          <>
            <TextField
              fullWidth
              label="URL du serveur Mattermost"
              variant="outlined"
              margin="normal"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://mattermost.votreentreprise.com"
              required
            />
            <TextField
              fullWidth
              label="Nom d'utilisateur"
              variant="outlined"
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required={!token}
            />
            <TextField
              fullWidth
              label="Mot de passe"
              type="password"
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!token}
            />
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              OU
            </Typography>
            <TextField
              fullWidth
              label="Token d'accès personnel"
              variant="outlined"
              margin="normal"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required={!username || !password}
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
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="https://proxy.votreentreprise.com"
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
              label="User ID (optionnel)"
              variant="outlined"
              margin="normal"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
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
              value={mode}
              label="Mode de connexion"
              onChange={(e) => setMode(e.target.value as string)}
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

// Wrapper for examples with tab navigation
const ExamplesContainer: React.FC<{
  onLogout: () => void;
}> = ({ onLogout }) => {
  const { currentUser, mode } = useMattermost();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Example content */}
      <ClassicInterface onLogout={onLogout} />

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
        <Typography variant="caption" component="div" color="text.secondary">
          Mode: {mode === "custom" ? "Demo (Mock Data)" : mode}
        </Typography>

        <Typography variant="caption" component="div" color="text.secondary">
          MattermostConnect Demo v1.0.0
        </Typography>
      </Box>
    </Box>
  );
};

// Composant principal de l'application
const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authConfig, setAuthConfig] = useState<LoginCredentials | null>(null);

  const handleLogin = async (credentials: LoginCredentials) => {
    setAuthConfig(credentials);

    if (
      credentials.mode === MODES.DIRECT &&
      credentials.username &&
      credentials.password &&
      credentials.serverUrl
    ) {
      // Pour le mode direct avec username/password, nous devons authentifier avant de définir isAuthenticated
      try {
        // Créer un service temporaire pour l'authentification
        const tempService = createServiceContainer({
          serverUrl: credentials.serverUrl,
        });

        if (tempService?.mattermostService?.authenticate) {
          const result = await tempService.mattermostService.authenticate(
            credentials.username,
            credentials.password,
          );

          // Mettre à jour les credentials avec le token obtenu
          setAuthConfig({
            ...credentials,
            token: result.token,
          });
        }
      } catch (error) {
        console.error("Erreur d'authentification:", error);
        // Ne pas définir isAuthenticated en cas d'erreur
        return;
      }
    }

    // Tout s'est bien passé, on est authentifié
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthConfig(null);
  };

  // Rendu du composant de connexion ou de l'interface principale
  return (
    <MattermostThemeProvider>
      {!isAuthenticated ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <MattermostProvider
          // Configuration directe
          serverUrl={
            authConfig?.mode === MODES.DIRECT ? authConfig.serverUrl : undefined
          }
          token={
            authConfig?.mode === MODES.DIRECT ? authConfig.token : undefined
          }
          // Configuration proxy
          proxyUrl={
            authConfig?.mode === MODES.PROXY ? authConfig.proxyUrl : undefined
          }
          clientId={
            authConfig?.mode === MODES.PROXY ? authConfig.clientId : undefined
          }
          userId={
            authConfig?.mode === MODES.PROXY ? authConfig.userId : undefined
          }
          // Configuration mock
          serviceProvider={
            authConfig?.mode === MODES.MOCK
              ? {
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
                }
              : undefined
          }
          // Options communes
          enableWebsocket={true}
        >
          {/* Votre interface principale après connexion */}
          <ExamplesContainer onLogout={handleLogout} />
        </MattermostProvider>
      )}
    </MattermostThemeProvider>
  );
};

export default App;
