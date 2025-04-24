import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
  CircularProgress,
  Paper,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  MattermostProvider,
  MattermostDirectProvider,
  MattermostProxyProvider,
  Login,
  DirectLogin,
  ProxyLogin,
  DemoLogin,
  User,
} from "mattermost-connect";

// Demo UI Components
import ClassicInterface from "./components/ClassicInterface";
import AuthenticationUI from "./components/AuthenticationUI";
import CompactInterface from "./components/CompactInterface";
import { DemoMockData } from "./mockData";

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

function App() {
  // State
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [interfaceType, setInterfaceType] = useState<"classic" | "compact">(
    "classic",
  );
  const [error, setError] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails>(
    {
      mode: "demo",
    },
  );

  // Demo effect - simulate loading
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

  // Handle interface type change
  const handleInterfaceChange = (type: "classic" | "compact") => {
    setInterfaceType(type);
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
            onAuthError={() => handleLogout()}
          >
            {interfaceType === "classic" ? (
              <ClassicInterface
                onLogout={handleLogout}
                onInterfaceChange={handleInterfaceChange}
                user={connectionDetails.user}
              />
            ) : (
              <CompactInterface
                onLogout={handleLogout}
                onInterfaceChange={handleInterfaceChange}
                user={connectionDetails.user}
              />
            )}
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
            onAuthError={() => handleLogout()}
          >
            {interfaceType === "classic" ? (
              <ClassicInterface
                onLogout={handleLogout}
                onInterfaceChange={handleInterfaceChange}
                user={connectionDetails.user}
              />
            ) : (
              <CompactInterface
                onLogout={handleLogout}
                onInterfaceChange={handleInterfaceChange}
                user={connectionDetails.user}
              />
            )}
          </MattermostProxyProvider>
        );

      case "demo":
      default:
        // For demo mode, we use mock data and a regular MattermostProvider
        return (
          <MattermostProvider onAuthError={() => handleLogout()}>
            {interfaceType === "classic" ? (
              <ClassicInterface
                onLogout={handleLogout}
                onInterfaceChange={handleInterfaceChange}
                user={DemoMockData.currentUser}
                useMockData={true}
              />
            ) : (
              <CompactInterface
                onLogout={handleLogout}
                onInterfaceChange={handleInterfaceChange}
                user={DemoMockData.currentUser}
                useMockData={true}
              />
            )}
          </MattermostProvider>
        );
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
