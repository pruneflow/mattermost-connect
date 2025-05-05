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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";

/**
 * MFA UI props
 */
export interface MFAUIProps extends BaseComponentProps {
  /** Error message to display */
  error?: string | null;
  /** Whether form is in loading state */
  isLoading?: boolean;
  /** Whether form is disabled */
  disabled?: boolean;
  /** MFA method */
  method?: "totp" | "email" | "sms" | "recovery";
  /** Available MFA methods */
  availableMethods?: ("totp" | "email" | "sms" | "recovery")[];
  /** Code length */
  codeLength?: number;
  /** Whether to auto focus the code input */
  autoFocus?: boolean;
  /** Custom form title */
  title?: string;
  /** Custom description text */
  description?: string;
  /** Custom submit button text */
  submitText?: string;
  /** Custom resend code text */
  resendText?: string;
  /** Callback when form is submitted */
  onSubmit?: (data: { code: string }) => void;
  /** Callback to resend verification code */
  onResendCode?: () => void;
  /** Callback when cancelled */
  onCancel?: () => void;
  /** Callback when method is changed */
  onMethodChange?: (method: "totp" | "email" | "sms" | "recovery") => void;
}

/**
 * MFA UI component
 * Handles rendering of multi-factor authentication form
 */
const MFAUI: React.FC<MFAUIProps> = (props) => {
  const {
    error,
    isLoading = false,
    disabled = false,
    method = "totp",
    availableMethods = [],
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
    onMethodChange,
    className,
    sx,
    id,
  } = props;

  // Local form state
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  // Determine if we should show method selector
  const showMethodSelector = availableMethods.length > 1 && onMethodChange;

  // Handle code input change
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Only allow digits or letters for recovery codes
    if (method === "recovery") {
      if (value === "" || /^[a-zA-Z0-9-]+$/.test(value)) {
        setCode(value);
        if (codeError) setCodeError("");
      }
    } else {
      // Only allow digits for TOTP, SMS, and email codes
      if (value === "" || /^\d+$/.test(value)) {
        setCode(value);
        if (codeError) setCodeError("");
      }
    }
  };

  // Handle method change
  const handleMethodChange = (event: SelectChangeEvent<string>) => {
    const newMethod = event.target.value as
      | "totp"
      | "email"
      | "sms"
      | "recovery";
    if (onMethodChange) {
      onMethodChange(newMethod);
    }
  };

  // Basic validation
  const validateForm = (): boolean => {
    let isValid = true;

    if (!code) {
      setCodeError("Verification code is required");
      isValid = false;
    } else if (method !== "recovery" && code.length !== codeLength) {
      setCodeError(`Code must be ${codeLength} digits`);
      isValid = false;
    } else if (method === "recovery" && code.length < 8) {
      setCodeError("Recovery code is too short");
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

  // Get input mode based on method
  const getInputMode = () => {
    return method === "recovery" ? "text" : "numeric";
  };

  // Get input pattern based on method
  const getInputPattern = () => {
    return method === "recovery" ? "[a-zA-Z0-9-]*" : "[0-9]*";
  };

  // Get maximum length based on method
  const getMaxLength = () => {
    return method === "recovery" ? 20 : codeLength;
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

      {showMethodSelector && (
        <FormControl fullWidth margin="normal">
          <InputLabel id="mfa-method-select-label">
            Verification Method
          </InputLabel>
          <Select
            labelId="mfa-method-select-label"
            id="mfa-method-select"
            value={method}
            label="Verification Method"
            onChange={handleMethodChange}
            disabled={isLoading || disabled}
          >
            {availableMethods.includes("totp") && (
              <MenuItem value="totp">Authenticator App</MenuItem>
            )}
            {availableMethods.includes("email") && (
              <MenuItem value="email">Email</MenuItem>
            )}
            {availableMethods.includes("sms") && (
              <MenuItem value="sms">SMS</MenuItem>
            )}
            {availableMethods.includes("recovery") && (
              <MenuItem value="recovery">Recovery Code</MenuItem>
            )}
          </Select>
        </FormControl>
      )}

      <TextField
        margin="normal"
        required
        fullWidth
        id="code"
        label={method === "recovery" ? "Recovery Code" : "Verification Code"}
        name="code"
        autoComplete={method === "recovery" ? "off" : "one-time-code"}
        autoFocus={autoFocus}
        value={code}
        onChange={handleCodeChange}
        error={!!codeError}
        helperText={codeError}
        disabled={isLoading || disabled}
        inputProps={{
          maxLength: getMaxLength(),
          inputMode: getInputMode() as any,
          pattern: getInputPattern(),
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

        {onResendCode && method !== "totp" && method !== "recovery" && (
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
