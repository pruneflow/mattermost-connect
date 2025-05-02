// src/internal/containers/auth/PasswordResetContainer.tsx
/**
 * Password Reset Container
 * Handles password reset functionality with standardized patterns
 */
import React, { useMemo, useCallback } from "react";
import { FormContainer, FormContainerProps } from "../base/FormContainer";
import { useContainerLoadingState } from "../../hooks/useContainerLoadingState";
import { useDialog } from "../../hooks/useDialog";
import { AuthMode } from "../../../types";
import { useAuthStore } from "../../../core/store";
import { validateEmail, validatePassword } from "../../../utils/authValidation";

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

  // Get auth store functionality
  const { forgotPassword, resetPassword, updatePassword, setMode } =
    useAuthStore();

  // Use loading state hook for standardized loading management
  const { loadingState, loadingActions } = useContainerLoadingState({
    initialLoading,
    initialError,
    minLoadingTime: 500,
  });

  // Use dialog hook for error handling and success messages
  const dialog = useDialog();

  // Set authentication mode if provided
  React.useEffect(() => {
    if (authMode) {
      setMode(authMode);
    }
  }, [authMode, setMode]);

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
        let result = false;

        switch (mode) {
          case "forgot":
            // Handle forgot password
            result = await forgotPassword(data.email);
            if (result) {
              dialog.showSuccess(
                "Reset Email Sent",
                "We've sent a password reset link to your email address. Please check your inbox.",
              );
            }
            break;

          case "reset":
            // Handle password reset with token
            if (!token) {
              throw new Error("Reset token is missing");
            }
            result = await resetPassword({
              token,
              newPassword: data.newPassword,
            });
            if (result) {
              dialog.showSuccess(
                "Password Reset Successfully",
                "Your password has been reset. You can now login with your new password.",
              );
            }
            break;

          case "update":
            // Handle password update
            result = await updatePassword(
              data.currentPassword,
              data.newPassword,
            );
            if (result) {
              dialog.showSuccess(
                "Password Updated",
                "Your password has been updated successfully.",
              );
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

        // Re-throw error for form container to handle
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

  // Create field validators
  const fieldValidators = useMemo(
    () => ({
      email: (value: string) => {
        const result = validateEmail(value);
        return result.isValid ? true : Object.values(result.errors)[0];
      },
      currentPassword: (value: string) => {
        return value ? true : "Current password is required";
      },
      newPassword: (value: string) => {
        const result = validatePassword(value);
        return result.isValid ? true : Object.values(result.errors)[0];
      },
      confirmPassword: (value: string, formData: any) => {
        return value === formData.newPassword ? true : "Passwords do not match";
      },
    }),
    [],
  );

  // Create form props
  const formProps: FormContainerProps = useMemo(() => {
    // Initialize field configurations and initial data
    const fieldConfigs: Record<string, any> = {};
    const initialData: Record<string, any> = {};

    // Set fields based on mode
    switch (mode) {
      case "forgot":
        fieldConfigs.email = {
          label: "Email",
          type: "email",
          autoComplete: "email",
          required: true,
          requiredMessage: "Email is required",
          placeholder: "Enter your email",
          validator: fieldValidators.email,
          defaultValue: email,
        };
        initialData.email = email;
        break;

      case "reset":
        fieldConfigs.newPassword = {
          label: "New Password",
          type: "password",
          autoComplete: "new-password",
          required: true,
          requiredMessage: "New password is required",
          placeholder: "Enter new password",
          validator: fieldValidators.newPassword,
        };
        fieldConfigs.confirmPassword = {
          label: "Confirm Password",
          type: "password",
          autoComplete: "new-password",
          required: true,
          requiredMessage: "Please confirm your password",
          placeholder: "Confirm new password",
          validator: fieldValidators.confirmPassword,
        };
        initialData.newPassword = "";
        initialData.confirmPassword = "";
        break;

      case "update":
        fieldConfigs.currentPassword = {
          label: "Current Password",
          type: "password",
          autoComplete: "current-password",
          required: true,
          requiredMessage: "Current password is required",
          placeholder: "Enter current password",
          validator: fieldValidators.currentPassword,
        };
        fieldConfigs.newPassword = {
          label: "New Password",
          type: "password",
          autoComplete: "new-password",
          required: true,
          requiredMessage: "New password is required",
          placeholder: "Enter new password",
          validator: fieldValidators.newPassword,
        };
        fieldConfigs.confirmPassword = {
          label: "Confirm Password",
          type: "password",
          autoComplete: "new-password",
          required: true,
          requiredMessage: "Please confirm your password",
          placeholder: "Confirm new password",
          validator: fieldValidators.confirmPassword,
        };
        initialData.currentPassword = "";
        initialData.newPassword = "";
        initialData.confirmPassword = "";
        break;
    }

    // Configure available actions
    const availableActions = [];

    if (showLogin && onLoginClick) {
      availableActions.push({
        id: "login",
        label: "Back to Login",
        onClick: onLoginClick,
      });
    }

    // Set header text based on mode
    const headerText =
      mode === "forgot"
        ? "Reset Password"
        : mode === "reset"
          ? "Create New Password"
          : "Update Password";

    // Return the props
    return {
      id,
      className,
      sx,
      initialData,
      fields: fieldConfigs,
      onSubmit: handleSubmit,
      readOnly: disabled || loadingState.isLoading,
      autoFocus:
        mode === "forgot"
          ? "email"
          : mode === "reset"
            ? "newPassword"
            : "currentPassword",
      submitText: submitButtonText || defaultButtonText,
      availableActions,
      headerText,
    };
  }, [
    mode,
    fieldValidators,
    email,
    showLogin,
    onLoginClick,
    id,
    className,
    sx,
    handleSubmit,
    disabled,
    loadingState.isLoading,
    submitButtonText,
    defaultButtonText,
  ]);

  // Render form container
  return <FormContainer {...formProps} />;
};

export default PasswordResetContainer;
