import React, { useState } from "react";
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  ContentCopy,
  Check,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import {
  LoginForm,
  AppProvider,
  AppLayout,
  useAppSelector,
  useAppDispatch,
  selectIsAuthenticated,
  selectCurrentUser,
  selectIsLoggingIn,
  logoutUser,
} from "mattermost-connect";

// Phase 3 Demo Component - Channels + Navigation with Layout Toggle
const Phase3Demo: React.FC = () => {
  // Layout mode toggle
  const [layoutMode, setLayoutMode] = useState<"custom" | "mattermost">(
    "custom",
  );

  // Handle layout mode change
  const handleLayoutModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: "custom" | "mattermost",
  ) => {
    if (newMode !== null) {
      setLayoutMode(newMode);
    }
  };

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Layout Mode Toggle - Outside and above everything */}
      <Box
        sx={{
          p: 2,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <ToggleButtonGroup
          value={layoutMode}
          exclusive
          onChange={handleLayoutModeChange}
          aria-label="layout mode"
          size="small"
        >
          <ToggleButton
            value="custom"
            aria-label="custom layout"
            sx={{
              px: 3,
              py: 1,
              textTransform: "none",
              fontWeight: layoutMode === "custom" ? "bold" : "normal",
              bgcolor: layoutMode === "custom" ? "primary.main" : "transparent",
              color: layoutMode === "custom" ? "white" : "text.primary",
              "&:hover": {
                bgcolor:
                  layoutMode === "custom" ? "primary.dark" : "action.hover",
              },
            }}
          >
            🎨 Custom Layout
          </ToggleButton>
          <ToggleButton
            value="mattermost"
            aria-label="mattermost layout"
            sx={{
              px: 3,
              py: 1,
              textTransform: "none",
              fontWeight: layoutMode === "mattermost" ? "bold" : "normal",
              bgcolor:
                layoutMode === "mattermost" ? "primary.main" : "transparent",
              color: layoutMode === "mattermost" ? "white" : "text.primary",
              "&:hover": {
                bgcolor:
                  layoutMode === "mattermost" ? "primary.dark" : "action.hover",
              },
            }}
          >
            📋 Mattermost Layout
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Conditional Layout Rendering */}
      <AppLayout layout={layoutMode} />
    </Box>
  );
};

// Demo configuration component
const DemoConfig: React.FC<{
  onConfigChange: (config: {
    serverUrl: string;
    token: string;
    useToken: boolean;
  }) => void;
  isAuthenticated: boolean;
  currentConfig: { serverUrl: string; token: string; useToken: boolean };
}> = ({ onConfigChange, isAuthenticated, currentConfig }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const dispatch = useAppDispatch();
  const [serverUrl, setServerUrl] = useState(currentConfig.serverUrl);
  const [token, setToken] = useState(currentConfig.token);
  const [useToken, setUseToken] = useState(currentConfig.useToken);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Synchroniser le state local avec les props reçues
  React.useEffect(() => {
    setServerUrl(currentConfig.serverUrl);
    setToken(currentConfig.token);
    setUseToken(currentConfig.useToken);
  }, [currentConfig]);

  const handleConfigChange = () => {
    onConfigChange({ serverUrl, token, useToken });
  };

  React.useEffect(() => {
    handleConfigChange();
  }, [serverUrl, token, useToken]);

  // Auto-collapse when authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      setExpanded(false);
    }
  }, [isAuthenticated]);

  const handleTokenModeChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newUseToken = event.target.checked;

    // Changer le mode immédiatement pour éviter le double-clic
    setUseToken(newUseToken);

    // Si on est connecté, faire un logout propre pour supprimer les cookies HttpOnly
    if (isAuthenticated) {
      await dispatch(logoutUser());
    }

    // Supprimer manuellement les cookies non-HttpOnly (CSRF et USERID)
    if (newUseToken) {
      document.cookie =
        "MMUSERID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie =
        "MMCSRF=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
  };

  const getCodePreview = () => {
    if (useToken) {
      return `<AppProvider 
  serverUrl="${serverUrl}"
  token="${token}"
>
  <MyApp /> {/* Auto-login with token */}
</AppProvider>`;
    } else {
      return `<AppProvider serverUrl="${serverUrl}">
  {!isAuthenticated ? (
    <LoginForm /> {/* User enters email/password */}
  ) : (
    <MyApp />
  )}
</AppProvider>`;
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(getCodePreview());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {/* Configuration Card */}
      <Card
        sx={{
          width: { xs: "100%", xl: "50%" },
          height: "fit-content",
          maxWidth: { xs: "100%", xl: "600px" },
          margin: "0 auto",
        }}
      >
        {/* Header avec bouton expand/collapse */}
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            pb: expanded ? 1 : { xs: 2, sm: 3 },
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="h6">⚙️ Demo Configuration</Typography>
            <Chip
              label={useToken ? "Token Mode" : "Login/Password Mode"}
              color={useToken ? "primary" : "secondary"}
              size="small"
            />
          </Box>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </Box>

        <Collapse in={expanded}>
          <CardContent sx={{ p: { xs: 2, sm: 3 }, pt: 0 }}>
            {/* Server URL and Token fields */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: useToken ? "1fr 1fr" : "1fr",
                },
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                fullWidth
                label="Server URL"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                size="small"
                slotProps={{
                  input: {
                    startAdornment: (
                      <Chip
                        label="DEV"
                        color="primary"
                        size="small"
                        sx={{ mr: 1 }}
                      />
                    ),
                  },
                }}
              />

              {useToken && (
                <TextField
                  fullWidth
                  label="Personal Access Token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  size="small"
                  placeholder="Enter your token"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <Chip
                          label="DEV"
                          color="primary"
                          size="small"
                          sx={{ mr: 1 }}
                        />
                      ),
                    },
                  }}
                />
              )}
            </Box>

            <FormControlLabel
              control={
                <Switch checked={useToken} onChange={handleTokenModeChange} />
              }
              label="Use authentication token"
              sx={{ mb: 2 }}
            />

            {!isMobile && (
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "text.secondary" }}
                  >
                    Code Preview:
                  </Typography>
                  <Tooltip title={copied ? "Copied!" : "Copy code"}>
                    <IconButton
                      size="small"
                      onClick={handleCopyCode}
                      sx={{
                        p: 0.5,
                        color: copied ? "success.main" : "text.secondary",
                      }}
                    >
                      {copied ? (
                        <Check fontSize="small" />
                      ) : (
                        <ContentCopy fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box
                  sx={{
                    bgcolor: "grey.100",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 2,
                    fontFamily: "Monaco, Consolas, monospace",
                    fontSize: { xs: "10px", sm: "12px" },
                    overflowX: "auto",
                    whiteSpace: "pre",
                    minHeight: "100px",
                    width: "100%",
                    "&::-webkit-scrollbar": {
                      height: "8px",
                    },
                    "&::-webkit-scrollbar-track": {
                      backgroundColor: "rgba(0,0,0,0.1)",
                      borderRadius: "4px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: "rgba(0,0,0,0.3)",
                      borderRadius: "4px",
                    },
                  }}
                >
                  {getCodePreview()}
                </Box>
              </Box>
            )}
          </CardContent>
        </Collapse>
      </Card>
    </Box>
  );
};

// Auth status component
const AuthStatus: React.FC = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentUser = useAppSelector(selectCurrentUser);
  const isLoggingIn = useAppSelector(selectIsLoggingIn);

  if (isLoggingIn) {
    return (
      <Box sx={{ textAlign: "center", p: 2.5 }}>
        <Typography>Authenticating...</Typography>
      </Box>
    );
  }

  if (isAuthenticated && currentUser) {
    return <Phase3Demo />;
  }

  return (
    <Box sx={{ maxWidth: "100%" }}>
      <LoginForm onSuccess={() => console.log("Login successful!")} />
    </Box>
  );
};

// Main demo component
const ReduxDemoContent: React.FC<{
  serverUrl: string;
  token: string;
  useToken: boolean;
}> = () => {
  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2 },
        maxWidth: "100%",
        margin: "0",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <AuthStatus />
    </Box>
  );
};

// Redux demo with AppProvider (includes store + theme + initialization)
const ReduxDemo: React.FC = () => {
  const [config, setConfig] = useState({
    serverUrl: "http://localhost:8065",
    token: "",
    useToken: false,
  });

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppProvider
        serverUrl={config.serverUrl}
        token={config.useToken && config.token ? config.token : undefined}
      >
        <DemoConfigWrapper onConfigChange={setConfig} currentConfig={config} />
        <ReduxDemoContent
          serverUrl={config.serverUrl}
          token={config.token}
          useToken={config.useToken}
        />
      </AppProvider>
    </Box>
  );
};

// Wrapper to access isAuthenticated inside AppProvider
const DemoConfigWrapper: React.FC<{
  onConfigChange: (config: {
    serverUrl: string;
    token: string;
    useToken: boolean;
  }) => void;
  currentConfig: { serverUrl: string; token: string; useToken: boolean };
}> = ({ onConfigChange, currentConfig }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return (
    <DemoConfig
      onConfigChange={onConfigChange}
      isAuthenticated={isAuthenticated}
      currentConfig={currentConfig}
    />
  );
};

export default ReduxDemo;
