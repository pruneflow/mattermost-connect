// src/components/auth/Login.tsx
/**
 * Main login component for MattermostConnect
 * Provides a unified login interface with support for both direct and proxy modes
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import LoginContainer from "../../internal/containers/auth/LoginContainer";
import { LoginMode } from "../../internal/types/componentTypes";

export interface LoginProps {
  /** Initial login mode */
  mode?: LoginMode;
  /** Whether to show mode selector */
  showModeSelector?: boolean;
  /** Whether to allow remembering credentials */
  allowRememberMe?: boolean;
  /** Callback when login is successful */
  onSuccess?: (user: any) => void;
  /** Callback when login fails */
  onError?: (error: Error) => void;
  /** Custom form title */
  title?: string;
  /** Custom submit button text */
  submitText?: string;
  /** Initial server URL for direct mode */
  initialServerUrl?: string;
  /** Initial username */
  initialUsername?: string;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Login component that provides authentication functionality
 *
 * This component renders a login form with support for both direct and proxy authentication modes.
 * Direct mode connects directly to a Mattermost server, while proxy mode uses a proxy service.
 *
 * @example
 * ```tsx
 * <Login
 *   mode="direct"
 *   showModeSelector={true}
 *   onSuccess={(user) => console.log('Logged in as', user.username)}
 *   initialServerUrl="https://mattermost.example.com"
 * />
 * ```
 */
const Login: React.FC<LoginProps> = ({
  mode = "direct",
  showModeSelector = true,
  allowRememberMe = true,
  onSuccess,
  onError,
  title = "Sign In to Mattermost",
  submitText = "Sign In",
  initialServerUrl = "",
  initialUsername = "",
  className,
  sx,
  id,
}) => {
  return (
    <LoginContainer
      onLoginSuccess={onSuccess}
      title={title}
      submitText={submitText}
      initialServerUrl={initialServerUrl}
      initialUsername={initialUsername}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default Login;
