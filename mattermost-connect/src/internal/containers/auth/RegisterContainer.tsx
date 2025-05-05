// src/internal/containers/auth/RegisterContainer.tsx
/**
 * Register Container
 * Handles user registration functionality
 * Delegates business logic to useAuth hook
 */
import React, { useCallback, useState, useEffect } from "react";
import { useAuth } from "../../../hooks";
import { User, RegistrationParams } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import RegisterFormUI from "../../components/auth/RegisterFormUI";
import { passwordStrengthCheck } from "../../../utils/authValidation";

// Register container props
export interface RegisterContainerProps {
  /**
   * Initial username value
   */
  initialUsername?: string;
  /**
   * Initial email value
   */
  initialEmail?: string;
  /**
   * Initial server URL value
   */
  initialServerUrl?: string;
  /**
   * Whether to display server URL field
   */
  showServerUrl?: boolean;
  /**
   * Custom form title
   */
  title?: string;
  /**
   * Custom submit button text
   */
  submitText?: string;
  /**
   * Whether to show a link to login
   */
  showLogin?: boolean;
  /**
   * Custom login link text
   */
  loginText?: string;
  /**
   * Whether to show password strength indicator
   */
  showPasswordStrength?: boolean;
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
 * Register container
 * Handles registration form state and submission
 */
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

  // Form state
  const [username, setUsername] = useState(initialUsername);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [serverUrl, setServerUrl] = useState(initialServerUrl);
  const [formError, setFormError] = useState<string | null>(null);

  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    message: string;
  } | null>(null);

  // Use auth hook for registration functionality
  const {
    register,
    isRegistering,
    registrationError,
    validateRegistrationData,
  } = useAuth();

  // Use dialog for confirmation/error handling
  const dialog = useDialog();

  // Update password strength when password changes
  useEffect(() => {
    if (password) {
      const strength = passwordStrengthCheck(password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [password]);

  // Handle password change
  const handlePasswordChange = useCallback((newPassword: string) => {
    setPassword(newPassword);

    // Update password strength when password changes
    if (newPassword) {
      const strength = passwordStrengthCheck(newPassword);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(
    async (
      submittedUsername: string,
      submittedEmail: string,
      submittedPassword: string,
      submittedConfirmPassword: string,
      submittedFirstName?: string,
      submittedLastName?: string,
      submittedServerUrl?: string,
    ) => {
      try {
        // Clear previous errors
        setFormError(null);

        // Check if passwords match
        if (submittedPassword !== submittedConfirmPassword) {
          setFormError("Passwords do not match");
          return;
        }

        // Prepare registration data
        const registrationData: RegistrationParams = {
          username: submittedUsername,
          email: submittedEmail,
          password: submittedPassword,
        };

        // Add optional fields if provided
        if (submittedFirstName) {
          registrationData.firstName = submittedFirstName;
        }

        if (submittedLastName) {
          registrationData.lastName = submittedLastName;
        }

        if (showServerUrl && submittedServerUrl) {
          registrationData.serverUrl = submittedServerUrl;
        }

        // Validate registration data
        const validationResult = validateRegistrationData(registrationData);
        if (!validationResult.isValid) {
          // Show first validation error
          const firstError = Object.values(validationResult.errors)[0];
          setFormError(firstError);
          return;
        }

        // Attempt registration
        const result = await register(registrationData);

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
            : "An unexpected error occurred during registration";
        setFormError(errorMessage);
      }
    },
    [
      register,
      dialog,
      requireEmailVerification,
      onRegisterSuccess,
      showServerUrl,
      validateRegistrationData,
    ],
  );

  // Handle login link click
  const handleLoginClick = useCallback(() => {
    if (onLoginClick) {
      onLoginClick();
    }
  }, [onLoginClick]);

  // Render the register form UI component
  return (
    <RegisterFormUI
      // Form data
      initialUsername={username}
      initialEmail={email}
      initialServerUrl={serverUrl}
      // Form state
      error={formError || registrationError?.message || null}
      isLoading={isRegistering}
      passwordStrength={passwordStrength || undefined}
      // Form configuration
      showServerUrl={showServerUrl}
      title={title}
      submitText={submitText}
      showPasswordStrength={showPasswordStrength}
      // UI configuration
      showLogin={showLogin}
      loginText={loginText}
      // Callbacks
      onSubmit={handleSubmit}
      onLoginClick={handleLoginClick}
      onPasswordChange={handlePasswordChange}
      // Styling
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default RegisterContainer;
