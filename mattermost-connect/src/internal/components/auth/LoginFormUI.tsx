// src/internal/components/auth/LoginFormUI.tsx
/**
 * Base login form component
 */
import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface LoginFormUIProps extends BaseComponentProps {
  /** Error message to display */
  error?: string | null;
  /** Whether form is in loading state */
  isLoading?: boolean;
  /** Whether to show remember me checkbox */
  showRememberMe?: boolean;
  /** Whether to show server URL field */
  showServerUrl?: boolean;
  /** Callback when form is submitted */
  onSubmit?: (
    username: string,
    password: string,
    serverUrl?: string,
    rememberMe?: boolean,
  ) => void;
  /** Custom form title */
  title?: string;
  /** Custom submit button text */
  submitText?: string;
  /** Initial username value */
  initialUsername?: string;
  /** Initial server URL value */
  initialServerUrl?: string;
}

const LoginFormUI: React.FC<LoginFormUIProps> = ({
  error,
  isLoading = false,
  showRememberMe = true,
  showServerUrl = false,
  onSubmit,
  title = "Sign In",
  submitText = "Sign In",
  initialUsername = "",
  initialServerUrl = "",
  className,
  sx,
  id,
}) => {
  // Form state
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState("");
  const [serverUrl, setServerUrl] = useState(initialServerUrl);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validation state
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [serverUrlError, setServerUrlError] = useState("");

  // Handlers
  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
    if (event.target.value) setUsernameError("");
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    if (event.target.value) setPasswordError("");
  };

  const handleServerUrlChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setServerUrl(event.target.value);
    if (event.target.value) setServerUrlError("");
  };

  const handleRememberMeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRememberMe(event.target.checked);
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = (): boolean => {
    let isValid = true;

    if (!username) {
      setUsernameError("Username is required");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    }

    if (showServerUrl && !serverUrl) {
      setServerUrlError("Server URL is required");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (validateForm() && onSubmit) {
      onSubmit(
        username,
        password,
        showServerUrl ? serverUrl : undefined,
        rememberMe,
      );
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
        label="Username or Email"
        name="username"
        autoComplete="username"
        autoFocus
        value={username}
        onChange={handleUsernameChange}
        error={!!usernameError}
        helperText={usernameError}
        disabled={isLoading}
        inputProps={{ "data-testid": "username-input" }}
      />

      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Password"
        type={showPassword ? "text" : "password"}
        id="password"
        autoComplete="current-password"
        value={password}
        onChange={handlePasswordChange}
        error={!!passwordError}
        helperText={passwordError}
        disabled={isLoading}
        inputProps={{ "data-testid": "password-input" }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={toggleShowPassword}
                edge="end"
                size="small"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
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
          onChange={handleServerUrlChange}
          error={!!serverUrlError}
          helperText={
            serverUrlError || "Example: https://mattermost.example.com"
          }
          disabled={isLoading}
          inputProps={{ "data-testid": "server-url-input" }}
        />
      )}

      {showRememberMe && (
        <FormControlLabel
          control={
            <Checkbox
              value="remember"
              color="primary"
              checked={rememberMe}
              onChange={handleRememberMeChange}
              disabled={isLoading}
            />
          }
          label="Remember me"
          sx={{ mt: 1 }}
        />
      )}

      <Button
        type="submit"
        fullWidth
        variant="contained"
        color="primary"
        disabled={isLoading}
        sx={{ mt: 3, mb: 2 }}
        data-testid="login-button"
      >
        {isLoading ? (
          <CircularProgress color="inherit" size={24} sx={{ mr: 1 }} />
        ) : null}
        {submitText}
      </Button>
    </Box>
  );
};

export default LoginFormUI;
