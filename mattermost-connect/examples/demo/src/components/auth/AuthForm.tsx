import React from "react";
import {
  TextField,
  FormControl,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  Typography,
  Button,
  Link,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

type AuthMode = "direct" | "proxy" | "demo";

interface AuthFormProps {
  activeTab: number;
  authMode: AuthMode;
  serverUrl: string;
  username: string;
  password: string;
  proxyUrl: string;
  clientId: string;
  rememberMe: boolean;
  showPassword: boolean;
  isLoading: boolean;
  onServerUrlChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onProxyUrlChange: (value: string) => void;
  onClientIdChange: (value: string) => void;
  onRememberMeChange: (checked: boolean) => void;
  onTogglePasswordVisibility: () => void;
  onFillDemoCredentials: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  activeTab,
  authMode,
  serverUrl,
  username,
  password,
  proxyUrl,
  clientId,
  rememberMe,
  showPassword,
  isLoading,
  onServerUrlChange,
  onUsernameChange,
  onPasswordChange,
  onProxyUrlChange,
  onClientIdChange,
  onRememberMeChange,
  onTogglePasswordVisibility,
  onFillDemoCredentials,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit}>
      {/* Direct Mode Fields */}
      {activeTab === 0 && (
        <>
          <TextField
            label="Server URL"
            variant="outlined"
            fullWidth
            margin="normal"
            placeholder="https://mattermost.example.com"
            value={serverUrl}
            onChange={(e) => onServerUrlChange(e.target.value)}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography variant="body2" color="text.secondary">
                    🔗
                  </Typography>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            required
          />
          <TextField
            label="Password"
            variant="outlined"
            fullWidth
            margin="normal"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={onTogglePasswordVisibility}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => onRememberMeChange(e.target.checked)}
              />
            }
            label="Remember me"
            sx={{ mt: 1 }}
          />
        </>
      )}

      {/* Proxy Mode Fields */}
      {activeTab === 1 && (
        <>
          <TextField
            label="Proxy URL"
            variant="outlined"
            fullWidth
            margin="normal"
            placeholder="https://proxy.example.com"
            value={proxyUrl}
            onChange={(e) => onProxyUrlChange(e.target.value)}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography variant="body2" color="text.secondary">
                    🔗
                  </Typography>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Client ID"
            variant="outlined"
            fullWidth
            margin="normal"
            placeholder="your-client-id"
            value={clientId}
            onChange={(e) => onClientIdChange(e.target.value)}
            required
          />
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            required
          />
          <TextField
            label="Password"
            variant="outlined"
            fullWidth
            margin="normal"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={onTogglePasswordVisibility}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </>
      )}

      {/* Demo Mode */}
      {activeTab === 2 && (
        <Typography variant="body1" sx={{ textAlign: "center", py: 3 }}>
          Demo mode uses mock data to showcase the components without requiring a real Mattermost server.
        </Typography>
      )}

      {/* Demo credentials helper */}
      {(activeTab === 0 || activeTab === 1) && (
        <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
          Need test credentials?{" "}
          <Link
            component="button"
            variant="body2"
            onClick={(e) => {
              e.preventDefault();
              onFillDemoCredentials();
            }}
            sx={{ cursor: "pointer" }}
          >
            Fill demo credentials
          </Link>
        </Typography>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isLoading}
        sx={{
          mt: 3,
          py: 1.5,
          bgcolor: "#0058CC",
          "&:hover": {
            bgcolor: "#004A99",
          },
        }}
      >
        {isLoading
          ? "Connecting..."
          : activeTab === 0
          ? "Connect to Server"
          : activeTab === 1
          ? "Connect via Proxy"
          : "Launch Demo"}
      </Button>
    </form>
  );
};