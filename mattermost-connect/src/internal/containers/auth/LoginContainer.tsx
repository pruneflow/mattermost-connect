// src/internal/containers/auth/LoginContainer.tsx
import React, { useCallback } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { User, LoginParams } from "../../../types";
import { useFormContainer } from "../base/FormContainer";
import LoginFormUI from "../../components/auth/LoginFormUI";
import { SxProps, Theme } from "@mui/material";

export interface LoginContainerProps {
  initialUsername?: string;
  initialServerUrl?: string;
  showRememberMe?: boolean;
  showServerUrl?: boolean;
  title?: string;
  submitText?: string;
  showRegisterLink?: boolean;
  showForgotPasswordLink?: boolean;
  onRegisterClick?: () => void;
  onForgotPasswordClick?: () => void;
  onLoginSuccess?: (user: User) => void;
  className?: string;
  sx?: SxProps<Theme>;
  id?: string;
}

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

  const { login, validateCredentials, isLoggingIn } = useAuth();

  const [formState, formAPI] = useFormContainer({
    initialData: {
      username: initialUsername,
      password: "",
      serverUrl: initialServerUrl,
      rememberMe: false,
    },
    validator: (data) => {
      const validationResult = validateCredentials(
        data.username,
        data.password,
      );
      return validationResult.isValid ? true : validationResult.errors;
    },
    onSubmit: async (data) => {
      const loginParams: LoginParams = {
        username: data.username,
        password: data.password,
      };

      if (showServerUrl && data.serverUrl) {
        loginParams.serverUrl = data.serverUrl;
      }

      const result = await login(loginParams);

      if (result.success && result.data && onLoginSuccess) {
        onLoginSuccess(result.data);
      }

      return result.data;
    },
  });

  const handleRegisterClick = useCallback(() => {
    if (onRegisterClick) {
      onRegisterClick();
    }
  }, [onRegisterClick]);

  const handleForgotPasswordClick = useCallback(() => {
    if (onForgotPasswordClick) {
      onForgotPasswordClick();
    }
  }, [onForgotPasswordClick]);

  const handleLoginSubmit = useCallback(
    (
      username: string,
      password: string,
      serverUrl?: string,
      rememberMe?: boolean,
    ) => {
      formAPI.setFieldValue("username", username);
      formAPI.setFieldValue("password", password);
      if (serverUrl) formAPI.setFieldValue("serverUrl", serverUrl);
      formAPI.setFieldValue("rememberMe", !!rememberMe);
      formAPI.submitForm();
    },
    [formAPI],
  );

  const uiProps = {
    initialUsername: formState.formData.username as string,
    initialServerUrl: formState.formData.serverUrl as string,
    error: formState.hasError ? formState.error?.message || null : null,
    isLoading: formState.isSubmitting,
    showRememberMe,
    showServerUrl,
    title,
    submitText,
    showRegisterLink,
    showForgotPasswordLink,
    onSubmit: handleLoginSubmit,
    onRegisterClick: handleRegisterClick,
    onForgotPasswordClick: handleForgotPasswordClick,
    className,
    sx,
    id,
  };

  return <LoginFormUI {...uiProps} />;
};

export default LoginContainer;
