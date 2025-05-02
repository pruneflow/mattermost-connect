// src/internal/containers/auth/RegisterContainer.tsx
/**
 * Register Container
 * Container component that handles user registration logic and state
 * Implements the container pattern with clear separation between logic and UI
 */
import React, { useCallback, useState } from "react";
import { BaseContainer } from "../base/BaseContainer";
import { useContainerLoadingState } from "../../hooks/useContainerLoadingState";
import { useDialog } from "../../hooks/useDialog";
import { RegisterFormUI } from "../../components/auth/RegisterFormUI";
import { User, RegistrationParams, AuthMode } from "../../../types";
import { useAuth } from "../../../hooks";
import { getPasswordStrength } from "../../../utils/authValidation";

/**
 * Registration container props
 */
export interface RegisterContainerProps {
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
  /** Custom text for register button */
  registerButtonText?: string;
  /** Callback after successful registration */
  onRegisterSuccess?: (user: User) => void;
  /** Callback after registration failure */
  onRegisterError?: (error: Error) => void;
  /** URL to redirect to after successful registration */
  redirectUrl?: string;
  /** Whether to auto-login after registration */
  autoLogin?: boolean;
  /** Whether to show login link */
  showLogin?: boolean;
  /** Callback when login is clicked */
  onLoginClick?: () => void;
  /** Whether to show password strength indicator */
  showPasswordStrength?: boolean;
  /** Whether to require email verification */
  requireEmailVerification?: boolean;
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
 * Container component for user registration
 * Handles registration logic while delegating rendering to RegisterFormUI
 */
export const RegisterContainer: React.FC<RegisterContainerProps> = (props) => {
  const {
    className,
    sx,
    serverUrl,
    showServerUrl = false,
    authMode,
    registerButtonText = "Register",
    onRegisterSuccess,
    onRegisterError,
    redirectUrl,
    autoLogin = false,
    showLogin = true,
    onLoginClick,
    showPasswordStrength = true,
    requireEmailVerification = true,
    id,
    initialLoading,
    initialError,
    disabled,
  } = props;

  // Use Auth hook for registration operations
  const { register, login, setAuthMode } = useAuth();

  // Use loading state hook for standardized loading management
  const { loadingState, loadingActions } = useContainerLoadingState({
    initialLoading,
    initialError,
    minLoadingTime: 500,
  });

  // Use dialog hook for error and success messages
  const dialog = useDialog();

  // Track password strength
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: "",
  });

  // Set authentication mode if provided
  React.useEffect(() => {
    if (authMode) {
      setAuthMode(authMode);
    }
  }, [authMode, setAuthMode]);

  // Handle password field change to update strength
  const handlePasswordChange = useCallback(
    (password: string) => {
      if (!showPasswordStrength) return;

      const strength = getPasswordStrength(password);
      setPasswordStrength({
        score: strength.id,
        message: strength.message,
      });
    },
    [showPasswordStrength],
  );

  // Handle registration form submission
  const handleSubmit = useCallback(
    async (
      username: string,
      email: string,
      password: string,
      confirmPassword: string,
      firstName?: string,
      lastName?: string,
      serverUrlValue?: string,
    ) => {
      try {
        loadingActions.setLoading(true);

        // Verify passwords match
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }

        // Prepare registration parameters
        const registrationParams: RegistrationParams = {
          username,
          password,
          email,
          firstName,
          lastName,
          serverUrl: showServerUrl ? serverUrlValue : serverUrl,
        };

        // Perform registration
        const result = await register(registrationParams);

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
          throw new Error("Registration failed");
        }

        const user = result.data!;

        // Show success message
        dialog.showSuccess(
          "Registration Successful",
          requireEmailVerification
            ? "Your account has been created. Please check your email to verify your account."
            : "Your account has been created successfully.",
        );

        // Auto-login if enabled
        if (autoLogin && !requireEmailVerification) {
          try {
            await login({
              username: registrationParams.username,
              password: registrationParams.password,
              serverUrl: registrationParams.serverUrl,
            });
          } catch (loginError) {
            console.error("Auto-login failed:", loginError);
            // Continue with registration success flow even if auto-login fails
          }
        }

        // Call success callback if provided
        if (onRegisterSuccess) {
          onRegisterSuccess(user);
        }

        // Redirect if URL is provided and auto-login is enabled
        if (redirectUrl && autoLogin && !requireEmailVerification) {
          window.location.href = redirectUrl;
        }

        loadingActions.setLoading(false);
        return user;
      } catch (error) {
        loadingActions.setLoading(false);

        // Handle error with dialog
        dialog.showError(
          "Registration Failed",
          (error as Error).message || "An error occurred during registration",
        );

        // Call error callback if provided
        if (onRegisterError) {
          onRegisterError(error as Error);
        }

        throw error;
      }
    },
    [
      loadingActions,
      register,
      login,
      showServerUrl,
      serverUrl,
      requireEmailVerification,
      autoLogin,
      dialog,
      onRegisterSuccess,
      onRegisterError,
      redirectUrl,
    ],
  );

  // Prepare UI props for the registration form
  const registerFormProps = {
    error: loadingState.error?.message || null,
    isLoading: loadingState.isLoading,
    showServerUrl,
    initialServerUrl: serverUrl,
    passwordStrength: showPasswordStrength ? passwordStrength : undefined,
    showPasswordStrength,
    title: "Create Account",
    submitText: registerButtonText,
    showLogin,
    onSubmit: handleSubmit,
    onLoginClick,
    onPasswordChange: handlePasswordChange,
    className,
    sx,
    id,
    disabled: disabled || loadingState.isLoading,
  };

  // Render the RegisterFormUI with prepared props
  return (
    <BaseContainer
      {...props}
      render={(api, state) => <RegisterFormUI {...registerFormProps} />}
    />
  );
};

export default RegisterContainer;
