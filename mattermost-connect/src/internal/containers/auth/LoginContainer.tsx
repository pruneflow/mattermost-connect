// src/internal/containers/auth/LoginContainer.tsx
/**
 * Login Container
 * Handles user authentication login form with standardized patterns
 */
import React, { useMemo, useCallback } from "react";
import { FormContainer, FormContainerProps } from "../base/FormContainer";
import { useContainerLoadingState } from "../../hooks/useContainerLoadingState";
import { useDialog } from "../../hooks/useDialog";
import { User, LoginParams, AuthMode } from "../../../types";
import { useAuthStore } from "../../../core/store/authStore";

/**
 * Login container props
 */
export interface LoginContainerProps {
  /** CSS class name */
  className?: string;
  /** Additional style properties */
  sx?: any;
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
 * Login container component
 * Provides standardized authentication login form
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
  } = props;

  // Get auth store functionality
  const { login, setMode } = useAuthStore();

  // Use loading state hook for standardized loading management
  const { loadingState, loadingActions, loadingProps, withLoading } =
    useContainerLoadingState({
      initialLoading,
      initialError,
      minLoadingTime: 500,
    });

  // Use dialog hook for error handling
  const dialog = useDialog();

  // Set authentication mode if provided
  React.useEffect(() => {
    if (authMode) {
      setMode(authMode);
    }
  }, [authMode, setMode]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: Partial<LoginParams>) => {
      try {
        loadingActions.setLoading(true);

        // Prepare login parameters
        const loginParams: LoginParams = {
          username: data.username || "",
          password: data.password || "",
          serverUrl: showServerUrl ? data.serverUrl : serverUrl,
        };

        // Save username if remember is enabled
        if (rememberUsername && data.username) {
          try {
            localStorage.setItem("mattermost_username", data.username);
          } catch (error) {
            // Silently fail if localStorage is not available
          }
        }

        // Perform login
        const user = await login(loginParams);

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
        void dialog.showError(
          "Login Failed",
          (error as Error).message || "An error occurred during login",
        );

        // Call error callback if provided
        if (onLoginError) {
          onLoginError(error as Error);
        }

        // Re-throw error for form container to handle
        throw error;
      }
    },
    [
      loadingActions,
      login,
      showServerUrl,
      serverUrl,
      rememberUsername,
      onLoginSuccess,
      redirectUrl,
      dialog,
      onLoginError,
    ],
  );

  // Load saved username if remember is enabled
  const savedUsername = useMemo(() => {
    if (!rememberUsername) return "";

    try {
      return localStorage.getItem("mattermost_username") || "";
    } catch (error) {
      return "";
    }
  }, [rememberUsername]);

  // Create form props
  const formProps: FormContainerProps = useMemo(() => {
    // Initialize field configurations
    const fieldConfigs: Record<string, any> = {};

    // Username field
    fieldConfigs.username = {
      label: "Username or Email",
      type: "text",
      autoComplete: "username",
      required: true,
      requiredMessage: "Username is required",
      placeholder: "Enter your username or email",
      defaultValue: savedUsername,
    };

    // Password field
    fieldConfigs.password = {
      label: "Password",
      type: "password",
      autoComplete: "current-password",
      required: true,
      requiredMessage: "Password is required",
      placeholder: "Enter your password",
    };

    // Server URL field (conditional)
    if (showServerUrl) {
      fieldConfigs.serverUrl = {
        label: "Server URL",
        type: "url",
        required: true,
        requiredMessage: "Server URL is required",
        placeholder: "https://your-mattermost-server.com",
        defaultValue: serverUrl || "",
      };
    }

    // Configure available actions
    const availableActions = [];

    if (showForgotPassword && onForgotPasswordClick) {
      availableActions.push({
        id: "forgot-password",
        label: "Forgot Password?",
        onClick: onForgotPasswordClick,
      });
    }

    if (showRegister && onRegisterClick) {
      availableActions.push({
        id: "register",
        label: "Create Account",
        onClick: onRegisterClick,
      });
    }

    // Return the props
    return {
      id,
      className,
      sx,
      initialData: {
        username: savedUsername,
        password: "",
        serverUrl: serverUrl || "",
      },
      fields: fieldConfigs,
      onSubmit: handleSubmit,
      readOnly: disabled || loadingState.isLoading,
      autoFocus: autoFocusUsername ? "username" : undefined,
      submitText: loginButtonText,
      availableActions,
    };
  }, [
    savedUsername,
    showServerUrl,
    serverUrl,
    id,
    className,
    sx,
    handleSubmit,
    disabled,
    loadingState.isLoading,
    autoFocusUsername,
    loginButtonText,
    showForgotPassword,
    onForgotPasswordClick,
    showRegister,
    onRegisterClick,
  ]);

  // Render form container
  return <FormContainer {...formProps} />;
};

export default LoginContainer;
