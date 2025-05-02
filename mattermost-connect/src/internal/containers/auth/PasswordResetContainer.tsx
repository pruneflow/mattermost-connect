// src/internal/containers/auth/PasswordResetContainer.tsx
/**
 * Password Reset Container
 * Handles password reset functionality with standardized patterns
 * Implements the container pattern with clear separation between logic and UI
 */
import React, { useMemo, useCallback } from "react";
import { BaseContainer } from "../base/BaseContainer";
import { useContainerLoadingState } from "../../hooks/useContainerLoadingState";
import { useDialog } from "../../hooks/useDialog";
import { PasswordResetFormUI } from "../../components/auth/PasswordResetFormUI";
import { AuthMode } from "../../../types";
import { useAuth } from "../../../hooks";

/**
 * Mode for the password reset container
 */
export type PasswordResetMode = "forgot" | "reset" | "update";

/**
 * Password reset container props
 */
export interface PasswordResetContainerProps {
  /** CSS class name */
  className?: string;
  /** Additional style properties */
  sx?: any;
  /** Mode of the password reset container */
  mode?: PasswordResetMode;
  /** Reset token (required for reset mode) */
  token?: string;
  /** Which auth mode to use */
  authMode?: AuthMode;
  /** Custom text for submit button */
  submitButtonText?: string;
  /** Callback after successful password reset */
  onResetSuccess?: () => void;
  /** Callback after password reset failure */
  onResetError?: (error: Error) => void;
  /** URL to redirect to after successful reset */
  redirectUrl?: string;
  /** Whether to show login link */
  showLogin?: boolean;
  /** Callback when login is clicked */
  onLoginClick?: () => void;
  /** Email for forgot password (pre-filled) */
  email?: string;
  /** ID for the container */
  id?: string;
  /** Initial loading state */
  initialLoading?: boolean;
  /** Initial error */
  initialError?: Error | null;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * Password Reset container component
 * Provides standardized password reset functionality
 */
export const PasswordResetContainer: React.FC<PasswordResetContainerProps> = (
  props,
) => {
  const {
    className,
    sx,
    mode = "forgot",
    token,
    authMode,
    submitButtonText,
    onResetSuccess,
    onResetError,
    redirectUrl,
    showLogin = true,
    onLoginClick,
    email = "",
    id,
    initialLoading,
    initialError,
    disabled,
  } = props;

  // Use Auth hook for password reset operations
  const { forgotPassword, resetPassword, updatePassword, setAuthMode } =
    useAuth();

  // Use loading state hook for standardized loading management
  const { loadingState, loadingActions } = useContainerLoadingState({
    initialLoading,
    initialError,
    minLoadingTime: 500,
  });

  // Use dialog hook for error and success messages
  const dialog = useDialog();

  // Default button text based on mode
  const defaultButtonText = useMemo(() => {
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
  }, [mode]);

  // Set authentication mode if provided
  React.useEffect(() => {
    if (authMode) {
      setAuthMode(authMode);
    }
  }, [authMode, setAuthMode]);

  // Check if token is provided for reset mode
  React.useEffect(() => {
    if (mode === "reset" && !token) {
      console.error("Token is required for reset mode");
      dialog.showError(
        "Invalid Reset Link",
        "The password reset link is invalid or has expired.",
      );
    }
  }, [mode, token, dialog]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: any) => {
      try {
        loadingActions.setLoading(true);
        let result;

        switch (mode) {
          case "forgot":
            // Handle forgot password
            result = await forgotPassword(data.email || "");
            if (result.success) {
              dialog.showSuccess(
                "Reset Email Sent",
                "We've sent a password reset link to your email address. Please check your inbox.",
              );
            } else if (result.error) {
              throw result.error;
            } else if (result.validationErrors) {
              const errorMessage = Object.values(result.validationErrors).join(
                ", ",
              );
              throw new Error(errorMessage);
            }
            break;

          case "reset":
            // Handle password reset with token
            if (!token) {
              throw new Error("Reset token is missing");
            }

            if (data.newPassword !== data.confirmPassword) {
              throw new Error("Passwords do not match");
            }

            result = await resetPassword({
              token,
              newPassword: data.newPassword || "",
            });

            if (result.success) {
              dialog.showSuccess(
                "Password Reset Successfully",
                "Your password has been reset. You can now login with your new password.",
              );
            } else if (result.error) {
              throw result.error;
            } else if (result.validationErrors) {
              const errorMessage = Object.values(result.validationErrors).join(
                ", ",
              );
              throw new Error(errorMessage);
            }
            break;

          case "update":
            // Handle password update
            if (data.newPassword !== data.confirmPassword) {
              throw new Error("Passwords do not match");
            }

            result = await updatePassword(
              data.currentPassword || "",
              data.newPassword || "",
            );

            if (result.success) {
              dialog.showSuccess(
                "Password Updated",
                "Your password has been updated successfully.",
              );
            } else if (result.error) {
              throw result.error;
            } else if (result.validationErrors) {
              const errorMessage = Object.values(result.validationErrors).join(
                ", ",
              );
              throw new Error(errorMessage);
            }
            break;

          default:
            throw new Error(`Unsupported mode: ${mode}`);
        }

        // Call success callback if provided
        if (onResetSuccess) {
          onResetSuccess();
        }

        // Redirect if URL is provided
        if (redirectUrl) {
          window.location.href = redirectUrl;
        }

        loadingActions.setLoading(false);
        return result;
      } catch (error) {
        loadingActions.setLoading(false);

        // Handle error with dialog
        dialog.showError(
          "Password Reset Failed",
          (error as Error).message || "An error occurred during password reset",
        );

        // Call error callback if provided
        if (onResetError) {
          onResetError(error as Error);
        }

        // Re-throw error for UI to handle
        throw error;
      }
    },
    [
      loadingActions,
      mode,
      token,
      forgotPassword,
      resetPassword,
      updatePassword,
      dialog,
      onResetSuccess,
      onResetError,
      redirectUrl,
    ],
  );

  // Prepare UI props for the password reset form
  const resetFormProps = {
    mode,
    token,
    initialEmail: email,
    error: loadingState.error?.message || null,
    isLoading: loadingState.isLoading,
    onSubmit: handleSubmit,
    submitText: submitButtonText || defaultButtonText,
    showLogin,
    onLoginClick,
    className,
    sx,
    id,
    disabled: disabled || loadingState.isLoading,
  };

  // Render the PasswordResetFormUI with prepared props
  return (
    <BaseContainer
      {...props}
      render={(api, state) => <PasswordResetFormUI {...resetFormProps} />}
    />
  );
};

export default PasswordResetContainer;
