// src/internal/containers/auth/LoginContainer.tsx
/**
 * Login Container
 * Handles authentication login functionality
 * Delegates business logic to useAuth hook
 */
import React, { useCallback, useMemo, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { User, LoginParams } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import LoginFormUI from "../../components/auth/LoginFormUI";

// Login container props
export interface LoginContainerProps {
  /**
   * Initial username value
   */
  initialUsername?: string;
  /**
   * Initial server URL value
   */
  initialServerUrl?: string;
  /**
   * Whether to display remember me option
   */
  showRememberMe?: boolean;
  /**
   * Whether to display server URL field
   */
  showServerUrl?: boolean;
  /**
   * Custom title for the login form
   */
  title?: string;
  /**
   * Custom submit button text
   */
  submitText?: string;
  /**
   * Whether to display register link
   */
  showRegisterLink?: boolean;
  /**
   * Whether to display forgot password link
   */
  showForgotPasswordLink?: boolean;
  /**
   * Callback when register link is clicked
   */
  onRegisterClick?: () => void;
  /**
   * Callback when forgot password link is clicked
   */
  onForgotPasswordClick?: () => void;
  /**
   * Callback on successful login
   */
  onLoginSuccess?: (user: User) => void;
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
 * Login container
 * Handles login form state and submission
 */
const LoginContainer: React.FC<LoginContainerProps> = (props) => {
  const {
    initialUsername = "",
    initialServerUrl = "",
    showRememberMe = true,
    showServerUrl = false,
    title = "Sign In",
    submitText = "Sign In",
    showRegisterLink = true,
    showForgotPasswordLink = true,
    onRegisterClick,
    onForgotPasswordClick,
    onLoginSuccess,
    className,
    sx,
    id,
  } = props;

  // Form state
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState("");
  const [serverUrl, setServerUrl] = useState(initialServerUrl);
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Use auth hook for login functionality
  const { login, isLoggingIn, loginError, validateCredentials } = useAuth();

  // Use dialog for error handling
  const dialog = useDialog();

  // Handle form submission
  const handleSubmit = useCallback(
    async (
      submittedUsername: string,
      submittedPassword: string,
      submittedServerUrl?: string,
      submittedRememberMe?: boolean,
    ) => {
      try {
        // Clear previous errors
        setFormError(null);

        // Validate credentials
        const validationResult = validateCredentials(
          submittedUsername,
          submittedPassword,
        );

        if (!validationResult.isValid) {
          // Show first validation error
          const firstError = Object.values(validationResult.errors)[0];
          setFormError(firstError);
          return;
        }

        // Prepare login parameters
        const loginParams: LoginParams = {
          username: submittedUsername,
          password: submittedPassword,
        };

        // Add server URL if needed
        if (showServerUrl && submittedServerUrl) {
          loginParams.serverUrl = submittedServerUrl;
        }

        // Attempt login
        const result = await login(loginParams);

        if (result.success && result.data) {
          if (onLoginSuccess) {
            onLoginSuccess(result.data);
          }
        } else if (result.validationErrors) {
          // Show first validation error
          const firstError = Object.values(result.validationErrors)[0];
          setFormError(firstError);
        } else if (result.error) {
          setFormError(result.error.message);
        }
      } catch (error) {
        // Handle unexpected errors
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during login";
        setFormError(errorMessage);
      }
    },
    [login, onLoginSuccess, showServerUrl, validateCredentials],
  );

  // Handle register link click
  const handleRegisterClick = useCallback(() => {
    if (onRegisterClick) {
      onRegisterClick();
    }
  }, [onRegisterClick]);

  // Handle forgot password link click
  const handleForgotPasswordClick = useCallback(() => {
    if (onForgotPasswordClick) {
      onForgotPasswordClick();
    }
  }, [onForgotPasswordClick]);

  // Create additional UI-specific props
  const additionalProps = useMemo(() => {
    return {
      registerText: "Don't have an account? Sign up",
      forgotPasswordText: "Forgot password?",
    };
  }, []);

  // Render the login form UI component
  return (
    <LoginFormUI
      // Form data
      initialUsername={username}
      initialServerUrl={serverUrl}
      // Form state
      error={formError || loginError?.message || null}
      isLoading={isLoggingIn}
      // Form configuration
      showRememberMe={showRememberMe}
      showServerUrl={showServerUrl}
      title={title}
      submitText={submitText}
      // UI configuration
      registerText={additionalProps.registerText}
      forgotPasswordText={additionalProps.forgotPasswordText}
      showRegisterLink={showRegisterLink}
      showForgotPasswordLink={showForgotPasswordLink}
      // Callbacks
      onSubmit={handleSubmit}
      onRegisterClick={handleRegisterClick}
      onForgotPasswordClick={handleForgotPasswordClick}
      // Styling
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default LoginContainer;
