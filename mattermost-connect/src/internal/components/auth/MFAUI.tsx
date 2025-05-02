// src/internal/components/auth/MFAUI.tsx
/**
 * MFA UI Component
 * Pure presentational component for multi-factor authentication
 */
import React, { useState } from "react";
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
 * MFA UI props
 */
export interface MFAUIProps extends BaseComponentProps {
  // Form state
  error?: string | null;
  isLoading?: boolean;
  disabled?: boolean;

  // Form configuration
  method?: "totp" | "email";
  codeLength?: number;
  autoFocus?: boolean;

  // UI configuration
  title?: string;
  description?: string;
  submitText?: string;
  resendText?: string;

  // Callbacks
  onSubmit?: (data: { code: string }) => void;
  onResendCode?: () => void;
  onCancel?: () => void;
}

/**
 * MFA UI component
 * Handles rendering of multi-factor authentication form
 */
export const MFAUI: React.FC<MFAUIProps> = (props) => {
  const {
    error,
    isLoading = false,
    disabled = false,
    method = "totp",
    codeLength = 6,
    autoFocus = true,
    title = method === "totp" ? "Authentication Code" : "Email Verification",
    description = method === "totp"
      ? "Enter the code from your authenticator app"
      : "Enter the verification code sent to your email",
    submitText = "Verify",
    resendText = "Resend Code",
    onSubmit,
    onResendCode,
    onCancel,
    className,
    sx,
    id,
  } = props;

  // Local form state
  const [code, setCode] = useState("");

  // Validation state
  const [codeError, setCodeError] = useState("");

  // Basic validation
  const validateForm = (): boolean => {
    let isValid = true;

    if (!code) {
      setCodeError("Verification code is required");
      isValid = false;
    } else if (code.length !== codeLength) {
      setCodeError(`Code must be ${codeLength} digits`);
      isValid = false;
    } else {
      setCodeError("");
    }

    return isValid;
  };

  // Handle form submission
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (validateForm() && onSubmit) {
      onSubmit({ code });
    }
  };

  // Handle code input change
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Only allow digits
    if (value === "" || /^\d+$/.test(value)) {
      setCode(value);

      // Clear error when user types
      if (codeError) {
        setCodeError("");
      }
    }
  };

  // Handle resend code
  const handleResendCode = () => {
    if (onResendCode) {
      onResendCode();
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
        {title}
      </Typography>

      <Typography
        variant="body2"
        align="center"
        color="text.secondary"
        sx={{ mb: 2 }}
      >
        {description}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        margin="normal"
        required
        fullWidth
        id="code"
        label="Verification Code"
        name="code"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        value={code}
        onChange={handleCodeChange}
        error={!!codeError}
        helperText={codeError}
        disabled={isLoading || disabled}
        inputProps={{
          maxLength: codeLength,
          inputMode: "numeric",
          pattern: "[0-9]*",
        }}
      />

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

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
        {onCancel && (
          <Button
            variant="text"
            onClick={onCancel}
            disabled={isLoading || disabled}
          >
            Cancel
          </Button>
        )}

        {onResendCode && (
          <Button
            variant="text"
            onClick={handleResendCode}
            disabled={isLoading || disabled}
            sx={{ ml: "auto" }}
          >
            {resendText}
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default MFAUI;
