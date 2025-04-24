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
  MattermostDirectProvider,
  MattermostProxyProvider,
  useAuth,
  useTeams,
  useChannels,
  User,
} from "mattermost-connect";

// Demo UI Components
import ClassicInterface from "./components/ClassicInterface";
import AuthenticationUI from "./components/AuthenticationUI";
import createMockService from "./mockService";

// Define the connection details type
interface ConnectionDetails {
  mode: "direct" | "proxy" | "demo";
  serverUrl?: string;
  proxyUrl?: string;
  clientId?: string;
  token?: string;
  user?: User;
}

// Define the theme
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

// Create mock service for demo mode
const mockService = createMockService();

/**
 * Initializing component for direct or proxy connection modes
 * This component handles the initial connection and authentication
 */
const ConnectedApp: React.FC<{
  onLogout: () => void;
}> = ({ onLogout }) => {
  const { isAuthenticated, isAuthenticating, currentUser, error } = useAuth();
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
          Check authentication...
        </Typography>
      </Box>
    );
  }

  // Si nous arrivons ici, c'est que l'authentification est complète et l'utilisateur est authentifié
  return <ClassicInterface onLogout={onLogout} />;
};

/**
 * Demo mode app that uses mock data
 */
const DemoApp: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  // Initialize with mock data
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simulate loading time for demo mode
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
  // State
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails>(
    {
      mode: "demo",
    },
  );

  // Demo effect - simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Handle successful authentication
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

  // Handle logout
  const handleLogout = () => {
    console.log("Logging out");
    setAuthenticated(false);
    setConnectionDetails({ mode: "demo" });
  };

  // Handle errors
  const handleError = (err: Error) => {
    console.error("Error:", err);
    setError(err.message);
  };

  // Clear error
  const handleErrorClose = () => {
    setError(null);
  };

  // Render the appropriate provider based on connection details
  const renderProvider = () => {
    if (!authenticated) {
      return (
        <AuthenticationUI onSuccess={handleAuthSuccess} onError={handleError} />
      );
    }

    // Based on the connection mode, render the appropriate provider
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
        // For demo mode, we use mock data
        return <DemoApp onLogout={handleLogout} />;
    }
  };

  // If loading, show a loading indicator
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
