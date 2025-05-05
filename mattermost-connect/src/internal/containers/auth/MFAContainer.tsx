// src/internal/containers/auth/MFAContainer.tsx
/**
 * Multi-Factor Authentication Container
 * Handles MFA validation during authentication
 * Delegates business logic to useAuth hook
 */
import React, { useCallback, useMemo, useState } from "react";
import { FormContainerProps, useFormContainer } from "../base/FormContainer";
import { useAuth } from "../../../hooks/useAuth";
import { useDialog } from "../../hooks/useDialog";
import { useMemoizedProps } from "../../utils/performanceUtils";

// MFA container props
export interface MFAContainerProps extends FormContainerProps<any> {
  /**
   * User ID for the authenticating user
   */
  userId: string;
  /**
   * Authentication session token
   */
  sessionToken?: string;
  /**
   * Callback on successful MFA validation
   */
  onMFASuccess?: (token: string) => void;
  /**
   * Available MFA methods
   */
  availableMethods?: ("totp" | "sms" | "email" | "recovery")[];
  /**
   * Default MFA method
   */
  defaultMethod?: "totp" | "sms" | "email" | "recovery";
  /**
   * Whether to show a back button
   */
  showBackButton?: boolean;
  /**
   * Callback when back button is clicked
   */
  onBackClick?: () => void;
}

/**
 * MFA container
 * Handles multi-factor authentication verification
 */
export const MFAContainer: React.FC<MFAContainerProps> = (props) => {
  const {
    userId,
    sessionToken,
    onMFASuccess,
    availableMethods = ["totp"],
    defaultMethod = "totp",
    showBackButton = true,
    onBackClick,
    children,
    render,
    ...formProps
  } = props;

  // Current MFA method state
  const [currentMethod, setCurrentMethod] = useState<string>(defaultMethod);

  // Use auth hook for MFA functionality
  // Note: This is assuming the useAuth hook would have MFA methods
  // You would need to add these to your actual useAuth hook
  const {
    verifyMFA = async () => ({ success: false }),
    isVerifyingMFA = false,
    mfaError = null,
  } = useAuth() as any;

  // Use dialog for error handling
  const dialog = useDialog();

  // Set initial form data based on method
  const initialData = useMemo(
    () => ({
      code: "",
      method: currentMethod,
    }),
    [currentMethod],
  );

  // Custom validator for the form
  const validateForm = useCallback((data: any) => {
    // Validate MFA code
    if (!data.code) {
      return { code: "Verification code is required" };
    }

    if (data.method === "totp" && !/^\d{6}$/.test(data.code)) {
      return { code: "Code must be 6 digits" };
    }

    if (data.method === "recovery" && data.code.length < 8) {
      return { code: "Recovery code is too short" };
    }

    return true;
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: any) => {
      try {
        const result = await verifyMFA({
          userId,
          code: data.code,
          method: data.method,
          sessionToken,
        });

        if (result.success && result.token) {
          if (onMFASuccess) {
            onMFASuccess(result.token);
          }
          return result;
        } else if (result.validationErrors) {
          return { _errors: result.validationErrors };
        } else if (result.error) {
          throw result.error;
        }

        return null;
      } catch (error) {
        // Let form container handle the error
        throw error instanceof Error
          ? error
          : new Error("MFA verification failed");
      }
    },
    [userId, sessionToken, verifyMFA, onMFASuccess],
  );

  // Handle method change
  const handleMethodChange = useCallback((method: string) => {
    setCurrentMethod(method);
  }, []);

  // Handle back button click
  const handleBackClick = useCallback(() => {
    if (onBackClick) {
      onBackClick();
    }
  }, [onBackClick]);

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
      preventInvalidSubmit: true,
    },
  );

  // Update form when method changes
  React.useEffect(() => {
    formAPI.setFieldValue("method", currentMethod);
  }, [currentMethod, formAPI]);

  // Create memoized UI props
  const uiProps = useMemoizedProps({
    // Form state
    formData: formState.formData,
    errors: formState.errors,
    isValid: formState.isValid,
    isDirty: formState.isDirty,
    isSubmitting: formState.isSubmitting || isVerifyingMFA,
    isSubmitted: formState.isSubmitted,

    // Form actions
    submitForm: formAPI.submitForm,
    resetForm: formAPI.resetForm,
    setFieldValue: formAPI.setFieldValue,
    getFieldProps: formAPI.getFieldProps,

    // MFA specific props
    userId,
    availableMethods,
    currentMethod,
    onMethodChange: handleMethodChange,

    // UI configuration
    showBackButton,

    // UI actions
    onBackClick: handleBackClick,

    // Error handling
    mfaError,
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

export default MFAContainer;
