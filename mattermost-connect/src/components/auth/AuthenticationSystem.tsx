// src/components/auth/AuthenticationSystem.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Stack,
  FormControlLabel,
  Checkbox,
  IconButton,
  InputAdornment,
  Link,
  Divider,
  SxProps,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { useMattermost } from "../../context";

/**
 * Types d'authentification supportés
 */
type AuthType = "direct" | "proxy" | "token";

/**
 * Props pour le composant d'authentification
 */
interface AuthenticationSystemProps {
  /** Types d'authentification à afficher (défaut: tous) */
  authTypes?: AuthType[];

  /** Type d'authentification par défaut */
  defaultAuthType?: AuthType;

  /** URL du serveur par défaut pour le mode direct */
  defaultServerUrl?: string;

  /** Label pour le bouton de connexion */
  loginButtonLabel?: string;

  /** Titre du formulaire d'authentification */
  title?: string;

  /** Si vrai, se souvient des identifiants entre les sessions */
  rememberCredentials?: boolean;

  /** Si vrai, masque le formulaire quand l'utilisateur est connecté */
  hideWhenAuthenticated?: boolean;

  /** Callback appelé après une connexion réussie */
  onLoginSuccess?: (token: string) => void;

  /** Callback appelé en cas d'échec de connexion */
  onLoginError?: (error: Error) => void;

  /** Styles personnalisés pour le composant Card */
  sx?: SxProps;

  /** Classes CSS personnalisées */
  className?: string;
}

/**
 * Composant de système d'authentification pour Mattermost
 * Prend en charge les modes direct (serveur), proxy et token
 */
const AuthenticationSystem: React.FC<AuthenticationSystemProps> = ({
  authTypes = ["direct", "proxy", "token"],
  defaultAuthType = "direct",
  defaultServerUrl = "",
  loginButtonLabel = "Se connecter",
  title = "Connexion à Mattermost",
  rememberCredentials = true,
  hideWhenAuthenticated = true,
  onLoginSuccess,
  onLoginError,
  sx,
  className,
}) => {
  // Hooks pour l'authentification et l'état Mattermost
  const {
    login,
    isAuthenticating,
    error: authError,
  } = useAuth({
    onAuthSuccess: onLoginSuccess,
    onAuthError: onLoginError,
    storeToken: rememberCredentials,
  });
  const { isConnected, currentUser } = useMattermost();

  // État du formulaire
  const [authType, setAuthType] = useState<AuthType>(defaultAuthType);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [serverUrl, setServerUrl] = useState(defaultServerUrl);
  const [token, setToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(rememberCredentials);
  const [error, setError] = useState<string | null>(null);

  // Chargement des identifiants stockés
  useEffect(() => {
    if (rememberCredentials) {
      const storedUsername = localStorage.getItem("mattermost_username");
      const storedServer = localStorage.getItem("mattermost_server");

      if (storedUsername) {
        setUsername(storedUsername);
      }

      if (storedServer) {
        setServerUrl(storedServer);
      }
    }
  }, [rememberCredentials]);

  // Réinitialiser l'erreur lorsqu'un champ est modifié
  useEffect(() => {
    setError(null);
  }, [username, password, serverUrl, token, authType]);

  // Convertir l'erreur d'authentification en message d'erreur
  useEffect(() => {
    if (authError) {
      setError(authError.message);
    }
  }, [authError]);

  // Fonction de soumission du formulaire
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Valider les champs requis selon le type d'authentification
      if (authType === "direct") {
        if (!username.trim() || !password.trim() || !serverUrl.trim()) {
          setError("Veuillez remplir tous les champs");
          return;
        }

        // Valider le format de l'URL du serveur
        try {
          new URL(serverUrl);
        } catch {
          setError("URL du serveur invalide");
          return;
        }
      } else if (authType === "proxy") {
        if (!username.trim() || !password.trim()) {
          setError("Veuillez remplir tous les champs");
          return;
        }
      } else if (authType === "token") {
        if (!token.trim() || !serverUrl.trim()) {
          setError("Veuillez remplir tous les champs");
          return;
        }

        // Valider le format de l'URL du serveur
        try {
          new URL(serverUrl);
        } catch {
          setError("URL du serveur invalide");
          return;
        }
      }

      try {
        // Stocker les identifiants si "Se souvenir de moi" est coché
        if (remember) {
          localStorage.setItem("mattermost_username", username);

          if (authType === "direct" || authType === "token") {
            localStorage.setItem("mattermost_server", serverUrl);
          }
        }

        // Gérer chaque type d'authentification
        if (authType === "direct" || authType === "proxy") {
          await login(username, password);
        } else if (authType === "token") {
          // Pour le mode token, nous ne pouvons pas faire l'authentification ici
          // car le token est utilisé lors de l'initialisation du MattermostProvider
          setError("Le mode token nécessite une reconfiguration du provider");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);

        if (onLoginError) {
          onLoginError(err instanceof Error ? err : new Error(errorMessage));
        }
      }
    },
    [
      authType,
      username,
      password,
      serverUrl,
      token,
      remember,
      login,
      onLoginError,
    ],
  );

  // Gérer le basculement d'affichage du mot de passe
  const handleTogglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  // Si l'utilisateur est connecté et hideWhenAuthenticated est vrai, masquer le formulaire
  if (isConnected && currentUser && hideWhenAuthenticated) {
    return (
      <Box className={className} sx={sx}>
        <Card elevation={3}>
          <CardContent>
            <Typography variant="h6" gutterBottom align="center">
              Connecté en tant que {currentUser.username}
            </Typography>
            {currentUser.first_name && currentUser.last_name && (
              <Typography variant="body2" color="textSecondary" align="center">
                {currentUser.first_name} {currentUser.last_name}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box className={className} sx={sx}>
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom align="center">
            {title}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* Sélection du type d'authentification */}
            {authTypes.length > 1 && (
              <Box mb={3}>
                <Stack direction="row" spacing={1} justifyContent="center">
                  {authTypes.includes("direct") && (
                    <Button
                      variant={authType === "direct" ? "contained" : "outlined"}
                      color="primary"
                      onClick={() => setAuthType("direct")}
                    >
                      Serveur
                    </Button>
                  )}
                  {authTypes.includes("proxy") && (
                    <Button
                      variant={authType === "proxy" ? "contained" : "outlined"}
                      color="primary"
                      onClick={() => setAuthType("proxy")}
                    >
                      Proxy
                    </Button>
                  )}
                  {authTypes.includes("token") && (
                    <Button
                      variant={authType === "token" ? "contained" : "outlined"}
                      color="primary"
                      onClick={() => setAuthType("token")}
                    >
                      Token
                    </Button>
                  )}
                </Stack>
              </Box>
            )}

            {/* Champs communs aux modes direct et proxy */}
            {(authType === "direct" || authType === "proxy") && (
              <>
                <TextField
                  label="Nom d'utilisateur ou email"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isAuthenticating}
                  autoComplete="username"
                  InputProps={{
                    autoComplete: "username",
                  }}
                />
                <TextField
                  label="Mot de passe"
                  variant="outlined"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  margin="normal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isAuthenticating}
                  autoComplete="current-password"
                  InputProps={{
                    autoComplete: "current-password",
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            )}

            {/* Champ URL serveur pour les modes direct et token */}
            {(authType === "direct" || authType === "token") && (
              <TextField
                label="URL du serveur"
                variant="outlined"
                placeholder="https://mattermost.example.com"
                fullWidth
                margin="normal"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                disabled={isAuthenticating}
              />
            )}

            {/* Champ token pour le mode token */}
            {authType === "token" && (
              <TextField
                label="Token d'accès personnel"
                variant="outlined"
                fullWidth
                margin="normal"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isAuthenticating}
              />
            )}

            {/* Checkbox "Se souvenir de moi" */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  color="primary"
                  disabled={isAuthenticating}
                />
              }
              label="Se souvenir de moi"
              sx={{ mt: 1 }}
            />

            {/* Bouton de connexion */}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={isAuthenticating}
              sx={{ mt: 2 }}
            >
              {isAuthenticating ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                loginButtonLabel
              )}
            </Button>
          </form>

          {/* Aide mode token - visible uniquement en mode token */}
          {authType === "token" && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="textSecondary">
                Le token d'accès personnel peut être généré dans les paramètres
                de votre compte Mattermost, sous "Intégrations" &gt; "Tokens
                d'accès personnels".
              </Typography>
            </>
          )}

          {/* Aide URL serveur - visible pour les modes qui utilisent l'URL du serveur */}
          {(authType === "direct" || authType === "token") && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              L'URL du serveur est l'adresse de votre installation Mattermost,
              par exemple https://mattermost.example.com
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AuthenticationSystem;
