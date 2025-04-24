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
  TextField,
  FormControl,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

// Import des hooks de MattermostConnect pour l'authentification
import {
  MattermostDirectProvider,
  MattermostProxyProvider,
  useAuth,
  User,
} from "mattermost-connect";

// Types pour les modes d'authentification
type AuthMode = "direct" | "proxy" | "demo";

interface AuthenticationProps {
  onSuccess: (result: any) => void;
  onError: (error: Error) => void;
}

/**
 * Component d'authentification interne utilisé à l'intérieur des providers
 */
const AuthProvider: React.FC<{
  mode: "direct" | "proxy";
  serverUrl?: string;
  proxyUrl?: string;
  clientId?: string;
  username: string;
  password: string;
  onSuccess: (result: any) => void;
  onError: (error: Error) => void;
}> = ({
  mode,
  serverUrl,
  proxyUrl,
  clientId,
  username,
  password,
  onSuccess,
  onError,
}) => {
  const { login, isAuthenticating, error, currentUser, isAuthenticated } =
    useAuth();
  const [loginAttempted, setLoginAttempted] = useState(false);
  const [successReported, setSuccessReported] = useState(false);

  // Effet unique pour la tentative d'authentification au montage
  React.useEffect(() => {
    // Ne tenter l'authentification qu'une seule fois
    if (!loginAttempted && !isAuthenticated) {
      setLoginAttempted(true);

      const authenticate = async () => {
        try {
          console.log("Attempting login with:", { username, mode, serverUrl });

          // Utiliser le hook useAuth pour l'authentification
          const user = await login({
            username,
            password,
            serverUrl: mode === "direct" ? serverUrl : undefined,
          });

          console.log("Login successful:", user);

          // Marquer le succès pour éviter de rappeler onSuccess
          setSuccessReported(true);

          // Passer les informations d'authentification au parent
          onSuccess({
            mode,
            serverUrl: mode === "direct" ? serverUrl : undefined,
            proxyUrl: mode === "proxy" ? proxyUrl : undefined,
            clientId: mode === "proxy" ? clientId : undefined,
            token: localStorage.getItem("mattermost_token"),
            user,
          });
        } catch (err) {
          console.error("Login error:", err);
          onError(
            err instanceof Error ? err : new Error("Authentication failed"),
          );
        }
      };

      authenticate();
    }
  }, []); // Dépendances vides pour n'exécuter qu'au montage

  // Vérifier si déjà authentifié et rapporter le succès une seule fois
  React.useEffect(() => {
    if (isAuthenticated && currentUser && !successReported) {
      console.log("Already authenticated, reporting success");
      setSuccessReported(true);

      onSuccess({
        mode,
        serverUrl: mode === "direct" ? serverUrl : undefined,
        proxyUrl: mode === "proxy" ? proxyUrl : undefined,
        clientId: mode === "proxy" ? clientId : undefined,
        token: localStorage.getItem("mattermost_token"),
        user: currentUser,
      });
    }
  }, [isAuthenticated, currentUser, successReported]);

  // Afficher une erreur si l'authentification a échoué
  React.useEffect(() => {
    if (error && !successReported) {
      console.error("Auth error detected:", error);
      onError(error);
    }
  }, [error, successReported, onError]);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 3,
      }}
    >
      <CircularProgress />
      <Typography variant="body1" sx={{ ml: 2 }}>
        Authenticating...
      </Typography>
    </Box>
  );
};

/**
 * Composant principal d'interface d'authentification
 * Fournit une interface de connexion unifiée avec support pour les modes direct, proxy et démo
 */
const AuthenticationUI: React.FC<AuthenticationProps> = ({
  onSuccess,
  onError,
}) => {
  // État
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
  const [showAuth, setShowAuth] = useState<boolean>(false);

  // Changement d'onglet
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setAuthMode(newValue === 0 ? "direct" : newValue === 1 ? "proxy" : "demo");
    setShowAuth(false);
  };

  // Basculer la visibilité du mot de passe
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Remplir les identifiants de démo
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

  // Gérer la soumission du formulaire d'authentification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Vérification des champs obligatoires
      if (authMode === "direct" && (!serverUrl || !username || !password)) {
        throw new Error("Server URL, username, and password are required");
      }

      if (
        authMode === "proxy" &&
        (!proxyUrl || !clientId || !username || !password)
      ) {
        throw new Error(
          "Proxy URL, client ID, username, and password are required",
        );
      }

      // Mode démo
      if (authMode === "demo") {
        // Simuler une connexion démo réussie
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

      // Pour les autres modes, nous allons utiliser les providers avec notre hook useAuth
      setShowAuth(true);
    } catch (err) {
      setIsLoading(false);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      onError(err instanceof Error ? err : new Error(errorMessage));
    }
  };

  // Gérer les erreurs d'authentification
  const handleAuthError = (err: Error) => {
    setIsLoading(false);
    setShowAuth(false);
    setError(err.message);
    onError(err);
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
          {!showAuth ? (
            <>
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
                {/* Champs pour le mode direct */}
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
                              {showPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
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

                {/* Champs pour le mode proxy */}
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
                              {showPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
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

                {/* Description du mode démo */}
                {activeTab === 2 && (
                  <Box sx={{ my: 2 }}>
                    <Typography variant="body1" paragraph>
                      Demo mode uses mock data to demonstrate the functionality
                      of the MattermostConnect library without requiring an
                      actual Mattermost server.
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

                {/* Bouton de soumission */}
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

              {/* Liens d'aide */}
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
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2 }}
                  >
                    Need help?{" "}
                    <Link href="#" underline="hover">
                      View Documentation
                    </Link>
                  </Typography>
                </Box>
              )}
            </>
          ) : (
            // Mode d'authentification en cours
            <>
              {authMode === "direct" && (
                <MattermostDirectProvider
                  serverUrl={serverUrl}
                  enableWebSocket={false}
                  onAuthError={handleAuthError}
                >
                  <AuthProvider
                    mode="direct"
                    serverUrl={serverUrl}
                    username={username}
                    password={password}
                    onSuccess={onSuccess}
                    onError={handleAuthError}
                  />
                </MattermostDirectProvider>
              )}

              {authMode === "proxy" && (
                <MattermostProxyProvider
                  proxyUrl={proxyUrl}
                  clientId={clientId}
                  enableWebSocket={false}
                  onAuthError={handleAuthError}
                >
                  <AuthProvider
                    mode="proxy"
                    proxyUrl={proxyUrl}
                    clientId={clientId}
                    username={username}
                    password={password}
                    onSuccess={onSuccess}
                    onError={handleAuthError}
                  />
                </MattermostProxyProvider>
              )}
            </>
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
