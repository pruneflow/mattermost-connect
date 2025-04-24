// src/components/auth/DirectLogin.tsx
/**
 * Direct mode login component for MattermostConnect
 * For connecting directly to a Mattermost server
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import Login from "./Login";

export interface DirectLoginProps {
  /** Initial server URL */
  serverUrl?: string;
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
 * Direct login component that connects directly to a Mattermost server
 *
 * This component renders a login form specifically for direct mode authentication.
 * It always shows the server URL field and doesn't include a mode selector.
 *
 * @example
 * ```tsx
 * <DirectLogin
 *   serverUrl="https://mattermost.example.com"
 *   onSuccess={(user) => console.log('Logged in as', user.username)}
 * />
 * ```
 */
const DirectLogin: React.FC<DirectLoginProps> = ({
  serverUrl = "",
  allowRememberMe = true,
  onSuccess,
  onError,
  title = "Connect to Mattermost Server",
  submitText = "Connect",
  initialUsername = "",
  className,
  sx,
  id,
}) => {
  return (
    <Login
      mode="direct"
      showModeSelector={false}
      allowRememberMe={allowRememberMe}
      onSuccess={onSuccess}
      onError={onError}
      title={title}
      submitText={submitText}
      initialServerUrl={serverUrl}
      initialUsername={initialUsername}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default DirectLogin;
