// src/components/auth/DemoLogin.tsx
/**
 * Demo login component with additional features
 * Provides a complete login experience with both modes
 */
import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Link,
  Divider,
} from "@mui/material";
import { SxProps, Theme } from "@mui/material/styles";
import Login from "./Login";
import DirectLogin from "./DirectLogin";
import ProxyLogin from "./ProxyLogin";

export interface DemoLoginProps {
  /** Whether to show both login modes with tabs */
  showTabs?: boolean;
  /** Initial active tab (0 for Direct, 1 for Proxy) */
  initialTab?: number;
  /** Demo server URL */
  demoServerUrl?: string;
  /** Whether to show demo credentials */
  showDemoCredentials?: boolean;
  /** Demo username */
  demoUsername?: string;
  /** Demo password (only shown in UI, not used) */
  demoPassword?: string;
  /** Callback when login is successful */
  onSuccess?: (user: any) => void;
  /** Callback when login fails */
  onError?: (error: Error) => void;
  /** Custom form title */
  title?: string;
  /** Custom submit button text */
  submitText?: string;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Demo login component with additional features for showcasing
 *
 * This component provides a complete login experience with tabs for both
 * direct and proxy modes, demo credentials, and helpful information.
 *
 * @example
 * ```tsx
 * <DemoLogin
 *   showTabs={true}
 *   demoServerUrl="https://mattermost.example.com"
 *   showDemoCredentials={true}
 *   demoUsername="demo"
 *   demoPassword="password"
 *   onSuccess={(user) => console.log('Logged in as', user.username)}
 * />
 * ```
 */
const DemoLogin: React.FC<DemoLoginProps> = ({
  showTabs = true,
  initialTab = 0,
  demoServerUrl = "https://mattermost.example.com",
  showDemoCredentials = false,
  demoUsername = "demo",
  demoPassword = "password",
  onSuccess,
  onError,
  title,
  submitText,
  className,
  sx,
  id,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const fillDemoCredentials = () => {
    // This function only demonstrates the feature
    // Actual implementation would depend on how the login forms are accessed
    console.log("Fill demo credentials");
  };

  return (
    <Box
      className={className}
      sx={{
        width: "100%",
        maxWidth: 480,
        mx: "auto",
        ...sx,
      }}
      id={id}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          borderRadius: 2,
          overflow: "hidden",
          pb: 2,
        }}
      >
        {showTabs ? (
          <>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: "divider" }}
            >
              <Tab label="Direct Mode" />
              <Tab label="Proxy Mode" />
            </Tabs>

            <Box sx={{ pt: 2, px: 2 }}>
              {activeTab === 0 ? (
                <DirectLogin
                  serverUrl={demoServerUrl}
                  onSuccess={onSuccess}
                  onError={onError}
                  title={title}
                  submitText={submitText}
                  initialUsername={showDemoCredentials ? demoUsername : ""}
                />
              ) : (
                <ProxyLogin
                  onSuccess={onSuccess}
                  onError={onError}
                  title={title}
                  submitText={submitText}
                  initialUsername={showDemoCredentials ? demoUsername : ""}
                />
              )}
            </Box>
          </>
        ) : (
          <Box sx={{ pt: 2, px: 2 }}>
            <Login
              showModeSelector={true}
              onSuccess={onSuccess}
              onError={onError}
              title={title}
              submitText={submitText}
              initialServerUrl={demoServerUrl}
              initialUsername={showDemoCredentials ? demoUsername : ""}
            />
          </Box>
        )}

        {showDemoCredentials && (
          <Box sx={{ px: 3, pt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Demo Credentials
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Username: <strong>{demoUsername}</strong>
              <br />
              Password: <strong>{demoPassword}</strong>
            </Typography>
            <Button size="small" onClick={fillDemoCredentials} sx={{ mt: 1 }}>
              Fill Demo Credentials
            </Button>
          </Box>
        )}

        <Box sx={{ px: 3, pt: 2, textAlign: "center" }}>
          <Typography variant="caption" color="textSecondary">
            Don't have an account?{" "}
            <Link href="#" underline="hover">
              Contact your administrator
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default DemoLogin;
