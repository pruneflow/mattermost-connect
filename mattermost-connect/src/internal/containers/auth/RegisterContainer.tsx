// src/internal/containers/auth/RegisterContainer.tsx
/**
 * Register Container
 * Handles user registration functionality
 * Delegates business logic to useAuth hook
 */
import React, { useCallback, useMemo } from "react";
import { FormContainerProps, useFormContainer } from "../base/FormContainer";
import { useAuth } from "../../../hooks/useAuth";
import { User, RegistrationParams } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import { useMemoizedProps } from "../../utils/performanceUtils";

// Register container props
export interface RegisterContainerProps
  extends FormContainerProps<RegistrationParams> {
  /**
   * Initial email value
   */
  initialEmail?: string;
  /**
   * Whether to display server URL field
   */
  showServerUrlField?: boolean;
  /**
   * Whether to show a link to login
   */
  showLoginLink?: boolean;
  /**
   * Callback when login link is clicked
   */
  onLoginClick?: () => void;
  /**
   * Callback on successful registration
   */
  onRegisterSuccess?: (user: User) => void;
  /**
   * Whether email verification is required
   */
  requireEmailVerification?: boolean;
}

/**
 * Register container
 * Handles registration form state and submission
 */
export const RegisterContainer: React.FC<RegisterContainerProps> = (props) => {
  const {
    initialEmail = "",
    showServerUrlField = false,
    showLoginLink = true,
    onLoginClick,
    onRegisterSuccess,
    requireEmailVerification = false,
    children,
    render,
    ...formProps
  } = props;

  // Use auth hook for registration functionality
  const {
    register,
    isRegistering,
    registrationError,
    validateRegistrationData,
  } = useAuth();

  // Use dialog for confirmation/error handling
  const dialog = useDialog();

  // Set initial form data
  const initialData = useMemo(
    () => ({
      email: initialEmail,
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      serverUrl: "",
    }),
    [initialEmail],
  );

  // Custom validator for registration form
  const validateForm = useCallback(
    (data: RegistrationParams) => {
      const validationResult = validateRegistrationData(data);
      return validationResult.isValid ? true : validationResult.errors;
    },
    [validateRegistrationData],
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: RegistrationParams) => {
      try {
        const result = await register(data);

        if (result.success && result.data) {
          if (requireEmailVerification) {
            await dialog.showSuccess(
              "Registration Successful",
              "Please check your email to verify your account.",
            );
          }

          if (onRegisterSuccess) {
            onRegisterSuccess(result.data);
          }

          return result.data;
        } else if (result.validationErrors) {
          return { _errors: result.validationErrors };
        } else if (result.error) {
          throw result.error;
        }

        return null;
      } catch (error) {
        // Let form container handle the error
        throw error instanceof Error ? error : new Error("Registration failed");
      }
    },
    [register, dialog, requireEmailVerification, onRegisterSuccess],
  );

  // Handle login link click
  const handleLoginClick = useCallback(() => {
    if (onLoginClick) {
      onLoginClick();
    }
  }, [onLoginClick]);

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
    isSubmitting: formState.isSubmitting || isRegistering,
    isSubmitted: formState.isSubmitted,

    // Form actions
    submitForm: formAPI.submitForm,
    resetForm: formAPI.resetForm,
    setFieldValue: formAPI.setFieldValue,
    getFieldProps: formAPI.getFieldProps,

    // UI configuration
    showServerUrlField,
    showLoginLink,
    requireEmailVerification,

    // UI actions
    onLoginClick: handleLoginClick,

    // Error handling
    registrationError,
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

export default RegisterContainer;
