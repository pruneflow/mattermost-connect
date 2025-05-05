// src/internal/containers/auth/PasswordResetContainer.tsx
import React, { useCallback, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useFormContainer } from "../base/FormContainer";
import { PasswordResetParams } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import PasswordResetFormUI, {
  PasswordResetMode,
} from "../../components/auth/PasswordResetFormUI";
import { validateEmail } from "../../../utils/authValidation";

export interface PasswordResetContainerProps {
  mode?: PasswordResetMode;
  initialEmail?: string;
  token?: string;
  submitText?: string;
  showLoginLink?: boolean;
  loginText?: string;
  onLoginClick?: () => void;
  onResetRequestSuccess?: () => void;
  onResetSuccess?: () => void;
  className?: string;
  sx?: React.CSSProperties;
  id?: string;
}

const PasswordResetContainer: React.FC<PasswordResetContainerProps> = (
  props,
) => {
  const {
    mode: initialMode = "forgot",
    initialEmail = "",
    token,
    submitText,
    showLoginLink = true,
    loginText = "Back to Login",
    onLoginClick,
    onResetRequestSuccess,
    onResetSuccess,
    className,
    sx,
    id,
  } = props;

  const [mode] = useState<PasswordResetMode>(token ? "reset" : initialMode);
  const dialog = useDialog();

  const {
    forgotPassword,
    resetPassword,
    updatePassword,
    validatePasswordFormat,
  } = useAuth();

  const getInitialData = () => {
    switch (mode) {
      case "forgot":
        return { email: initialEmail };
      case "reset":
        return { token: token || "", newPassword: "", confirmPassword: "" };
      case "update":
        return {
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        };
      default:
        return {};
    }
  };

  const getValidator = () => {
    switch (mode) {
      case "forgot":
        return (data: any) => {
          const emailValidation = validateEmail(data.email);
          return emailValidation.isValid ? true : emailValidation.errors;
        };
      case "reset":
      case "update":
        return (data: any) => {
          if (mode === "update" && !data.currentPassword) {
            return { currentPassword: "Current password is required" };
          }

          const passwordValidation = validatePasswordFormat(data.newPassword);
          if (!passwordValidation.isValid) {
            return passwordValidation.errors;
          }

          if (data.newPassword !== data.confirmPassword) {
            return { confirmPassword: "Passwords do not match" };
          }

          return true;
        };
      default:
        return () => true;
    }
  };

  const getSubmitHandler = () => {
    switch (mode) {
      case "forgot":
        return async (data: any) => {
          const result = await forgotPassword(data.email);
          if (result.success) {
            await dialog.showSuccess(
              "Password Reset Requested",
              "If an account exists with this email, you will receive reset instructions shortly.",
            );

            if (onResetRequestSuccess) {
              onResetRequestSuccess();
            }
          }
          return result;
        };
      case "reset":
        return async (data: any) => {
          const resetData: PasswordResetParams = {
            token: data.token,
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
          }
          return result;
        };
      case "update":
        return async (data: any) => {
          const result = await updatePassword(
            data.currentPassword,
            data.newPassword,
          );
          if (result.success) {
            await dialog.showSuccess(
              "Password Updated",
              "Your password has been updated successfully.",
            );

            if (onResetSuccess) {
              onResetSuccess();
            }
          }
          return result;
        };
      default:
        return async () => ({ success: false });
    }
  };

  const [formState, formAPI] = useFormContainer({
    initialData: getInitialData(),
    validator: getValidator(),
    onSubmit: getSubmitHandler(),
  });

  const handleLoginClick = useCallback(() => {
    if (onLoginClick) {
      onLoginClick();
    }
  }, [onLoginClick]);

  const handleSubmit = useCallback(
    (data: any) => {
      Object.entries(data).forEach(([key, value]) => {
        formAPI.setFieldValue(key, value);
      });
      formAPI.submitForm();
    },
    [formAPI],
  );

  const getSubmitText = () => {
    if (submitText) return submitText;

    switch (mode) {
      case "forgot":
        return "Send Reset Link";
      case "reset":
        return "Reset Password";
      case "update":
        return "Update Password";
      default:
        return "Submit";
    }
  };

  const uiProps = {
    error: formState.hasError ? formState.error?.message || null : null,
    isLoading: formState.isSubmitting,
    mode,
    token,
    initialEmail,
    submitText: getSubmitText(),
    showLoginLink,
    loginText,
    onSubmit: handleSubmit,
    onLoginClick: handleLoginClick,
    className,
    sx,
    id,
  };

  return <PasswordResetFormUI {...uiProps} />;
};

export default PasswordResetContainer;
