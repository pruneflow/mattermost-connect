// src/components/auth/Register.tsx
/**
 * Registration component for MattermostConnect
 * Allows users to create a new account
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import RegisterContainer from "../../internal/containers/auth/RegisterContainer";

export interface RegisterProps {
  /** Initial username */
  initialUsername?: string;
  /** Initial email */
  initialEmail?: string;
  /** Initial server URL (for direct mode) */
  initialServerUrl?: string;
  /** Whether to show server URL field */
  showServerUrl?: boolean;
  /** Custom form title */
  title?: string;
  /** Custom submit button text */
  submitText?: string;
  /** Whether to show login link */
  showLogin?: boolean;
  /** Custom login link text */
  loginText?: string;
  /** Whether to show password strength indicator */
  showPasswordStrength?: boolean;
  /** Callback when login link is clicked */
  onLoginClick?: () => void;
  /** Callback when registration is successful */
  onSuccess?: (user: any) => void;
  /** Whether email verification is required */
  requireEmailVerification?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Registration component that allows users to create a new account
 *
 * This component renders a registration form with fields for username, email,
 * password, and optional server URL for direct mode.
 *
 * @example
 * ```tsx
 * <Register
 *   showServerUrl={true}
 *   initialServerUrl="https://mattermost.example.com"
 *   onSuccess={(user) => console.log('Registered as', user.username)}
 *   onLoginClick={() => navigate('/login')}
 * />
 * ```
 */
const Register: React.FC<RegisterProps> = ({
  initialUsername = "",
  initialEmail = "",
  initialServerUrl = "",
  showServerUrl = false,
  title = "Create Account",
  submitText = "Register",
  showLogin = true,
  loginText = "Already have an account? Login",
  showPasswordStrength = true,
  onLoginClick,
  onSuccess,
  requireEmailVerification = false,
  className,
  sx,
  id,
}) => {
  return (
    <RegisterContainer
      initialUsername={initialUsername}
      initialEmail={initialEmail}
      initialServerUrl={initialServerUrl}
      showServerUrl={showServerUrl}
      title={title}
      submitText={submitText}
      showLogin={showLogin}
      loginText={loginText}
      showPasswordStrength={showPasswordStrength}
      onLoginClick={onLoginClick}
      onRegisterSuccess={onSuccess}
      requireEmailVerification={requireEmailVerification}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default Register;
