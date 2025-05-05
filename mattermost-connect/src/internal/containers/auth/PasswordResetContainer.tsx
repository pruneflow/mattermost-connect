// src/internal/containers/auth/PasswordResetContainer.tsx
/**
 * Password Reset Container
 * Handles both password reset request and password reset with token
 * Delegates business logic to useAuth hook
 */
import React, { useCallback, useMemo } from "react";
import { FormContainerProps, useFormContainer } from "../base/FormContainer";
import { useAuth } from "../../../hooks/useAuth";
import { PasswordResetParams } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import { useMemoizedProps } from "../../utils/performanceUtils";
import { validateEmail } from "../../../utils/authValidation";

// Password reset container props
export interface PasswordResetContainerProps extends FormContainerProps<any> {
  /**
   * Initial email value
   */
  initialEmail?: string;
  /**
   * Reset token (if in reset password mode)
   */
  token?: string;
  /**
   * Whether to show login link
   */
  showLoginLink?: boolean;
  /**
   * Callback when login link is clicked
   */
  onLoginClick?: () => void;
  /**
   * Callback on successful password reset request
   */
  onResetRequestSuccess?: () => void;
  /**
   * Callback on successful password reset
   */
  onResetSuccess?: () => void;
}

/**
 * Password Reset container
 * Handles both requesting a password reset and setting a new password
 */
export const PasswordResetContainer: React.FC<PasswordResetContainerProps> = (
  props,
) => {
  const {
    initialEmail = "",
    token,
    showLoginLink = true,
    onLoginClick,
    onResetRequestSuccess,
    onResetSuccess,
    children,
    render,
    ...formProps
  } = props;

  // Determine if we're in request mode or reset mode
  const isResetMode = !!token;

  // Use auth hook for password reset functionality
  const {
    forgotPassword,
    resetPassword,
    isSendingResetEmail,
    isResettingPassword,
    passwordResetError,
    validatePasswordFormat,
  } = useAuth();

  // Use dialog for confirmation/error handling
  const dialog = useDialog();

  // Set initial form data based on mode
  const initialData = useMemo(
    () =>
      isResetMode
        ? { newPassword: "", confirmPassword: "", token }
        : { email: initialEmail },
    [isResetMode, initialEmail, token],
  );

  // Custom validator for the form
  const validateForm = useCallback(
    (data: any) => {
      if (isResetMode) {
        // Validate new password
        const passwordValidation = validatePasswordFormat(data.newPassword);
        if (!passwordValidation.isValid) {
          return passwordValidation.errors;
        }

        // Confirm passwords match
        if (data.newPassword !== data.confirmPassword) {
          return { confirmPassword: "Passwords do not match" };
        }

        return true;
      } else {
        // Validate email
        const emailValidation = validateEmail(data.email);
        return emailValidation.isValid ? true : emailValidation.errors;
      }
    },
    [isResetMode, validatePasswordFormat],
  );

  // Handle form submission based on mode
  const handleSubmit = useCallback(
    async (data: any) => {
      try {
        if (isResetMode) {
          // Reset password with token
          const resetData: PasswordResetParams = {
            token: data.token || token || "",
            newPassword: data.newPassword,
          };

          const result = await resetPassword(resetData);

          if (result.success) {
            await dialog.showSuccess(
              "Password Reset",
              "Your password has been reset successfully.",
            );

            if (onResetSuccess) {
              onResetSuccess();
            }

            return true;
          } else if (result.validationErrors) {
            return { _errors: result.validationErrors };
          } else if (result.error) {
            throw result.error;
          }
        } else {
          // Request password reset email
          const result = await forgotPassword(data.email);

          if (result.success) {
            await dialog.showSuccess(
              "Password Reset Requested",
              "If an account exists with this email, you will receive reset instructions shortly.",
            );

            if (onResetRequestSuccess) {
              onResetRequestSuccess();
            }

            return true;
          } else if (result.validationErrors) {
            return { _errors: result.validationErrors };
          } else if (result.error) {
            throw result.error;
          }
        }

        return null;
      } catch (error) {
        // Let form container handle the error
        throw error instanceof Error
          ? error
          : new Error("Password reset failed");
      }
    },
    [
      isResetMode,
      token,
      resetPassword,
      forgotPassword,
      dialog,
      onResetSuccess,
      onResetRequestSuccess,
    ],
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
    isSubmitting:
      formState.isSubmitting ||
      (isResetMode ? isResettingPassword : isSendingResetEmail),
    isSubmitted: formState.isSubmitted,

    // Form actions
    submitForm: formAPI.submitForm,
    resetForm: formAPI.resetForm,
    setFieldValue: formAPI.setFieldValue,
    getFieldProps: formAPI.getFieldProps,

    // UI configuration
    isResetMode,
    showLoginLink,

    // UI actions
    onLoginClick: handleLoginClick,

    // Error handling
    passwordResetError,
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

export default PasswordResetContainer;
