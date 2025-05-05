// src/internal/containers/auth/MFAContainer.tsx
import React, { useCallback } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useFormContainer } from "../base/FormContainer";
import { useDialog } from "../../hooks/useDialog";
import MFAUI from "../../components/auth/MFAUI";

export interface MFAContainerProps {
  userId: string;
  sessionToken?: string;
  method?: "totp" | "email" | "sms" | "recovery";
  codeLength?: number;
  autoFocus?: boolean;
  title?: string;
  description?: string;
  submitText?: string;
  resendText?: string;
  onMFASuccess?: (token: string) => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
  onResendCode?: () => void;
  className?: string;
  sx?: React.CSSProperties;
  id?: string;
}

const MFAContainer: React.FC<MFAContainerProps> = (props) => {
  const {
    userId,
    sessionToken,
    method = "totp",
    codeLength = 6,
    autoFocus = true,
    title,
    description,
    submitText = "Verify",
    resendText = "Resend Code",
    onMFASuccess,
    showBackButton = true,
    onBackClick,
    onResendCode,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();

  // Note: These methods should be implemented in useAuth
  // Placeholder implementation
  const {
    verifyMFA = async () => ({ success: false, token: "" }),
    isVerifyingMFA = false,
    resendMFACode = async () => ({ success: false }),
  } = useAuth() as any;

  const [formState, formAPI] = useFormContainer({
    initialData: { code: "" },
    validator: (data) => {
      if (!data.code) {
        return { code: "Verification code is required" };
      }

      if (method !== "recovery" && data.code.length !== codeLength) {
        return { code: `Code must be ${codeLength} digits` };
      }

      if (method === "recovery" && data.code.length < 8) {
        return { code: "Recovery code is too short" };
      }

      return true;
    },
    onSubmit: async (data) => {
      const result = await verifyMFA({
        userId,
        code: data.code,
        method,
        sessionToken,
      });

      if (result.success && result.token && onMFASuccess) {
        onMFASuccess(result.token);
      }

      return result;
    },
  });

  const handleBackClick = useCallback(() => {
    if (onBackClick) {
      onBackClick();
    }
  }, [onBackClick]);

  const handleResendCode = useCallback(async () => {
    if (onResendCode) {
      onResendCode();
      return;
    }

    const result = await resendMFACode({
      userId,
      method,
      sessionToken,
    });

    if (result.success) {
      await dialog.showSuccess(
        "Code Sent",
        `A new verification code has been sent to your ${
          method === "email" ? "email" : "authenticator app"
        }.`,
      );
    }
  }, [userId, sessionToken, method, resendMFACode, onResendCode, dialog]);

  const handleSubmit = useCallback(
    (data: { code: string }) => {
      formAPI.setFieldValue("code", data.code);
      formAPI.submitForm();
    },
    [formAPI],
  );

  const getTitle = () => {
    if (title) return title;
    return method === "totp" ? "Authentication Code" : "Email Verification";
  };

  const getDescription = () => {
    if (description) return description;
    return method === "totp"
      ? "Enter the code from your authenticator app"
      : "Enter the verification code sent to your email";
  };

  const uiProps = {
    error: formState.hasError ? formState.error?.message || null : null,
    isLoading: formState.isSubmitting || isVerifyingMFA,
    method,
    codeLength,
    autoFocus,
    title: getTitle(),
    description: getDescription(),
    submitText,
    resendText,
    onSubmit: handleSubmit,
    onResendCode: handleResendCode,
    onCancel: showBackButton ? handleBackClick : undefined,
    className,
    sx,
    id,
  };

  return <MFAUI {...uiProps} />;
};

export default MFAContainer;
