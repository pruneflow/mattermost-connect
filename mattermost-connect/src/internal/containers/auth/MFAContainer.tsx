// src/internal/containers/auth/MFAContainer.tsx
/**
 * MFA Container
 * Handles multi-factor authentication with standardized patterns
 */
import React, { useMemo, useCallback } from "react";
import { FormContainer, FormContainerProps } from "../base/FormContainer";
import { useContainerLoadingState } from "../../hooks/useContainerLoadingState";
import { useDialog } from "../../hooks/useDialog";
import { User } from "../../../types";
import { useAuthStore } from "../../../core/store";

/**
 * MFA container props
 */
export interface MFAContainerProps {
  /** CSS class name */
  className?: string;
  /** Additional style properties */
  sx?: any;
  /** User ID for which MFA is being verified */
  userId?: string;
  /** Callback after successful MFA verification */
  onMfaSuccess?: (user: User) => void;
  /** Callback after MFA verification failure */
  onMfaError?: (error: Error) => void;
  /** URL to redirect to after successful verification */
  redirectUrl?: string;
  /** Custom text for verify button */
  verifyButtonText?: string;
  /** Whether to show resend code option */
  showResendOption?: boolean;
  /** MFA method (totp or email) */
  method?: "totp" | "email";
  /** Whether the form should auto-focus */
  autoFocus?: boolean;
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
 * Interface for handling MFA verification
 * This would typically be implemented in the authService
 */
interface MfaVerificationParams {
  userId: string;
  code: string;
  method: "totp" | "email";
}

/**
 * MFA container component
 * Provides standardized multi-factor authentication
 */
export const MFAContainer: React.FC<MFAContainerProps> = (props) => {
  const {
    className,
    sx,
    userId,
    onMfaSuccess,
    onMfaError,
    redirectUrl,
    verifyButtonText = "Verify",
    showResendOption = true,
    method = "totp",
    autoFocus = true,
    id,
    initialLoading,
    initialError,
    disabled,
  } = props;

  // Use loading state hook for standardized loading management
  const { loadingState, loadingActions, loadingProps, withLoading } =
    useContainerLoadingState({
      initialLoading,
      initialError,
      minLoadingTime: 500,
    });

  // Use dialog hook for error handling
  const dialog = useDialog();

  // Get auth store
  const authStore = useAuthStore();

  // Create a mock function for MFA verification
  // In a real implementation, this would be provided by authService
  const verifyMfa = useCallback(
    async (params: MfaVerificationParams): Promise<User> => {
      // This is a placeholder. In a real implementation, this would call the auth service
      // For now, we'll pretend the MFA verification succeeds if the code is "123456"
      if (params.code === "123456") {
        // For demo purposes, return the current user if available
        const currentUser = authStore.currentUser;
        if (currentUser) {
          return currentUser;
        }
        throw new Error("User not found");
      }
      throw new Error("Invalid verification code");
    },
    [authStore.currentUser],
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: { code: string }) => {
      try {
        loadingActions.setLoading(true);

        if (!userId) {
          throw new Error("User ID is missing");
        }

        // Verify MFA code
        const user = await verifyMfa({
          userId,
          code: data.code,
          method,
        });

        // Call success callback if provided
        if (onMfaSuccess) {
          onMfaSuccess(user);
        }

        // Redirect if URL is provided
        if (redirectUrl) {
          window.location.href = redirectUrl;
        }

        loadingActions.setLoading(false);
        return user;
      } catch (error) {
        loadingActions.setLoading(false);

        // Handle error with dialog
        dialog.showError(
          "Verification Failed",
          (error as Error).message || "An error occurred during verification",
        );

        // Call error callback if provided
        if (onMfaError) {
          onMfaError(error as Error);
        }

        // Re-throw error for form container to handle
        throw error;
      }
    },
    [
      loadingActions,
      userId,
      verifyMfa,
      method,
      onMfaSuccess,
      redirectUrl,
      dialog,
      onMfaError,
    ],
  );

  // Handle resend code
  const handleResendCode = useCallback(() => {
    dialog.showSuccess(
      "Code Resent",
      method === "totp"
        ? "Please check your authenticator app for the new code."
        : "A new verification code has been sent to your email.",
    );
    // In a real implementation, this would call the auth service to resend the code
  }, [dialog, method]);

  // Create form props
  const formProps: FormContainerProps = useMemo(() => {
    // Initialize field configurations
    const fieldConfigs: Record<string, any> = {
      code: {
        label: method === "totp" ? "Authentication Code" : "Email Code",
        type: "text",
        inputMode: "numeric",
        pattern: "[0-9]*",
        autoComplete: "one-time-code",
        required: true,
        requiredMessage: "Verification code is required",
        placeholder:
          method === "totp" ? "Enter 6-digit code" : "Enter code from email",
        maxLength: 6,
      },
    };

    // Configure available actions
    const availableActions = [];

    if (showResendOption) {
      availableActions.push({
        id: "resend-code",
        label: "Resend Code",
        onClick: handleResendCode,
      });
    }

    // Set header and helper text based on method
    const headerText =
      method === "totp" ? "Two-Factor Authentication" : "Email Verification";

    const helperText =
      method === "totp"
        ? "Enter the 6-digit code from your authenticator app"
        : "Enter the verification code sent to your email";

    // Return the props
    return {
      id,
      className,
      sx,
      initialData: {
        code: "",
      },
      fields: fieldConfigs,
      onSubmit: handleSubmit,
      readOnly: disabled || loadingState.isLoading,
      autoFocus: autoFocus ? "code" : undefined,
      submitText: verifyButtonText,
      availableActions,
      headerText,
      helperText,
    };
  }, [
    method,
    showResendOption,
    handleResendCode,
    id,
    className,
    sx,
    handleSubmit,
    disabled,
    loadingState.isLoading,
    autoFocus,
    verifyButtonText,
  ]);

  // Render form container
  return <FormContainer {...formProps} />;
};

export default MFAContainer;
