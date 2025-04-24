// src/internal/components/auth/LoginModeSelectorUI.tsx
/**
 * Component to select between direct and proxy login modes
 */
import React from "react";
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Paper,
} from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";
import { LoginMode } from "../../types/componentTypes";

export interface LoginModeSelectorUIProps extends BaseComponentProps {
  /** Selected login mode */
  mode: LoginMode;
  /** Callback when mode changes */
  onModeChange: (mode: LoginMode) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
}

const LoginModeSelectorUI: React.FC<LoginModeSelectorUIProps> = ({
  mode,
  onModeChange,
  disabled = false,
  className,
  sx,
  id,
}) => {
  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: LoginMode | null,
  ) => {
    if (newMode !== null) {
      onModeChange(newMode);
    }
  };

  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        mb: 2,
        ...sx,
      }}
      id={id}
    >
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Select connection mode:
      </Typography>
      <Paper elevation={0} sx={{ p: 0.5 }}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          aria-label="login mode"
          disabled={disabled}
          size="small"
        >
          <ToggleButton value="direct" aria-label="direct mode">
            Direct
          </ToggleButton>
          <ToggleButton value="proxy" aria-label="proxy mode">
            Proxy
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>
      <Typography
        variant="caption"
        color="textSecondary"
        align="center"
        sx={{ mt: 1 }}
      >
        {mode === "direct"
          ? "Connect directly to a Mattermost server"
          : "Connect via proxy service"}
      </Typography>
    </Box>
  );
};

export default LoginModeSelectorUI;
