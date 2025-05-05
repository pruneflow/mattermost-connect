// src/internal/containers/auth/PasswordResetContainer.tsx
/**
 * Password Reset Container
 * Handles both password reset request and password reset with token
 * Delegates business logic to useAuth hook
 */
import React, { useCallback, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { PasswordResetParams } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import PasswordResetFormUI, {
  PasswordResetMode,
} from "../../components/auth/PasswordResetFormUI";
import { validateEmail } from "../../../utils/authValidation";

// Password reset container props
export interface PasswordResetContainerProps {
  /**
   * Mode for the password reset form
   */
  mode?: PasswordResetMode;
  /**
   * Initial email value
   */
  initialEmail?: string;
  /**
   * Reset token (if in reset password mode)
   */
  token?: string;
  /**
   * Custom submit button text
   */
  submitText?: string;
  /**
   * Whether to show login link
   */
  showLoginLink?: boolean;
  /**
   * Custom login link text
   */
  loginText?: string;
  /**
   * Callback when login link is clicked
   */
  onLoginClick?: () => void;
  /**
   * Callback on successful password reset request
   */
  onResetRequestSuccess?: () => void;
  /**
   * Callback on successful password reset
   */
  onResetSuccess?: () => void;
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
 * Password Reset container
 * Handles both requesting a password reset and setting a new password
 */
const PasswordResetContainer: React.FC<PasswordResetContainerProps> = (
  props,
) => {
  const {
    mode: initialMode = "forgot",
    initialEmail = "",
    token,
    submitText,
    showLoginLink = true,
    loginText = "Back to Login",
    onLoginClick,
    onResetRequestSuccess,
    onResetSuccess,
    className,
    sx,
    id,
  } = props;

  // Determine mode based on props
  const [mode] = useState<PasswordResetMode>(token ? "reset" : initialMode);

  // Form error state
  const [formError, setFormError] = useState<string | null>(null);

  // Use auth hook for password reset functionality
  const {
    forgotPassword,
    resetPassword,
    updatePassword,
    isSendingResetEmail,
    isResettingPassword,
    passwordResetError,
    validatePasswordFormat,
  } = useAuth();

  // Use dialog for confirmation/error handling
  const dialog = useDialog();

  // Handle form submission based on mode
  const handleSubmit = useCallback(
    async (data: any) => {
      try {
        // Clear previous errors
        setFormError(null);

        if (mode === "forgot") {
          // Validate email
          const emailValidation = validateEmail(data.email);
          if (!emailValidation.isValid) {
            setFormError(Object.values(emailValidation.errors)[0]);
            return;
          }

          // Request password reset email
          const result = await forgotPassword(data.email);

          if (result.success) {
            await dialog.showSuccess(
              "Password Reset Requested",
              "If an account exists with this email, you will receive reset instructions shortly.",
            );

            if (onResetRequestSuccess) {
              onResetRequestSuccess();
            }
          } else if (result.validationErrors) {
            setFormError(Object.values(result.validationErrors)[0]);
          } else if (result.error) {
            setFormError(result.error.message);
          }
        } else if (mode === "reset") {
          // Validate password
          const passwordValidation = validatePasswordFormat(data.newPassword);
          if (!passwordValidation.isValid) {
            setFormError(Object.values(passwordValidation.errors)[0]);
            return;
          }

          // Confirm passwords match
          if (data.newPassword !== data.confirmPassword) {
            setFormError("Passwords do not match");
            return;
          }

          // Reset password with token
          const resetData: PasswordResetParams = {
            token: data.token || token || "",
            newPassword: data.newPassword,
          };

          const result = await resetPassword(resetData);

          if (result.success) {
            await dialog.showSuccess(
              "Password Reset",
              "Your password has been reset successfully.",
            );

            if (onResetSuccess) {
              onResetSuccess();
            }
          } else if (result.validationErrors) {
            setFormError(Object.values(result.validationErrors)[0]);
          } else if (result.error) {
            setFormError(result.error.message);
          }
        } else if (mode === "update") {
          // Validate current password
          if (!data.currentPassword) {
            setFormError("Current password is required");
            return;
          }

          // Validate new password
          const passwordValidation = validatePasswordFormat(data.newPassword);
          if (!passwordValidation.isValid) {
            setFormError(Object.values(passwordValidation.errors)[0]);
            return;
          }

          // Confirm passwords match
          if (data.newPassword !== data.confirmPassword) {
            setFormError("Passwords do not match");
            return;
          }

          // Update password
          const result = await updatePassword(
            data.currentPassword,
            data.newPassword,
          );

          if (result.success) {
            await dialog.showSuccess(
              "Password Updated",
              "Your password has been updated successfully.",
            );

            if (onResetSuccess) {
              onResetSuccess();
            }
          } else if (result.validationErrors) {
            setFormError(Object.values(result.validationErrors)[0]);
          } else if (result.error) {
            setFormError(result.error.message);
          }
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
    [
      mode,
      token,
      resetPassword,
      forgotPassword,
      updatePassword,
      dialog,
      onResetSuccess,
      onResetRequestSuccess,
      validatePasswordFormat,
    ],
  );

  // Handle login link click
  const handleLoginClick = useCallback(() => {
    if (onLoginClick) {
      onLoginClick();
    }
  }, [onLoginClick]);

  // Get submit text based on mode
  const getSubmitText = () => {
    if (submitText) return submitText;

    switch (mode) {
      case "forgot":
        return "Send Reset Link";
      case "reset":
        return "Reset Password";
      case "update":
        return "Update Password";
      default:
        return "Submit";
    }
  };

  // Render the password reset form UI component
  return (
    <PasswordResetFormUI
      // Form state
      error={formError || passwordResetError?.message || null}
      isLoading={mode === "forgot" ? isSendingResetEmail : isResettingPassword}
      // Form configuration
      mode={mode}
      token={token}
      initialEmail={initialEmail}
      // UI configuration
      submitText={getSubmitText()}
      showLoginLink={showLoginLink}
      loginText={loginText}
      // Callbacks
      onSubmit={handleSubmit}
      onLoginClick={handleLoginClick}
      // Styling
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default PasswordResetContainer;
