// src/internal/containers/auth/LoginContainer.tsx
/**
 * Container component that handles login logic
 */
import React, { useState, useCallback } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { BaseComponentProps, LoginMode } from "../../types/componentTypes";
import DirectLoginFormUI from "../../components/auth/DirectLoginFormUI";
import ProxyLoginFormUI from "../../components/auth/ProxyLoginFormUI";
import LoginModeSelectorUI from "../../components/auth/LoginModeSelectorUI";
import { Box, Paper } from "@mui/material";

export interface LoginContainerProps extends BaseComponentProps {
  /** Initial login mode */
  initialMode?: LoginMode;
  /** Whether to show mode selector */
  showModeSelector?: boolean;
  /** Whether to allow remembering credentials */
  allowRememberMe?: boolean;
  /** Callback when login is successful */
  onLoginSuccess?: (user: any) => void;
  /** Callback when login fails */
  onLoginError?: (error: Error) => void;
  /** Custom form title */
  title?: string;
  /** Custom submit button text */
  submitText?: string;
  /** Initial server URL for direct mode */
  initialServerUrl?: string;
  /** Initial username */
  initialUsername?: string;
}

const LoginContainer: React.FC<LoginContainerProps> = ({
  initialMode = "direct",
  showModeSelector = true,
  allowRememberMe = true,
  onLoginSuccess,
  onLoginError,
  title,
  submitText,
  initialServerUrl = "",
  initialUsername = "",
  className,
  sx,
  id,
}) => {
  // State
  const [mode, setMode] = useState<LoginMode>(initialMode);

  // Auth hook
  const { login, isAuthenticating, error } = useAuth();

  // Handle login form submission
  const handleSubmit = useCallback(
    async (
      username: string,
      password: string,
      serverUrl?: string,
      rememberMe?: boolean,
    ) => {
      try {
        const user = await login({
          username,
          password,
          serverUrl,
        });

        if (onLoginSuccess) {
          onLoginSuccess(user);
        }
      } catch (err) {
        if (onLoginError) {
          onLoginError(err as Error);
        }
      }
    },
    [login, onLoginSuccess, onLoginError],
  );

  // Handle mode change
  const handleModeChange = useCallback((newMode: LoginMode) => {
    setMode(newMode);
  }, []);

  // Render appropriate login form based on mode
  const renderLoginForm = () => {
    const commonProps = {
      error: error?.message,
      isLoading: isAuthenticating,
      onSubmit: handleSubmit,
      showRememberMe: allowRememberMe,
      title,
      submitText,
      initialUsername,
    };

    if (mode === "direct") {
      return (
        <DirectLoginFormUI
          {...commonProps}
          initialServerUrl={initialServerUrl}
        />
      );
    }

    return <ProxyLoginFormUI {...commonProps} />;
  };

  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: 480,
        mx: "auto",
        ...sx,
      }}
      id={id}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {showModeSelector && (
          <LoginModeSelectorUI
            mode={mode}
            onModeChange={handleModeChange}
            disabled={isAuthenticating}
            sx={{ pt: 2 }}
          />
        )}

        {renderLoginForm()}
      </Paper>
    </Box>
  );
};

export default LoginContainer;
