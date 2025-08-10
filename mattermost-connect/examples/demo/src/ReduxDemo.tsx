import React, { useState } from "react";
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  LoginForm,
  AppProvider,
  AppLayout,
  useAppSelector,
  selectIsAuthenticated,
  selectCurrentUser,
  selectIsLoggingIn,
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
    return (
      <>
        <Box
          sx={{
            p: 2.5,
            bgcolor: "success.light",
            border: 1,
            borderColor: "success.main",
            borderRadius: 2,
            maxWidth: "100%",
            margin: { xs: "10px", sm: "20px auto" },
            textAlign: "center",
            minWidth: 0,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: "text.primary",
              mb: 1.5,
            }}
          >
            ✅ Successfully connected to Mattermost!
          </Typography>
          <Typography
            sx={{ color: "text.secondary", my: 0.75, wordBreak: "break-word" }}
          >
            Welcome {currentUser.first_name} {currentUser.last_name} (@
            {currentUser.username})
          </Typography>
        </Box>
        <Phase3Demo />
      </>
    );
  }

  return (
    <Box sx={{ maxWidth: "100%", margin: "40px auto" }}>
      <LoginForm onSuccess={() => console.log("Login successful!")} />
    </Box>
  );
};

// Main demo component
const ReduxDemoContent: React.FC = () => {
  return (
    <Box
      sx={{
        p: 2.5,
        maxWidth: "100%",
        margin: "0",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <Box
        component="header"
        sx={{
          textAlign: "center",
          mb: 5,
        }}
      >
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontSize: "32px",
            fontWeight: "bold",
            color: "text.primary",
            mb: 1,
          }}
        >
          MattermostConnect Redux
        </Typography>
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: "16px",
            m: 0,
          }}
        >
          Phase 3: Channels + Navigation + Custom Layout (Built on Redux +
          Client4)
        </Typography>
      </Box>

      <AuthStatus />

      <Box
        sx={{
          mt: 5,
          p: 3,
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontSize: "18px",
            fontWeight: 600,
            mb: 2,
            color: "text.primary",
          }}
        >
          ✅ Phase 3 Features Implemented
        </Typography>
        <Box
          component="ul"
          sx={{
            listStyle: "none",
            p: 0,
            m: 0,
          }}
        >
          <Typography
            component="li"
            sx={{
              color: "text.secondary",
              mb: 1,
              fontSize: "14px",
              pl: 0.5,
            }}
          >
            ✅ Atoms: ChannelIcon, SearchInput, TypingDots
          </Typography>
          <Typography
            component="li"
            sx={{
              color: "text.secondary",
              mb: 1,
              fontSize: "14px",
              pl: 0.5,
            }}
          >
            ✅ Molecules: ChannelItem, ChannelHeader, SearchBar
          </Typography>
          <Typography
            component="li"
            sx={{
              color: "text.secondary",
              mb: 1,
              fontSize: "14px",
              pl: 0.5,
            }}
          >
            ✅ Organisms: ChannelList, Sidebar, AppLayout
          </Typography>
          <Typography
            component="li"
            sx={{
              color: "text.secondary",
              mb: 1,
              fontSize: "14px",
              pl: 0.5,
            }}
          >
            ✅ Hooks: useChannels, useChannelWebSocket
          </Typography>
          <Typography
            component="li"
            sx={{
              color: "text.secondary",
              mb: 1,
              fontSize: "14px",
              pl: 0.5,
            }}
          >
            ✅ Redux channels management with optimized selectors
          </Typography>
          <Typography
            component="li"
            sx={{
              color: "text.secondary",
              mb: 1,
              fontSize: "14px",
              pl: 0.5,
            }}
          >
            ✅ Channel navigation and WebSocket events
          </Typography>
          <Typography
            component="li"
            sx={{
              color: "text.secondary",
              mb: 1,
              fontSize: "14px",
              pl: 0.5,
            }}
          >
            ✅ Dual layout modes: AppLayout vs Custom Layout
          </Typography>
          <Typography
            component="li"
            sx={{
              color: "text.secondary",
              mb: 1,
              fontSize: "14px",
              pl: 0.5,
            }}
          >
            ✅ Teams sidebar with channels navigation
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          mt: 5,
          p: 3,
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontSize: "18px",
            fontWeight: 600,
            mb: 2,
            color: "text.primary",
          }}
        >
          🚀 Simple Integration
        </Typography>
        <Typography sx={{ color: "#666", mb: 1.5 }}>
          Just 3 lines to integrate in your React app:
        </Typography>
        <Box
          sx={{
            bgcolor: "action.hover",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            p: 2,
            fontFamily: "Monaco, Consolas, monospace",
            fontSize: "13px",
            mt: 2,
            overflow: "auto",
          }}
        >
          {`import { 
  store, 
  setDefaultClient, 
  LoginForm,
  TeamList,
  ChannelList,
  AppLayout,
  UserMenu,
  UserAvatar,
  useTeams,
  useChannels,
  useUsers 
} from 'mattermost-connect';
import { Provider } from 'react-redux';

// Setup Client4
setDefaultClient({ 
  serverUrl: 'https://your-mattermost.com' 
});

// Use AppLayout for Mattermost-style UI
<Provider store={store}>
  <AppLayout />
</Provider>

// Or build custom layout with components
<Provider store={store}>
  <LoginForm />
  <TeamList teams={teams} />
  <ChannelList />
  <UserMenu user={user} onLogout={logout} />
</Provider>`}
        </Box>
      </Box>

      <Box
        sx={{
          mt: 5,
          p: 3,
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontSize: "18px",
            fontWeight: 600,
            mb: 2,
            color: "text.primary",
          }}
        >
          🏗️ Next Phases
        </Typography>
        <Box
          component="ul"
          sx={{
            listStyle: "none",
            p: 0,
            m: 0,
          }}
        >
          <Typography
            component="li"
            sx={{
              color: "text.secondary",
              mb: 1,
              fontSize: "14px",
              pl: 0.5,
            }}
          >
            ✅ Phase 1: Redux Toolkit + RTK Query + Authentication
          </Typography>
          <Typography
            component="li"
            sx={{
              color: "text.secondary",
              mb: 1,
              fontSize: "14px",
              pl: 0.5,
            }}
          >
            ✅ Phase 2: Teams + User Management
          </Typography>
          <Typography
            component="li"
            sx={{
              color: "text.secondary",
              mb: 1,
              fontSize: "14px",
              pl: 0.5,
            }}
          >
            ✅ Phase 3: Channels + Navigation + Custom Layouts
          </Typography>
          <Typography
            component="li"
            sx={{
              color: "text.secondary",
              mb: 1,
              fontSize: "14px",
              pl: 0.5,
            }}
          >
            ⏳ Phase 4: Messages + Core Chat
          </Typography>
          <Typography
            component="li"
            sx={{
              color: "text.secondary",
              mb: 1,
              fontSize: "14px",
              pl: 0.5,
            }}
          >
            ⏳ Phase 5: Threads + WebSocket Real-time
          </Typography>
          <Typography
            component="li"
            sx={{
              color: "text.secondary",
              mb: 1,
              fontSize: "14px",
              pl: 0.5,
            }}
          >
            ⏳ Phase 6: Polish + Performance + Mobile
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// Redux demo with AppProvider (includes store + theme + initialization)
const ReduxDemo: React.FC = () => {
  return (
    <AppProvider>
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <ReduxDemoContent />
      </Box>
    </AppProvider>
  );
};

export default ReduxDemo;
