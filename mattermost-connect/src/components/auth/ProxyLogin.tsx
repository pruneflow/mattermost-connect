// src/components/auth/ProxyLogin.tsx
/**
 * Proxy mode login component for MattermostConnect
 * For connecting via a proxy service
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import Login from "./Login";

export interface ProxyLoginProps {
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
 * Proxy login component that connects via a proxy service
 *
 * This component renders a login form specifically for proxy mode authentication.
 * It doesn't show the server URL field and doesn't include a mode selector.
 *
 * @example
 * ```tsx
 * <ProxyLogin
 *   onSuccess={(user) => console.log('Logged in as', user.username)}
 *   title="Sign in to Acme Mattermost"
 * />
 * ```
 */
const ProxyLogin: React.FC<ProxyLoginProps> = ({
  allowRememberMe = true,
  onSuccess,
  onError,
  title = "Sign In to Mattermost",
  submitText = "Sign In",
  initialUsername = "",
  className,
  sx,
  id,
}) => {
  return (
    <Login
      mode="proxy"
      showModeSelector={false}
      allowRememberMe={allowRememberMe}
      onSuccess={onSuccess}
      onError={onError}
      title={title}
      submitText={submitText}
      initialUsername={initialUsername}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default ProxyLogin;
