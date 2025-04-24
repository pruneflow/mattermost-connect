// examples/demo/src/App.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
} from "@mui/material";
import {
  MattermostDirectProvider,
  MattermostProxyProvider,
  useAuth,
  User,
} from "mattermost-connect";

// Composants de l'interface démo
import ClassicInterface from "./components/ClassicInterface";
import AuthenticationUI from "./components/AuthenticationUI";
import createMockService from "./mockService";

// Définir le type de détails de connexion
interface ConnectionDetails {
  mode: "direct" | "proxy" | "demo";
  serverUrl?: string;
  proxyUrl?: string;
  clientId?: string;
  token?: string;
  user?: User;
}

// Définir le thème
const theme = createTheme({
  palette: {
    primary: {
      main: "#0058CC",
    },
    secondary: {
      main: "#4A154B",
    },
    background: {
      default: "#f5f5f5",
    },
  },
  typography: {
    fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 4,
        },
      },
    },
  },
});

// Créer un service mock pour le mode démo
const mockService = createMockService();

/**
 * Composant d'application connectée pour les modes direct et proxy
 * Ce composant gère la connexion initiale et l'authentification
 */
const ConnectedApp: React.FC<{
  onLogout: () => void;
}> = ({ onLogout }) => {
  const { isAuthenticated, isAuthenticating, error, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticating || isAuthenticated) {
      setIsLoading(false);
    }
  }, [isAuthenticating, isAuthenticated]);

  useEffect(() => {
    if (error) {
      console.error("Authentication error:", error);
      onLogout();
    }
  }, [error, onLogout]);

  // Gérer la déconnexion
  const handleLogout = () => {
    logout();
    onLogout();
  };

  if (isLoading || isAuthenticating || !isAuthenticated) {
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
        <Typography component={"div"} variant="body1" sx={{ ml: 2 }}>
          Checking authentication...
        </Typography>
      </Box>
    );
  }

  // Si nous arrivons ici, c'est que l'authentification est complète et l'utilisateur est authentifié
  return <ClassicInterface onLogout={handleLogout} />;
};

/**
 * Application en mode démo qui utilise des données simulées
 */
const DemoApp: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  // Initialiser avec des données simulées
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simuler un temps de chargement pour le mode démo
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
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

  return <ClassicInterface onLogout={onLogout} mockService={mockService} />;
};

function App() {
  // État
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails>(
    {
      mode: "demo",
    },
  );

  // Effet démo - simuler le chargement initial
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Gérer l'authentification réussie
  const handleAuthSuccess = (result: any) => {
    console.log("Authentication successful:", result);
    setAuthenticated(true);
    setConnectionDetails({
      mode: result.mode,
      serverUrl: result.serverUrl,
      proxyUrl: result.proxyUrl,
      clientId: result.clientId,
      token: result.token,
      user: result.user,
    });
  };

  // Gérer la déconnexion
  const handleLogout = () => {
    console.log("Logging out");
    setAuthenticated(false);
    setConnectionDetails({ mode: "demo" });
  };

  // Gérer les erreurs
  const handleError = (err: Error) => {
    console.error("Error:", err);
    setError(err.message);
  };

  // Effacer l'erreur
  const handleErrorClose = () => {
    setError(null);
  };

  // Rendre le fournisseur approprié en fonction des détails de connexion
  const renderProvider = () => {
    if (!authenticated) {
      return (
        <AuthenticationUI onSuccess={handleAuthSuccess} onError={handleError} />
      );
    }

    // En fonction du mode de connexion, rendre le fournisseur approprié
    switch (connectionDetails.mode) {
      case "direct":
        if (!connectionDetails.serverUrl || !connectionDetails.token) {
          console.error("Missing serverUrl or token for direct mode");
          handleLogout();
          return null;
        }

        return (
          <MattermostDirectProvider
            serverUrl={connectionDetails.serverUrl}
            token={connectionDetails.token}
            enableWebSocket={true}
            onAuthError={(err) => {
              handleError(err);
              handleLogout();
            }}
          >
            <ConnectedApp onLogout={handleLogout} />
          </MattermostDirectProvider>
        );

      case "proxy":
        if (
          !connectionDetails.proxyUrl ||
          !connectionDetails.clientId ||
          !connectionDetails.token
        ) {
          console.error("Missing proxyUrl, clientId or token for proxy mode");
          handleLogout();
          return null;
        }
        return (
          <MattermostProxyProvider
            proxyUrl={connectionDetails.proxyUrl}
            clientId={connectionDetails.clientId}
            token={connectionDetails.token}
            enableWebSocket={true}
            onAuthError={(err) => {
              handleError(err);
              handleLogout();
            }}
          >
            <ConnectedApp onLogout={handleLogout} />
          </MattermostProxyProvider>
        );

      case "demo":
      default:
        // Pour le mode démo, nous utilisons des données simulées
        return <DemoApp onLogout={handleLogout} />;
    }
  };

  // Si chargement, afficher un indicateur de chargement
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.default",
          }}
        >
          <CircularProgress size={60} thickness={4} />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth={false} disableGutters sx={{ minHeight: "100vh" }}>
        {renderProvider()}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={handleErrorClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleErrorClose}
            severity="error"
            sx={{ width: "100%" }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
}

export default App;
