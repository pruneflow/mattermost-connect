import React, { useState } from "react";
import { useAuth } from "mattermost-connect";

interface AuthProviderProps {
  mode: "direct" | "proxy";
  serverUrl?: string;
  proxyUrl?: string;
  clientId?: string;
  username: string;
  password: string;
  onSuccess: (result: any) => void;
  onError: (error: Error) => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  mode,
  serverUrl,
  username,
  password,
  onSuccess,
  onError,
}) => {
  const { login, isAuthenticating, error, currentUser, isAuthenticated } = useAuth();
  const [loginAttempted, setLoginAttempted] = useState(false);
  const [successReported, setSuccessReported] = useState(false);

  React.useEffect(() => {
    if (!loginAttempted && !isAuthenticated) {
      setLoginAttempted(true);

      const authenticate = async () => {
        try {
          console.log("Attempting login with:", { username, mode, serverUrl });

          const user = await login({
            username,
            password,
            serverUrl: mode === "direct" ? serverUrl : undefined,
          });

          console.log("Login successful:", user);
        } catch (err) {
          console.error("Authentication failed:", err);
          onError(err as Error);
        }
      };

      authenticate();
    }
  }, [loginAttempted, isAuthenticated, login, username, password, serverUrl, mode, onError]);

  React.useEffect(() => {
    if (isAuthenticated && currentUser && !successReported) {
      setSuccessReported(true);
      onSuccess({
        user: currentUser,
        mode,
        serverUrl: mode === "direct" ? serverUrl : undefined,
      });
    }
  }, [isAuthenticated, currentUser, successReported, onSuccess, mode, serverUrl]);

  React.useEffect(() => {
    if (error && loginAttempted) {
      onError(error);
    }
  }, [error, loginAttempted, onError]);

  return null;
};