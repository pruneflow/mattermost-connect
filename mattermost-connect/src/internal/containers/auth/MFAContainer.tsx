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
import { useAuth } from "../../../hooks/useAuth";
import { authService } from "../../../core/services/authService";

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

  // Use auth hook
  const auth = useAuth();

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: { code: string }) => {
      try {
        loadingActions.setLoading(true);

        if (!userId) {
          throw new Error("User ID is missing");
        }

        // Call authService to verify MFA code
        const user = await authService.verifyMfa({
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
      method,
      onMfaSuccess,
      redirectUrl,
      dialog,
      onMfaError,
    ],
  );

  // Handle resend code
  const handleResendCode = useCallback(() => {
    withLoading(async () => {
      try {
        if (!userId) {
          throw new Error("User ID is missing");
        }

        // Call authService to resend MFA code
        await authService.resendMfaCode({
          userId,
          method,
        });

        dialog.showSuccess(
          "Code Resent",
          method === "totp"
            ? "Please check your authenticator app for the new code."
            : "A new verification code has been sent to your email.",
        );
      } catch (error) {
        dialog.showError(
          "Failed to Resend Code",
          (error as Error).message ||
            "An error occurred when trying to resend the code.",
        );
      }
    });
  }, [dialog, method, withLoading, userId]);

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
        validator: (value: string) => {
          // Validate the code format
          if (!/^\d+$/.test(value)) {
            return "Verification code must contain only digits";
          }

          if (value.length !== 6) {
            return "Verification code must be 6 digits";
          }

          return true;
        },
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
