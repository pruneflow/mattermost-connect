// src/internal/containers/auth/MFAContainer.tsx
/**
 * MFA Container
 * Handles multi-factor authentication with standardized patterns
 * Implements the container pattern with clear separation between logic and UI
 */
import React, { useCallback } from "react";
import {
  BaseContainer,
  BaseContainerProps,
  BaseContainerState,
  BaseContainerAPI,
} from "../base/BaseContainer";
import { useContainerLoadingState } from "../../hooks/useContainerLoadingState";
import { useDialog } from "../../hooks/useDialog";
import { MFAUI } from "../../components/auth/MFAUI";
import { User } from "../../../types";
import { authService } from "../../../core/services/authService";

/**
 * MFA container props
 */
export interface MFAContainerProps extends BaseContainerProps {
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
    ...restProps
  } = props;

  // Use loading state hook for standardized loading management
  const { loadingState, loadingActions, withLoading } =
    useContainerLoadingState({
      initialLoading,
      initialError,
      minLoadingTime: 500,
    });

  // Use dialog hook for error and success messages
  const dialog = useDialog();

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

        // Re-throw error for UI to handle
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

  // Create UI component factory function
  const createUI = useCallback(
    (api: BaseContainerAPI, state: BaseContainerState): React.ReactElement => {
      // Utiliser l'API et l'état du container quand c'est pertinent
      const componentError = state.error || loadingState.error;
      const isComponentLoading = state.isLoading || loadingState.isLoading;

      // Tirer parti de l'API du container pour la gestion des erreurs et du chargement
      const handleFormSubmit = async (data: { code: string }) => {
        return api.withLoading(() => handleSubmit(data));
      };

      const handleResendWithApi = () => {
        api.withLoading(handleResendCode);
      };

      // Prepare UI props
      const mfaUiProps = {
        method,
        error: componentError?.message || null,
        isLoading: isComponentLoading,
        onSubmit: handleFormSubmit,
        onResendCode: showResendOption ? handleResendWithApi : undefined,
        submitText: verifyButtonText,
        autoFocus,
        className,
        sx,
        id,
        disabled: disabled || isComponentLoading,
      };

      return <MFAUI {...mfaUiProps} />;
    },
    [
      loadingState.error,
      loadingState.isLoading,
      handleSubmit,
      handleResendCode,
      method,
      showResendOption,
      verifyButtonText,
      autoFocus,
      className,
      sx,
      id,
      disabled,
    ],
  );

  // Render the UI component with prepared props through the factory function
  return <BaseContainer {...restProps} render={createUI} />;
};

export default MFAContainer;
