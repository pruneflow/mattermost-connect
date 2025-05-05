// src/internal/containers/auth/MFAContainer.tsx
/**
 * Multi-Factor Authentication Container
 * Handles MFA validation during authentication
 * Delegates business logic to useAuth hook
 */
import React, { useCallback, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useDialog } from "../../hooks/useDialog";
import MFAUI from "../../components/auth/MFAUI";

// MFA container props
export interface MFAContainerProps {
  /**
   * User ID for the authenticating user
   */
  userId: string;
  /**
   * Authentication session token
   */
  sessionToken?: string;
  /**
   * MFA method to use
   */
  method?: "totp" | "email";
  /**
   * Length of verification code
   */
  codeLength?: number;
  /**
   * Whether to auto focus the code input
   */
  autoFocus?: boolean;
  /**
   * Custom form title
   */
  title?: string;
  /**
   * Custom description text
   */
  description?: string;
  /**
   * Custom submit button text
   */
  submitText?: string;
  /**
   * Custom resend code text
   */
  resendText?: string;
  /**
   * Callback on successful MFA validation
   */
  onMFASuccess?: (token: string) => void;
  /**
   * Whether to show a back button
   */
  showBackButton?: boolean;
  /**
   * Callback when back button is clicked
   */
  onBackClick?: () => void;
  /**
   * Callback to resend verification code
   */
  onResendCode?: () => void;
  /**
   * CSS className
   */
  className?: string;
  /**
   * MUI sx prop for styling
   */
  sx?: React.CSSProperties;
  /**
   * Component ID
   */
  id?: string;
}

/**
 * MFA container
 * Handles multi-factor authentication verification
 */
const MFAContainer: React.FC<MFAContainerProps> = (props) => {
  const {
    userId,
    sessionToken,
    method = "totp",
    codeLength = 6,
    autoFocus = true,
    title,
    description,
    submitText = "Verify",
    resendText = "Resend Code",
    onMFASuccess,
    showBackButton = true,
    onBackClick,
    onResendCode,
    className,
    sx,
    id,
  } = props;

  // Form error state
  const [formError, setFormError] = useState<string | null>(null);

  // Use auth hook for MFA functionality
  // Note: This is a placeholder assuming these methods are in useAuth
  // Add these methods to your actual useAuth hook if needed
  const {
    verifyMFA = async () => ({ success: false, token: "" }),
    isVerifyingMFA = false,
    resendMFACode = async () => ({ success: false }),
  } = useAuth() as any;

  // Use dialog for error handling
  const dialog = useDialog();

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: { code: string }) => {
      try {
        // Clear previous errors
        setFormError(null);

        // Verify MFA code
        const result = await verifyMFA({
          userId,
          code: data.code,
          method,
          sessionToken,
        });

        if (result.success && result.token) {
          if (onMFASuccess) {
            onMFASuccess(result.token);
          }
        } else if (result.error) {
          setFormError(result.error.message);
        } else {
          setFormError("Invalid verification code");
        }
      } catch (error) {
        // Handle unexpected errors
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred";
        setFormError(errorMessage);
      }
    },
    [userId, sessionToken, method, verifyMFA, onMFASuccess],
  );

  // Handle resend code
  const handleResendCode = useCallback(async () => {
    try {
      // If provided by props, use that
      if (onResendCode) {
        onResendCode();
        return;
      }

      // Otherwise use the auth hook method
      const result = await resendMFACode({
        userId,
        method,
        sessionToken,
      });

      if (result.success) {
        await dialog.showSuccess(
          "Code Sent",
          `A new verification code has been sent to your ${
            method === "email" ? "email" : "authenticator app"
          }.`,
        );
      } else if (result.error) {
        setFormError(result.error.message);
      }
    } catch (error) {
      // Handle unexpected errors
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setFormError(errorMessage);
    }
  }, [userId, sessionToken, method, resendMFACode, onResendCode, dialog]);

  // Handle back button click
  const handleBackClick = useCallback(() => {
    if (onBackClick) {
      onBackClick();
    }
  }, [onBackClick]);

  // Get title based on method
  const getTitle = () => {
    if (title) return title;
    return method === "totp" ? "Authentication Code" : "Email Verification";
  };

  // Get description based on method
  const getDescription = () => {
    if (description) return description;
    return method === "totp"
      ? "Enter the code from your authenticator app"
      : "Enter the verification code sent to your email";
  };

  // Render the MFA UI component
  return (
    <MFAUI
      // Form state
      error={formError}
      isLoading={isVerifyingMFA}
      // Form configuration
      method={method}
      codeLength={codeLength}
      autoFocus={autoFocus}
      // UI configuration
      title={getTitle()}
      description={getDescription()}
      submitText={submitText}
      resendText={resendText}
      // Callbacks
      onSubmit={handleSubmit}
      onResendCode={handleResendCode}
      onCancel={showBackButton ? handleBackClick : undefined}
      // Styling
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default MFAContainer;
