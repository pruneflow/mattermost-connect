// src/internal/containers/auth/LoginContainer.tsx
/**
 * Login Container
 * Handles authentication login functionality
 * Delegates business logic to useAuth hook
 */
import React, { useCallback, useMemo } from "react";
import { FormContainerProps, useFormContainer } from "../base/FormContainer";
import { useAuth } from "../../../hooks/useAuth";
import { User, LoginParams } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import { useMemoizedProps } from "../../utils/performanceUtils";

// Login container props
export interface LoginContainerProps extends FormContainerProps<LoginParams> {
  /**
   * Initial username value
   */
  initialUsername?: string;
  /**
   * Whether to display remember me option
   */
  showRememberMe?: boolean;
  /**
   * Whether to display server URL field
   */
  showServerUrlField?: boolean;
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
}

/**
 * Login container
 * Handles login form state and submission
 */
export const LoginContainer: React.FC<LoginContainerProps> = (props) => {
  const {
    initialUsername = "",
    showRememberMe = true,
    showServerUrlField = false,
    showRegisterLink = true,
    showForgotPasswordLink = true,
    onRegisterClick,
    onForgotPasswordClick,
    onLoginSuccess,
    children,
    render,
    ...formProps
  } = props;

  // Use auth hook for login functionality
  const { login, isLoggingIn, loginError, validateCredentials } = useAuth();

  // Use dialog for error handling
  const dialog = useDialog();

  // Set initial form data
  const initialData = useMemo(
    () => ({
      username: initialUsername,
      password: "",
      serverUrl: "",
      rememberMe: false,
    }),
    [initialUsername],
  );

  // Custom validator for login form
  const validateForm = useCallback(
    (data: LoginParams) => {
      const validationResult = validateCredentials(
        data.username,
        data.password,
      );

      return validationResult.isValid ? true : validationResult.errors;
    },
    [validateCredentials],
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: LoginParams) => {
      try {
        const result = await login(data);

        if (result.success && result.data) {
          if (onLoginSuccess) {
            onLoginSuccess(result.data);
          }
          return result.data;
        } else if (result.validationErrors) {
          return { _errors: result.validationErrors };
        } else if (result.error) {
          throw result.error;
        }

        return null;
      } catch (error) {
        // Let the form container handle the error
        throw error instanceof Error ? error : new Error("Login failed");
      }
    },
    [login, onLoginSuccess],
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

  // Use form container for form handling
  const [formState, formAPI] = useFormContainer(
    {
      ...formProps,
      initialData,
      validator: validateForm,
      onSubmit: handleSubmit,
    },
    {
      validateOnBlur: true,
      validateOnSubmit: true,
      showValidationImmediately: false,
      preventInvalidSubmit: true,
    },
  );

  // Create memoized UI props
  const uiProps = useMemoizedProps({
    // Form state
    formData: formState.formData,
    errors: formState.errors,
    isValid: formState.isValid,
    isDirty: formState.isDirty,
    isSubmitting: formState.isSubmitting || isLoggingIn,
    isSubmitted: formState.isSubmitted,

    // Form actions
    submitForm: formAPI.submitForm,
    resetForm: formAPI.resetForm,
    setFieldValue: formAPI.setFieldValue,
    getFieldProps: formAPI.getFieldProps,

    // UI configuration
    showRememberMe,
    showServerUrlField,
    showRegisterLink,
    showForgotPasswordLink,

    // UI actions
    onRegisterClick: handleRegisterClick,
    onForgotPasswordClick: handleForgotPasswordClick,

    // Error handling
    loginError,
  });

  // Use render prop pattern
  if (render) {
    return <>{render(uiProps)}</>;
  }

  // Use children render function
  if (typeof children === "function") {
    return <>{children(uiProps)}</>;
  }

  // Return children wrapped with context if needed
  return <>{children}</>;
};

export default LoginContainer;
