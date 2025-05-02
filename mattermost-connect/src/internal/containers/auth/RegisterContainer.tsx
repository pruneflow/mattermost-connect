// src/internal/containers/auth/RegisterContainer.tsx
/**
 * Register Container
 * Handles user registration form with standardized patterns
 */
import React, { useMemo, useCallback, useState } from "react";
import { FormContainer, FormContainerProps } from "../base/FormContainer";
import { useContainerLoadingState } from "../../hooks/useContainerLoadingState";
import { useDialog } from "../../hooks/useDialog";
import { User, RegistrationParams, AuthMode } from "../../../types";
import { useAuthStore } from "../../../core/store";
import {
  validateUsername,
  validateEmail,
  validatePassword,
  getPasswordStrength,
} from "../../../utils/authValidation";

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
 * Register container component
 * Provides standardized user registration form
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

  // Get auth store functionality
  const { register, login, setMode } = useAuthStore();

  // Use loading state hook for standardized loading management
  const { loadingState, loadingActions, loadingProps, withLoading } =
    useContainerLoadingState({
      initialLoading,
      initialError,
      minLoadingTime: 500,
    });

  // Use dialog hook for error handling and success messages
  const dialog = useDialog();

  // Track password strength
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: "",
  });

  // Set authentication mode if provided
  React.useEffect(() => {
    if (authMode) {
      setMode(authMode);
    }
  }, [authMode, setMode]);

  // Handle password field change to update strength
  const handlePasswordChange = useCallback(
    (value: string) => {
      if (!showPasswordStrength) return;

      const strength = getPasswordStrength(value);
      setPasswordStrength({
        score: strength.id,
        message: strength.message,
      });
    },
    [showPasswordStrength],
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: Partial<RegistrationParams>) => {
      try {
        loadingActions.setLoading(true);

        // Verify passwords match
        if (data.password !== data.confirmPassword) {
          throw new Error("Passwords do not match");
        }

        // Prepare registration parameters
        const registrationParams: RegistrationParams = {
          username: data.username || "",
          password: data.password || "",
          email: data.email || "",
          firstName: data.firstName,
          lastName: data.lastName,
          serverUrl: showServerUrl ? data.serverUrl : serverUrl,
        };

        // Perform registration
        const user = await register(registrationParams);

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

        // Re-throw error for form container to handle
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

  // Create form validators
  const fieldValidators = useMemo(
    () => ({
      username: (value: string) => {
        const result = validateUsername(value);
        return result.isValid ? true : Object.values(result.errors)[0];
      },
      email: (value: string) => {
        const result = validateEmail(value);
        return result.isValid ? true : Object.values(result.errors)[0];
      },
      password: (value: string) => {
        const result = validatePassword(value);
        handlePasswordChange(value);
        return result.isValid ? true : Object.values(result.errors)[0];
      },
      confirmPassword: (value: string, formData: any) => {
        return value === formData.password ? true : "Passwords do not match";
      },
    }),
    [handlePasswordChange],
  );

  // Create form props
  const formProps: FormContainerProps = useMemo(() => {
    // Initialize field configurations
    const fieldConfigs: Record<string, any> = {};

    // Username field
    fieldConfigs.username = {
      label: "Username",
      type: "text",
      autoComplete: "username",
      required: true,
      requiredMessage: "Username is required",
      placeholder: "Choose a username",
      validator: fieldValidators.username,
      helperText:
        "Username must contain only letters, numbers, dots, hyphens, and underscores",
    };

    // Email field
    fieldConfigs.email = {
      label: "Email",
      type: "email",
      autoComplete: "email",
      required: true,
      requiredMessage: "Email is required",
      placeholder: "Enter your email",
      validator: fieldValidators.email,
    };

    // Password field
    fieldConfigs.password = {
      label: "Password",
      type: "password",
      autoComplete: "new-password",
      required: true,
      requiredMessage: "Password is required",
      placeholder: "Create a password",
      validator: fieldValidators.password,
      helperText: showPasswordStrength ? passwordStrength.message : undefined,
    };

    // Confirm password field
    fieldConfigs.confirmPassword = {
      label: "Confirm Password",
      type: "password",
      autoComplete: "new-password",
      required: true,
      requiredMessage: "Please confirm your password",
      placeholder: "Confirm your password",
      validator: fieldValidators.confirmPassword,
    };

    // First name field
    fieldConfigs.firstName = {
      label: "First Name",
      type: "text",
      autoComplete: "given-name",
      required: false,
      placeholder: "Enter your first name",
    };

    // Last name field
    fieldConfigs.lastName = {
      label: "Last Name",
      type: "text",
      autoComplete: "family-name",
      required: false,
      placeholder: "Enter your last name",
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

    if (showLogin && onLoginClick) {
      availableActions.push({
        id: "login",
        label: "Already have an account? Login",
        onClick: onLoginClick,
      });
    }

    // Return the props
    return {
      id,
      className,
      sx,
      initialData: {
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        serverUrl: serverUrl || "",
      },
      fields: fieldConfigs,
      onSubmit: handleSubmit,
      readOnly: disabled || loadingState.isLoading,
      autoFocus: "username",
      submitText: registerButtonText,
      availableActions,
    };
  }, [
    fieldValidators,
    showPasswordStrength,
    passwordStrength.message,
    showServerUrl,
    serverUrl,
    showLogin,
    onLoginClick,
    id,
    className,
    sx,
    handleSubmit,
    disabled,
    loadingState.isLoading,
    registerButtonText,
  ]);

  // Render form container
  return <FormContainer {...formProps} />;
};

export default RegisterContainer;
