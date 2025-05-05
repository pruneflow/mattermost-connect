// src/internal/components/auth/PasswordResetFormUI.tsx
/**
 * Password Reset Form UI Component
 * Pure presentational component for password reset forms
 */
import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
} from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";

/**
 * Mode for the password reset form
 */
export type PasswordResetMode = "forgot" | "reset" | "update";

/**
 * Password reset form UI props
 */
export interface PasswordResetFormUIProps extends BaseComponentProps {
  /** Error message to display */
  error?: string | null;
  /** Whether form is in loading state */
  isLoading?: boolean;
  /** Whether form is disabled */
  disabled?: boolean;
  /** Form mode */
  mode?: PasswordResetMode;
  /** Reset token (if in reset mode) */
  token?: string;
  /** Initial email value */
  initialEmail?: string;
  /** Custom submit button text */
  submitText?: string;
  /** Whether to show login link */
  showLoginLink?: boolean;
  /** Custom login link text */
  loginText?: string;
  /** Callback when form is submitted */
  onSubmit?: (data: any) => void;
  /** Callback when login link is clicked */
  onLoginClick?: () => void;
}

/**
 * Password Reset Form UI component
 * Handles rendering of password reset forms with different modes
 */
const PasswordResetFormUI: React.FC<PasswordResetFormUIProps> = (props) => {
  const {
    error,
    isLoading = false,
    disabled = false,
    mode = "forgot",
    token,
    initialEmail = "",
    submitText = mode === "forgot"
      ? "Send Reset Link"
      : mode === "reset"
        ? "Reset Password"
        : "Update Password",
    showLoginLink = true,
    loginText = "Back to Login",
    onSubmit,
    onLoginClick,
    className,
    sx,
    id,
  } = props;

  // Local form state based on mode
  const [email, setEmail] = useState(initialEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Validation state
  const [emailError, setEmailError] = useState("");
  const [currentPasswordError, setCurrentPasswordError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // Reset form state when mode changes
  useEffect(() => {
    setEmail(initialEmail);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    // Clear validation errors
    setEmailError("");
    setCurrentPasswordError("");
    setNewPasswordError("");
    setConfirmPasswordError("");
  }, [mode, initialEmail]);

  // Get title based on mode
  const getTitle = () => {
    switch (mode) {
      case "forgot":
        return "Forgot Password";
      case "reset":
        return "Reset Password";
      case "update":
        return "Update Password";
      default:
        return "Password Reset";
    }
  };

  // Get help text based on mode
  const getHelpText = () => {
    switch (mode) {
      case "forgot":
        return "Enter your email address and we'll send you a link to reset your password.";
      case "reset":
        return "Please enter a new password for your account.";
      case "update":
        return "Please enter your current password and set a new password.";
      default:
        return "";
    }
  };

  // Validate form based on mode
  const validateForm = (): boolean => {
    let isValid = true;

    if (mode === "forgot") {
      if (!email) {
        setEmailError("Email is required");
        isValid = false;
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        setEmailError("Email is not valid");
        isValid = false;
      } else {
        setEmailError("");
      }
    }

    if (mode === "update") {
      if (!currentPassword) {
        setCurrentPasswordError("Current password is required");
        isValid = false;
      } else {
        setCurrentPasswordError("");
      }
    }

    if (mode === "reset" || mode === "update") {
      if (!newPassword) {
        setNewPasswordError("New password is required");
        isValid = false;
      } else {
        setNewPasswordError("");
      }

      if (!confirmPassword) {
        setConfirmPasswordError("Please confirm your new password");
        isValid = false;
      } else if (newPassword !== confirmPassword) {
        setConfirmPasswordError("Passwords do not match");
        isValid = false;
      } else {
        setConfirmPasswordError("");
      }
    }

    return isValid;
  };

  // Handle form submission
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm() || !onSubmit) return;

    // Prepare data based on mode
    let data = {};

    switch (mode) {
      case "forgot":
        data = { email };
        break;
      case "reset":
        data = { token, newPassword, confirmPassword };
        break;
      case "update":
        data = { currentPassword, newPassword, confirmPassword };
        break;
    }

    onSubmit(data);
  };

  // Render form fields based on mode
  const renderFormFields = () => {
    switch (mode) {
      case "forgot":
        return (
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!emailError}
            helperText={emailError}
            disabled={isLoading || disabled}
          />
        );

      case "reset":
        return (
          <>
            <TextField
              margin="normal"
              required
              fullWidth
              name="newPassword"
              label="New Password"
              type="password"
              id="newPassword"
              autoComplete="new-password"
              autoFocus
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={!!newPasswordError}
              helperText={newPasswordError}
              disabled={isLoading || disabled}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={!!confirmPasswordError}
              helperText={confirmPasswordError}
              disabled={isLoading || disabled}
            />
          </>
        );

      case "update":
        return (
          <>
            <TextField
              margin="normal"
              required
              fullWidth
              name="currentPassword"
              label="Current Password"
              type="password"
              id="currentPassword"
              autoComplete="current-password"
              autoFocus
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={!!currentPasswordError}
              helperText={currentPasswordError}
              disabled={isLoading || disabled}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="newPassword"
              label="New Password"
              type="password"
              id="newPassword"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={!!newPasswordError}
              helperText={newPasswordError}
              disabled={isLoading || disabled}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={!!confirmPasswordError}
              helperText={confirmPasswordError}
              disabled={isLoading || disabled}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      className={className}
      sx={{
        width: "100%",
        maxWidth: 400,
        mx: "auto",
        p: 3,
        ...sx,
      }}
      id={id}
    >
      <Typography variant="h5" align="center" gutterBottom>
        {getTitle()}
      </Typography>

      <Typography
        variant="body2"
        align="center"
        color="text.secondary"
        sx={{ mb: 2 }}
      >
        {getHelpText()}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {renderFormFields()}

      <Button
        type="submit"
        fullWidth
        variant="contained"
        color="primary"
        disabled={isLoading || disabled}
        sx={{ mt: 3, mb: 2 }}
      >
        {isLoading ? (
          <CircularProgress color="inherit" size={24} sx={{ mr: 1 }} />
        ) : null}
        {submitText}
      </Button>

      {showLoginLink && onLoginClick && (
        <Box sx={{ textAlign: "center" }}>
          <Link
            component="button"
            variant="body2"
            onClick={onLoginClick}
            sx={{ cursor: "pointer" }}
            disabled={isLoading || disabled}
          >
            {loginText}
          </Link>
        </Box>
      )}
    </Box>
  );
};

export default PasswordResetFormUI;
