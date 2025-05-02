// src/internal/containers/auth/LoginContainer.tsx
/**
 * Login Container
 * Container component that handles login logic and state
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
import { default as DirectLoginFormUI } from "../../components/auth/DirectLoginFormUI";
import { default as ProxyLoginFormUI } from "../../components/auth/ProxyLoginFormUI";
import { User, LoginParams, AuthMode } from "../../../types";
import { useAuth } from "../../../hooks";

/**
 * Login container props
 */
export interface LoginContainerProps extends BaseContainerProps {
  /** Server URL for direct mode */
  serverUrl?: string;
  /** Whether to display server URL field */
  showServerUrl?: boolean;
  /** Which auth mode to use */
  authMode?: AuthMode;
  /** Whether to remember the username */
  rememberUsername?: boolean;
  /** Custom text for login button */
  loginButtonText?: string;
  /** Callback after successful login */
  onLoginSuccess?: (user: User) => void;
  /** Callback after login failure */
  onLoginError?: (error: Error) => void;
  /** URL to redirect to after successful login */
  redirectUrl?: string;
  /** Whether to auto-focus the username field */
  autoFocusUsername?: boolean;
  /** Whether to show forgot password link */
  showForgotPassword?: boolean;
  /** Callback when forgot password is clicked */
  onForgotPasswordClick?: () => void;
  /** Whether to show registration link */
  showRegister?: boolean;
  /** Callback when register is clicked */
  onRegisterClick?: () => void;
}

/**
 * Container component for user login
 * Handles authentication logic while delegating rendering to appropriate login form UI
 */
export const LoginContainer: React.FC<LoginContainerProps> = (props) => {
  const {
    className,
    sx,
    serverUrl,
    showServerUrl = false,
    authMode,
    rememberUsername = true,
    loginButtonText = "Login",
    onLoginSuccess,
    onLoginError,
    redirectUrl,
    autoFocusUsername = true,
    showForgotPassword = true,
    onForgotPasswordClick,
    showRegister = true,
    onRegisterClick,
    id,
    initialLoading,
    initialError,
    disabled,
    ...restProps
  } = props;

  // Use Auth hook for authentication operations
  const { login, setAuthMode } = useAuth();

  // Use loading state hook for standardized loading management
  const { loadingState, loadingActions } = useContainerLoadingState({
    initialLoading,
    initialError,
    minLoadingTime: 500,
  });

  // Use dialog hook for error handling
  const dialog = useDialog();

  // Set authentication mode if provided
  React.useEffect(() => {
    if (authMode) {
      setAuthMode(authMode);
    }
  }, [authMode, setAuthMode]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (
      username: string,
      password: string,
      serverUrl?: string,
      rememberMe?: boolean,
    ) => {
      try {
        loadingActions.setLoading(true);

        // Prepare login parameters
        const loginParams: LoginParams = {
          username,
          password,
          serverUrl: showServerUrl ? serverUrl : undefined,
        };

        // Save username if remember is enabled
        if (rememberUsername && username) {
          try {
            localStorage.setItem("mattermost_username", username);
          } catch (error) {
            // Silently fail if localStorage is not available
          }
        }

        // Perform login
        const result = await login(loginParams);

        if (!result.success) {
          if (result.validationErrors) {
            const errorMessage = Object.values(result.validationErrors).join(
              ", ",
            );
            throw new Error(errorMessage);
          }
          if (result.error) {
            throw result.error;
          }
          throw new Error("Login failed");
        }

        const user = result.data!;

        // Call success callback if provided
        if (onLoginSuccess) {
          onLoginSuccess(user);
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
          "Login Failed",
          (error as Error).message || "An error occurred during login",
        );

        // Call error callback if provided
        if (onLoginError) {
          onLoginError(error as Error);
        }

        throw error;
      }
    },
    [
      loadingActions,
      login,
      showServerUrl,
      rememberUsername,
      onLoginSuccess,
      redirectUrl,
      dialog,
      onLoginError,
    ],
  );

  // Get saved username from localStorage
  const savedUsername = React.useMemo(() => {
    if (!rememberUsername) return "";

    try {
      return localStorage.getItem("mattermost_username") || "";
    } catch (error) {
      return "";
    }
  }, [rememberUsername]);

  // Create UI component factory function
  const createUI = useCallback(
    (api: BaseContainerAPI, state: BaseContainerState): React.ReactElement => {
      // Utiliser l'API et l'état du container quand c'est pertinent
      const componentError = state.error || loadingState.error;
      const isComponentLoading = state.isLoading || loadingState.isLoading;

      // Tirer parti de l'API du container pour la gestion des erreurs
      const handleFormSubmit = async (
        username: string,
        password: string,
        serverUrl?: string,
        rememberMe?: boolean,
      ) => {
        return api.withLoading(() =>
          handleSubmit(username, password, serverUrl, rememberMe),
        );
      };

      // Create common props for login UI components
      const commonLoginProps = {
        error: componentError?.message || null,
        isLoading: isComponentLoading,
        showRememberMe: rememberUsername,
        onSubmit: handleFormSubmit,
        title: "Sign In",
        submitText: loginButtonText,
        initialUsername: savedUsername,
        className,
        sx,
        id,
        showForgotPassword,
        onForgotPasswordClick,
        showRegister,
        onRegisterClick,
        autoFocus: autoFocusUsername,
        disabled: disabled || isComponentLoading,
      };

      // Choose the appropriate UI component based on whether server URL is needed
      if (showServerUrl) {
        return (
          <DirectLoginFormUI
            {...commonLoginProps}
            initialServerUrl={serverUrl}
          />
        );
      } else {
        return <ProxyLoginFormUI {...commonLoginProps} />;
      }
    },
    [
      loadingState.error,
      loadingState.isLoading,
      rememberUsername,
      handleSubmit,
      loginButtonText,
      savedUsername,
      className,
      sx,
      id,
      showForgotPassword,
      onForgotPasswordClick,
      showRegister,
      onRegisterClick,
      autoFocusUsername,
      disabled,
      showServerUrl,
      serverUrl,
    ],
  );

  // Render the UI component with prepared props through the factory function
  return <BaseContainer {...restProps} render={createUI} />;
};

export default LoginContainer;
