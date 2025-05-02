// src/internal/components/auth/RegisterFormUI.tsx
/**
 * Registration Form UI Component
 * Pure presentational component for user registration
 */
import React from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  LinearProgress,
} from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface RegisterFormUIProps extends BaseComponentProps {
  // Form state
  error?: string | null;
  isLoading?: boolean;

  // Form configuration
  showServerUrl?: boolean;
  initialUsername?: string;
  initialEmail?: string;
  initialServerUrl?: string;
  passwordStrength?: { score: number; message: string };
  showPasswordStrength?: boolean;

  // UI configuration
  title?: string;
  submitText?: string;
  showLogin?: boolean;
  loginText?: string;

  // Callbacks
  onSubmit?: (
    username: string,
    email: string,
    password: string,
    confirmPassword: string,
    firstName?: string,
    lastName?: string,
    serverUrl?: string,
  ) => void;
  onLoginClick?: () => void;
}

/**
 * Registration Form UI component
 * Handles rendering of registration form with validation feedback
 */
export const RegisterFormUI: React.FC<RegisterFormUIProps> = (props) => {
  const {
    error,
    isLoading = false,
    showServerUrl = false,
    initialUsername = "",
    initialEmail = "",
    initialServerUrl = "",
    passwordStrength,
    showPasswordStrength = true,
    title = "Create Account",
    submitText = "Register",
    showLogin = true,
    loginText = "Already have an account? Login",
    onSubmit,
    onLoginClick,
    className,
    sx,
    id,
  } = props;

  // Local form state
  const [username, setUsername] = React.useState(initialUsername);
  const [email, setEmail] = React.useState(initialEmail);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [serverUrl, setServerUrl] = React.useState(initialServerUrl);

  // Validation state
  const [usernameError, setUsernameError] = React.useState("");
  const [emailError, setEmailError] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const [confirmPasswordError, setConfirmPasswordError] = React.useState("");
  const [serverUrlError, setServerUrlError] = React.useState("");

  // Basic validation
  const validateForm = (): boolean => {
    let isValid = true;

    if (!username) {
      setUsernameError("Username is required");
      isValid = false;
    } else {
      setUsernameError("");
    }

    if (!email) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Email is not valid");
      isValid = false;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else {
      setPasswordError("");
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password");
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      isValid = false;
    } else {
      setConfirmPasswordError("");
    }

    if (showServerUrl && !serverUrl) {
      setServerUrlError("Server URL is required");
      isValid = false;
    } else {
      setServerUrlError("");
    }

    return isValid;
  };

  // Handle form submission
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (validateForm() && onSubmit) {
      onSubmit(
        username,
        email,
        password,
        confirmPassword,
        firstName || undefined,
        lastName || undefined,
        showServerUrl ? serverUrl : undefined,
      );
    }
  };

  // Render password strength indicator if enabled
  const renderPasswordStrength = () => {
    if (!showPasswordStrength || !password || !passwordStrength) {
      return null;
    }

    const { score, message } = passwordStrength;

    // Get color based on score
    const getColor = () => {
      switch (score) {
        case 0:
          return "error";
        case 1:
          return "error";
        case 2:
          return "warning";
        case 3:
          return "success";
        case 4:
          return "success";
        default:
          return "primary";
      }
    };

    return (
      <Box sx={{ mt: 1, mb: 2 }}>
        <LinearProgress
          variant="determinate"
          value={(score / 4) * 100}
          color={getColor()}
          sx={{ height: 8, borderRadius: 4 }}
        />
        <Typography variant="caption" color={`${getColor()}.main`}>
          {message}
        </Typography>
      </Box>
    );
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        margin="normal"
        required
        fullWidth
        id="username"
        label="Username"
        name="username"
        autoComplete="username"
        autoFocus
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={!!usernameError}
        helperText={
          usernameError ||
          "Username must contain only letters, numbers, dots, hyphens, and underscores"
        }
        disabled={isLoading}
      />

      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Email Address"
        name="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={!!emailError}
        helperText={emailError}
        disabled={isLoading}
      />

      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Password"
        type="password"
        id="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={!!passwordError}
        helperText={passwordError}
        disabled={isLoading}
      />

      {renderPasswordStrength()}

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
        disabled={isLoading}
      />

      <TextField
        margin="normal"
        fullWidth
        id="firstName"
        label="First Name"
        name="firstName"
        autoComplete="given-name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        disabled={isLoading}
      />

      <TextField
        margin="normal"
        fullWidth
        id="lastName"
        label="Last Name"
        name="lastName"
        autoComplete="family-name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        disabled={isLoading}
      />

      {showServerUrl && (
        <TextField
          margin="normal"
          required
          fullWidth
          id="serverUrl"
          label="Server URL"
          name="serverUrl"
          placeholder="https://mattermost.example.com"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          error={!!serverUrlError}
          helperText={
            serverUrlError || "Example: https://mattermost.example.com"
          }
          disabled={isLoading}
        />
      )}

      <Button
        type="submit"
        fullWidth
        variant="contained"
        color="primary"
        disabled={isLoading}
        sx={{ mt: 3, mb: 2 }}
      >
        {isLoading ? (
          <CircularProgress color="inherit" size={24} sx={{ mr: 1 }} />
        ) : null}
        {submitText}
      </Button>

      {showLogin && onLoginClick && (
        <Box sx={{ textAlign: "center" }}>
          <Link
            component="button"
            variant="body2"
            onClick={onLoginClick}
            sx={{ cursor: "pointer" }}
          >
            {loginText}
          </Link>
        </Box>
      )}
    </Box>
  );
};

export default RegisterFormUI;
