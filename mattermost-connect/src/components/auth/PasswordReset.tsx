// src/components/auth/PasswordReset.tsx
/**
 * Password reset component for MattermostConnect
 * Provides functionality for forgotten password recovery
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import PasswordResetContainer from "../../internal/containers/auth/PasswordResetContainer";

export type PasswordResetMode = "forgot" | "reset" | "update";

export interface PasswordResetProps {
  /** Mode of operation: forgot (request reset), reset (with token), or update (when logged in) */
  mode?: PasswordResetMode;
  /** Initial email for the forgot password form */
  initialEmail?: string;
  /** Reset token for the reset password form */
  token?: string;
  /** Custom submit button text */
  submitText?: string;
  /** Whether to show the login link */
  showLoginLink?: boolean;
  /** Custom login link text */
  loginText?: string;
  /** Callback when login link is clicked */
  onLoginClick?: () => void;
  /** Callback when reset request is successful */
  onRequestSuccess?: () => void;
  /** Callback when password reset/update is successful */
  onSuccess?: () => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Password reset component that provides forgotten password recovery functionality
 *
 * This component supports three modes:
 * - "forgot": Request a password reset link
 * - "reset": Reset password with a token
 * - "update": Update password when already logged in
 *
 * @example
 * ```tsx
 * // Forgot password form
 * <PasswordReset
 *   mode="forgot"
 *   onRequestSuccess={() => console.log('Reset link sent')}
 *   onLoginClick={() => navigate('/login')}
 * />
 *
 * // Reset password form with token
 * <PasswordReset
 *   mode="reset"
 *   token="reset-token-from-url"
 *   onSuccess={() => navigate('/login')}
 * />
 * ```
 */
const PasswordReset: React.FC<PasswordResetProps> = ({
  mode = "forgot",
  initialEmail = "",
  token,
  submitText,
  showLoginLink = true,
  loginText = "Back to Login",
  onLoginClick,
  onRequestSuccess,
  onSuccess,
  className,
  sx,
  id,
}) => {
  return (
    <PasswordResetContainer
      mode={mode}
      initialEmail={initialEmail}
      token={token}
      submitText={submitText}
      showLoginLink={showLoginLink}
      loginText={loginText}
      onLoginClick={onLoginClick}
      onResetRequestSuccess={onRequestSuccess}
      onResetSuccess={onSuccess}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default PasswordReset;
