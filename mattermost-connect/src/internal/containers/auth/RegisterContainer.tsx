// src/internal/containers/auth/RegisterContainer.tsx
import React, { useCallback, useEffect, useMemo } from "react";
import { useAuth } from "../../../hooks";
import { useFormContainer } from "../base/FormContainer";
import { User, RegistrationParams } from "../../../types";
import RegisterFormUI from "../../components/auth/RegisterFormUI";
import { passwordStrengthCheck } from "../../../utils/authValidation";

export interface RegisterContainerProps {
  initialUsername?: string;
  initialEmail?: string;
  initialServerUrl?: string;
  showServerUrl?: boolean;
  title?: string;
  submitText?: string;
  showLogin?: boolean;
  loginText?: string;
  showPasswordStrength?: boolean;
  onLoginClick?: () => void;
  onRegisterSuccess?: (user: User) => void;
  requireEmailVerification?: boolean;
  className?: string;
  sx?: React.CSSProperties;
  id?: string;
}

const RegisterContainer: React.FC<RegisterContainerProps> = (props) => {
  const {
    initialUsername = "",
    initialEmail = "",
    initialServerUrl = "",
    showServerUrl = false,
    title = "Create Account",
    submitText = "Register",
    showLogin = true,
    loginText = "Already have an account? Login",
    showPasswordStrength = true,
    onLoginClick,
    onRegisterSuccess,
    requireEmailVerification = false,
    className,
    sx,
    id,
  } = props;

  const { register, validateRegistrationData } = useAuth();

  const [formState, formAPI] = useFormContainer({
    initialData: {
      username: initialUsername,
      email: initialEmail,
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      serverUrl: initialServerUrl,
    },
    validator: (data) => {
      if (data.password !== data.confirmPassword) {
        return { confirmPassword: "Passwords do not match" };
      }

      const registrationData: RegistrationParams = {
        username: data.username as string,
        email: data.email as string,
        password: data.password as string,
      };

      if (data.firstName) registrationData.firstName = data.firstName as string;
      if (data.lastName) registrationData.lastName = data.lastName as string;
      if (showServerUrl && data.serverUrl) {
        registrationData.serverUrl = data.serverUrl as string;
      }

      const validationResult = validateRegistrationData(registrationData);
      return validationResult.isValid ? true : validationResult.errors;
    },
    onSubmit: async (data) => {
      const registrationData: RegistrationParams = {
        username: data.username as string,
        email: data.email as string,
        password: data.password as string,
      };

      if (data.firstName) registrationData.firstName = data.firstName as string;
      if (data.lastName) registrationData.lastName = data.lastName as string;
      if (showServerUrl && data.serverUrl) {
        registrationData.serverUrl = data.serverUrl as string;
      }

      const result = await register(registrationData);

      if (result.success && result.data && onRegisterSuccess) {
        onRegisterSuccess(result.data);
      }

      return result.data;
    },
  });

  const [passwordStrength, setPasswordStrength] = React.useState<{
    score: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    const password = formState.formData.password as string;
    if (password) {
      const strength = passwordStrengthCheck(password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [formState.formData.password]);

  const handleLoginClick = useCallback(() => {
    if (onLoginClick) {
      onLoginClick();
    }
  }, [onLoginClick]);

  const handlePasswordChange = useCallback(
    (password: string) => {
      formAPI.setFieldValue("password", password);
    },
    [formAPI],
  );

  const handleSubmit = useCallback(
    (
      username: string,
      email: string,
      password: string,
      confirmPassword: string,
      firstName?: string,
      lastName?: string,
      serverUrl?: string,
    ) => {
      formAPI.setFieldValue("username", username);
      formAPI.setFieldValue("email", email);
      formAPI.setFieldValue("password", password);
      formAPI.setFieldValue("confirmPassword", confirmPassword);
      if (firstName) formAPI.setFieldValue("firstName", firstName);
      if (lastName) formAPI.setFieldValue("lastName", lastName);
      if (serverUrl) formAPI.setFieldValue("serverUrl", serverUrl);
      formAPI.submitForm();
    },
    [formAPI],
  );

  const uiProps = {
    initialUsername: formState.formData.username as string,
    initialEmail: formState.formData.email as string,
    initialServerUrl: formState.formData.serverUrl as string,
    passwordStrength: passwordStrength || undefined,
    error: formState.hasError ? formState.error?.message || null : null,
    isLoading: formState.isSubmitting,
    showServerUrl,
    title,
    submitText,
    showLogin,
    loginText,
    showPasswordStrength,
    onSubmit: handleSubmit,
    onLoginClick: handleLoginClick,
    onPasswordChange: handlePasswordChange,
    className,
    sx,
    id,
  };

  return <RegisterFormUI {...uiProps} />;
};

export default RegisterContainer;
