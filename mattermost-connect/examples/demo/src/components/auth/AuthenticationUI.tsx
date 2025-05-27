import React, { useState } from "react";
import { Box, Paper, Typography, Alert, CircularProgress } from "@mui/material";
import { MattermostProvider } from "mattermost-connect";
import { AuthTabs } from "./AuthTabs";
import { AuthForm } from "./AuthForm";
import { AuthProvider } from "./AuthProvider";

type AuthMode = "direct" | "proxy" | "demo";

interface AuthenticationProps {
  onSuccess: (result: any) => void;
  onError: (error: Error) => void;
  initialMode?: AuthMode;
}

export const AuthenticationUI: React.FC<AuthenticationProps> = ({
  onSuccess,
  onError,
  initialMode = "direct"
}) => {
  const getInitialTabIndex = () => {
    switch (initialMode) {
      case "direct": return 0;
      case "proxy": return 1;
      case "demo": return 2;
      default: return 0;
    }
  };

  const [activeTab, setActiveTab] = useState<number>(getInitialTabIndex());
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [serverUrl, setServerUrl] = useState<string>(() => {
    return localStorage.getItem("mm_serverUrl") || "http://localhost:8065";
  });
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem("mm_username") || "";
  });
  const [password, setPassword] = useState<string>("");
  const [proxyUrl, setProxyUrl] = useState<string>(() => {
    return localStorage.getItem("mm_proxyUrl") || "";
  });
  const [clientId, setClientId] = useState<string>(() => {
    return localStorage.getItem("mm_clientId") || "";
  });
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState<boolean>(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setAuthMode(newValue === 0 ? "direct" : newValue === 1 ? "proxy" : "demo");
    setShowAuth(false);
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleFillDemoCredentials = () => {
    if (authMode === "direct") {
      setServerUrl("https://demo.mattermost.com");
      setUsername("demo@example.com");
      setPassword("demo123");
    } else if (authMode === "proxy") {
      setProxyUrl("https://proxy.demo.com");
      setClientId("demo-client-id");
      setUsername("demo@example.com");
      setPassword("demo123");
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (authMode === "demo") {
      // Demo mode - skip authentication
      onSuccess({
        mode: "demo",
        user: {
          id: "demo-user",
          username: "demo",
          first_name: "Demo",
          last_name: "User",
          email: "demo@example.com",
        },
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowAuth(true);

    // Save credentials if remember me is checked
    if (rememberMe) {
      localStorage.setItem("mm_serverUrl", serverUrl);
      localStorage.setItem("mm_username", username);
      if (authMode === "proxy") {
        localStorage.setItem("mm_proxyUrl", proxyUrl);
        localStorage.setItem("mm_clientId", clientId);
      }
    }
  };

  const handleAuthSuccess = (result: any) => {
    setIsLoading(false);
    setShowAuth(false);
    onSuccess(result);
  };

  const handleAuthError = (err: Error) => {
    setIsLoading(false);
    setShowAuth(false);
    setError(err.message);
    onError(err);
  };

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      p: 2,
      bgcolor: "background.default",
    }}>
      <Paper elevation={3} sx={{
        width: "100%",
        maxWidth: 480,
        borderRadius: 2,
        overflow: "hidden",
      }}>
        <AuthTabs activeTab={activeTab} onTabChange={handleTabChange} />

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

          {!showAuth ? (
            <AuthForm
              activeTab={activeTab}
              authMode={authMode}
              serverUrl={serverUrl}
              username={username}
              password={password}
              proxyUrl={proxyUrl}
              clientId={clientId}
              rememberMe={rememberMe}
              showPassword={showPassword}
              isLoading={isLoading}
              onServerUrlChange={setServerUrl}
              onUsernameChange={setUsername}
              onPasswordChange={setPassword}
              onProxyUrlChange={setProxyUrl}
              onClientIdChange={setClientId}
              onRememberMeChange={setRememberMe}
              onTogglePasswordVisibility={handleTogglePasswordVisibility}
              onFillDemoCredentials={handleFillDemoCredentials}
              onSubmit={handleSubmit}
            />
          ) : (
            <MattermostProvider>
              <AuthProvider
                mode={authMode}
                serverUrl={serverUrl}
                proxyUrl={proxyUrl}
                clientId={clientId}
                username={username}
                password={password}
                onSuccess={handleAuthSuccess}
                onError={handleAuthError}
              />
              <Box sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                p: 3,
              }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>
                  Authenticating...
                </Typography>
              </Box>
            </MattermostProvider>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default AuthenticationUI;