// src/components/auth/MFA.tsx
/**
 * Multi-factor authentication component for MattermostConnect
 * Provides verification functionality during login
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import MFAContainer from "../../internal/containers/auth/MFAContainer";

export interface MFAProps {
  /** User ID for MFA verification */
  userId: string;
  /** Session token from previous authentication step */
  sessionToken?: string;
  /** MFA method to use */
  method?: "totp" | "email" | "sms" | "recovery";
  /** Length of verification code */
  codeLength?: number;
  /** Whether to auto-focus the input field */
  autoFocus?: boolean;
  /** Custom title text */
  title?: string;
  /** Custom description text */
  description?: string;
  /** Custom submit button text */
  submitText?: string;
  /** Custom resend code button text */
  resendText?: string;
  /** Callback when MFA verification is successful */
  onSuccess?: (token: string) => void;
  /** Whether to show back button */
  showBackButton?: boolean;
  /** Callback when back button is clicked */
  onBackClick?: () => void;
  /** Callback to trigger resending of a verification code */
  onResendCode?: () => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Multi-factor authentication component for verification during login
 *
 * This component handles second-factor verification with support for different
 * authentication methods such as TOTP (time-based one-time password), email, SMS,
 * and recovery codes.
 *
 * @example
 * ```tsx
 * <MFA
 *   userId="user123"
 *   sessionToken="session-token-from-first-step"
 *   method="totp"
 *   onSuccess={(token) => {
 *     console.log('MFA verified, received token:', token);
 *     completeLogin(token);
 *   }}
 *   onBackClick={() => setShowMFA(false)}
 * />
 * ```
 */
const MFA: React.FC<MFAProps> = ({
  userId,
  sessionToken,
  method = "totp",
  codeLength = 6,
  autoFocus = true,
  title,
  description,
  submitText = "Verify",
  resendText = "Resend Code",
  onSuccess,
  showBackButton = true,
  onBackClick,
  onResendCode,
  className,
  sx,
  id,
}) => {
  return (
    <MFAContainer
      userId={userId}
      sessionToken={sessionToken}
      method={method}
      codeLength={codeLength}
      autoFocus={autoFocus}
      title={title}
      description={description}
      submitText={submitText}
      resendText={resendText}
      onMFASuccess={onSuccess}
      showBackButton={showBackButton}
      onBackClick={onBackClick}
      onResendCode={onResendCode}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default MFA;
