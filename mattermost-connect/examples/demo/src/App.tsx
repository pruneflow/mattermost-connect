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
  MattermostProvider,
  useAuth,
  User,
} from "mattermost-connect";

// Composants de l'interface démo
import AuthenticationUI from "./components/AuthenticationUI";
import createMockService from "./mockService";
import MattermostDemo from "./MattermostDemo";

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
  

  // Gérer les erreurs d'authentification
  useEffect(() => {
    if (error) {
      console.error("Authentication error in ConnectedApp:", error);
      
      // Check if there's an error message
      if (error.message) {
        const message = error.message.toLowerCase();
        const isTokenExpired = (
          message.includes('token is expired') || 
          message.includes('token has expired') || 
          message.includes('invalid token') || 
          message.includes('token invalid') ||
          message.includes('session expirée') ||
          message.includes('session expiré')
        );
        
        // Only logout if token is expired or it's a 401 error
        if (isTokenExpired || (error as any).status === 401) {
          console.log("Token expired or unauthorized, logging out from ConnectedApp");
          onLogout();
        } else if ((error as any).status === 404 || 
                   message.includes('not found') || 
                   message.includes('introuvable')) {
          console.log("Resource not found error (404), but not logging out from ConnectedApp");
          // Just show the error but don't logout
        } else {
          // For unexpected auth errors, log but don't automatically logout
          console.log("Other auth error in ConnectedApp, but not automatically logging out");
        }
      } else {
        // If there's no error message, log but don't logout as a precaution
        console.log("Error with no message in ConnectedApp, continuing without logout");
      }
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
  return <MattermostDemo onLogout={() => {
    console.log("Logout requested from MattermostDemo");
    handleLogout();
  }} />;
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

  return <MattermostDemo onLogout={onLogout} mockService={mockService} />;
};

function App() {
  // État
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails>({
    mode: "demo"
  });

  // Effet pour simuler un court délai de chargement
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Effet pour récupérer les informations d'authentification du localStorage
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem("mattermost_auth");
      if (savedAuth) {
        const authData = JSON.parse(savedAuth) as ConnectionDetails;
        // Vérifier que les données essentielles sont présentes
        if (authData.mode && 
            ((authData.mode === "direct" && authData.serverUrl && authData.token) || 
             (authData.mode === "proxy" && authData.proxyUrl && authData.clientId && authData.token) ||
             authData.mode === "demo")) {
          
          console.log("Restoring saved authentication for mode:", authData.mode);
          setConnectionDetails(authData);
          setAuthenticated(true);
        }
      }
    } catch (err) {
      console.error("Error loading saved authentication:", err);
    }
  }, []);

  // Gérer l'authentification réussie
  const handleAuthSuccess = (result: any) => {
    console.log("Authentication successful:", result);
    
    // Créer l'objet de détails de connexion
    const details: ConnectionDetails = {
      mode: result.mode,
      serverUrl: result.serverUrl,
      proxyUrl: result.proxyUrl,
      clientId: result.clientId,
      token: result.token,
      user: result.user,
    };
    
    // Sauvegarder dans localStorage pour persistance
    localStorage.setItem("mattermost_auth", JSON.stringify(details));
    
    // Mettre à jour l'état
    setAuthenticated(true);
    setConnectionDetails(details);
  };

  // Gérer la déconnexion
  const handleLogout = () => {
    console.log("Logging out");
    
    // Effacer uniquement les données d'authentification (token) de localStorage
    localStorage.removeItem("mattermost_auth");
    
    // Réinitialiser l'état pour retourner à la page d'authentification
    setAuthenticated(false);
    // Conserver le mode actuel pour que l'utilisateur reste sur le même onglet du formulaire d'authentification
    setConnectionDetails((prevDetails) => ({ 
      mode: prevDetails.mode 
    }));
    
    // Les autres données (serverUrl, proxyUrl, clientId, username) sont conservées
    // dans localStorage sous les clés mm_* et seront restaurées par AuthenticationUI
  };

  // Vérifie si l'erreur est due à un token expiré
  const isTokenExpiredError = (error: Error): boolean => {
    if ((error as any).status !== 401) return false;
    
    // Vérifier les messages d'erreur courants pour les tokens expirés
    const message = error.message.toLowerCase();
    
    return (
      message.includes('token is expired') || 
      message.includes('token has expired') || 
      message.includes('invalid token') || 
      message.includes('token invalid') ||
      message.includes('session expirée') ||
      message.includes('session expiré')
    );
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
        <AuthenticationUI 
          initialMode={connectionDetails.mode}
          onSuccess={handleAuthSuccess} 
          onError={handleError} 
        />
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
          <MattermostProvider
            mode="direct"
            serverUrl={connectionDetails.serverUrl}
            token={connectionDetails.token}
            enableWebSocket={true}
            onAuthError={(err) => {
              console.error("Auth error in provider:", err);
              
              // Always show the error
              handleError(err);
              
              // Check if this is a token expiration error
              if (isTokenExpiredError(err)) {
                console.log("Token expired, logging out");
                handleLogout();
              } else if ((err as any).status === 401) {
                console.log("Unauthorized (401), logging out");
                handleLogout();
              } else if ((err as any).status === 404 || err.message.toLowerCase().includes('not found') || err.message.toLowerCase().includes('introuvable')) {
                console.log("Resource not found error (404), but not logging out");
                // Just show the error but don't logout
              } else {
                // For unexpected auth errors, log but don't automatically logout
                console.log("Other auth error, but not automatically logging out");
              }
            }}
          >
            <ConnectedApp onLogout={handleLogout} />
          </MattermostProvider>
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
          <MattermostProvider
            mode="proxy"
            proxyUrl={connectionDetails.proxyUrl}
            clientId={connectionDetails.clientId}
            token={connectionDetails.token}
            enableWebSocket={true}
            onAuthError={(err) => {
              console.error("Auth error in provider:", err);
              
              // Always show the error
              handleError(err);
              
              // Check if this is a token expiration error
              if (isTokenExpiredError(err)) {
                console.log("Token expired, logging out");
                handleLogout();
              } else if ((err as any).status === 401) {
                console.log("Unauthorized (401), logging out");
                handleLogout();
              } else if ((err as any).status === 404 || err.message.toLowerCase().includes('not found') || err.message.toLowerCase().includes('introuvable')) {
                console.log("Resource not found error (404), but not logging out");
                // Just show the error but don't logout
              } else {
                // For unexpected auth errors, log but don't automatically logout
                console.log("Other auth error, but not automatically logging out");
              }
            }}
          >
            <ConnectedApp onLogout={handleLogout} />
          </MattermostProvider>
        );

      case "demo":
      default:
        // Pour le mode démo, nous utilisons des données simulées
        console.log("Initializing demo mode");
        return <DemoApp onLogout={() => {
          console.log("Logout requested from DemoApp");
          handleLogout();
        }} mockService={mockService} />;
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
