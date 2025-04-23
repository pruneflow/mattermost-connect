// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
  useEffect,
} from "react";
import { useMattermost } from "./MattermostProvider";
import { User } from "../types";
import { assertServiceInitialized } from "../services";

// Define the authentication result type
export interface AuthResult {
  token: string;
  serverUrl?: string;
}

// Define authentication configuration options
export interface AuthConfig {
  // Direct mode
  serverUrl?: string;
  token?: string;

  // Proxy mode
  proxyUrl?: string;
  clientId?: string;
  userId?: string;

  // Other options
  [key: string]: any;
}

// Define the context type
export interface AuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  error: Error | null;
  currentUser: User | null;

  // Authentication methods
  login: (
    username: string,
    password: string,
    config?: AuthConfig,
  ) => Promise<AuthResult | null>;
  loginWithToken: (token: string, serverUrl?: string) => Promise<boolean>;
  logout: () => void;
  validateToken: (token: string) => Promise<boolean>;

  // Token storage methods
  getStoredToken: () => string | null;
  getStoredServerUrl: () => string | null;
}

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Hook to use the auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Props for the AuthProvider component
export interface AuthProviderProps {
  children: ReactNode;
  storeToken?: boolean;
  tokenStorageKey?: string;
  serverStorageKey?: string;
}

/**
 * Provider component for authentication management
 * Handles user authentication, token storage, and user session
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  storeToken = true,
  tokenStorageKey = "mattermost_token",
  serverStorageKey = "mattermost_server",
}) => {
  // Get Mattermost context data
  const { services, isServiceConfigured, updateServiceConfig, mode, config } =
    useMattermost();
  console.debug("services", services?.mattermostService);
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Check for stored token on mount and when config changes
  useEffect(() => {
    const checkStoredCredentials = async () => {
      // Skip if we already have a token in config or we're not using local storage
      if (config.token || !storeToken) return;

      const storedToken = localStorage.getItem(tokenStorageKey);
      const storedServerUrl = localStorage.getItem(serverStorageKey);

      if (storedToken) {
        // Before updating config with stored values, validate if needed
        if (services?.mattermostService?.validateToken) {
          try {
            const isValid =
              await services.mattermostService.validateToken(storedToken);
            if (!isValid) {
              console.warn("Stored token is invalid, not using it");
              return;
            }
          } catch (err) {
            console.warn("Error validating token:", err);
            return;
          }
        }

        // Update service configuration with stored values
        if (mode === "direct" && storedServerUrl) {
          updateServiceConfig({
            serverUrl: storedServerUrl,
            token: storedToken,
          });
        } else if (mode === "direct") {
          updateServiceConfig({
            token: storedToken,
          });
        }
      }
    };

    void checkStoredCredentials();
  }, [
    services,
    storeToken,
    tokenStorageKey,
    serverStorageKey,
    updateServiceConfig,
    mode,
    config.token,
  ]);

  // Check authentication status when services change
  useEffect(() => {
    // If we have services and a token, attempt to initialize authentication
    if (services?.mattermostService && config.token) {
      setIsAuthenticating(true);

      try {
        assertServiceInitialized(
          services.mattermostService,
          "mattermostService",
        );

        // Try to get current user
        services.mattermostService
          .getCurrentUser()
          .then((user) => {
            setCurrentUser(user);
            setIsAuthenticated(true);
          })
          .catch((err) => {
            console.error("Error getting current user:", err);
            setError(err instanceof Error ? err : new Error(String(err)));
            setIsAuthenticated(false);
          })
          .finally(() => {
            setIsAuthenticating(false);
          });
      } catch (error) {
        console.error("Service not initialized:", error);
        setIsAuthenticating(false);
      }
    }
  }, [services, config.token]);

  /**
   * Login with username and password
   * Optionally accepts additional configuration for first-time setup
   */
  const login = useCallback(
    async (
      username: string,
      password: string,
      authConfig?: AuthConfig,
    ): Promise<AuthResult | null> => {
      setIsAuthenticating(true);
      setError(null);

      try {
        // If we have auth config and the service is not configured or mode doesn't match,
        // update the service configuration first
        if (authConfig) {
          let shouldUpdateConfig = !isServiceConfigured;

          // Check if we need to update based on mode change or different server URL
          if (
            authConfig.serverUrl &&
            authConfig.serverUrl !== config.serverUrl
          ) {
            shouldUpdateConfig = true;
          } else if (
            authConfig.proxyUrl &&
            authConfig.proxyUrl !== config.proxyUrl
          ) {
            shouldUpdateConfig = true;
          } else if (authConfig.token && authConfig.token !== config.token) {
            shouldUpdateConfig = true;
          }

          if (shouldUpdateConfig) {
            console.log("Updating service configuration before login");
            updateServiceConfig(authConfig);

            // If token is already provided in config, no need to authenticate
            if (authConfig.token) {
              // Give the service time to initialize with the new config
              await new Promise((resolve) => setTimeout(resolve, 5000));

              // Once services are updated, try to get the current user
              if (services?.mattermostService) {
                try {
                  const user =
                    await services.mattermostService.getCurrentUser();
                  setCurrentUser(user);
                  setIsAuthenticated(true);

                  // Store token if enabled
                  if (storeToken && authConfig.token) {
                    localStorage.setItem(tokenStorageKey, authConfig.token);
                    if (authConfig.serverUrl) {
                      localStorage.setItem(
                        serverStorageKey,
                        authConfig.serverUrl,
                      );
                    }
                  }

                  return {
                    token: authConfig.token,
                    serverUrl: authConfig.serverUrl,
                  };
                } catch (userError) {
                  console.error("Error getting user with token:", userError);
                  // Continue to normal authentication flow
                }
              }
            }

            // Wait for services to initialize with new config
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }

        // Now that the configuration is updated, we can authenticate
        if (!services?.mattermostService) {
          throw new Error("Authentication service not available");
        }

        // Ensure service has authenticate method
        if (!services.mattermostService.authenticate) {
          throw new Error("Authentication method not available");
        }

        // Special case for mock mode - skip actual authentication
        if (mode === "custom") {
          // For mock mode, we don't need actual authentication
          // Just set the authenticated state if we have a current user
          if (services.mattermostService.getCurrentUser) {
            const user = await services.mattermostService.getCurrentUser();
            setCurrentUser(user);
            setIsAuthenticated(true);
            return { token: "mock-token" };
          }
        }

        // For direct and proxy modes: authenticate with the service
        const result = await services.mattermostService.authenticate(
          username,
          password,
        );

        // Store token if enabled
        if (storeToken) {
          localStorage.setItem(tokenStorageKey, result.token);
          if (result.serverUrl) {
            localStorage.setItem(serverStorageKey, result.serverUrl);
          }
        }

        // Update service configuration with the token
        updateServiceConfig({
          token: result.token,
        });

        // Set authenticated state
        setIsAuthenticated(true);

        // Load user information
        const user = await services.mattermostService.getCurrentUser();
        setCurrentUser(user);

        return result;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        return null;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [
      services,
      storeToken,
      tokenStorageKey,
      serverStorageKey,
      updateServiceConfig,
      isServiceConfigured,
      config,
      mode,
    ],
  );

  /**
   * Login with an existing token
   */
  const loginWithToken = useCallback(
    async (token: string, serverUrl?: string): Promise<boolean> => {
      if (!token) {
        setError(new Error("Token is required"));
        return false;
      }

      setIsAuthenticating(true);
      setError(null);

      try {
        // Update service configuration with the token
        const configUpdate: any = { token };
        if (serverUrl) {
          configUpdate.serverUrl = serverUrl;
        }
        updateServiceConfig(configUpdate);

        // Store token if enabled
        if (storeToken) {
          localStorage.setItem(tokenStorageKey, token);
          if (serverUrl) {
            localStorage.setItem(serverStorageKey, serverUrl);
          }
        }

        // Wait for services to initialize with new config
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify token by getting current user
        if (services?.mattermostService) {
          try {
            const user = await services.mattermostService.getCurrentUser();
            setCurrentUser(user);
            setIsAuthenticated(true);
            return true;
          } catch (error) {
            console.error("Failed to get user with token:", error);
            throw new Error("Invalid token");
          }
        }

        return true;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [
      storeToken,
      tokenStorageKey,
      serverStorageKey,
      updateServiceConfig,
      services,
    ],
  );

  /**
   * Validate a token against the server
   */
  const validateToken = useCallback(
    async (token: string): Promise<boolean> => {
      if (!services?.mattermostService) {
        return false;
      }

      // Check if validateToken method exists
      if (!services.mattermostService.validateToken) {
        console.warn("Token validation not supported by this service");
        return true; // Assume valid if we can't validate
      }

      try {
        return await services.mattermostService.validateToken(token);
      } catch (error) {
        console.error("Error validating token:", error);
        return false;
      }
    },
    [services],
  );

  /**
   * Logout the current user
   */
  const logout = useCallback(() => {
    // Clear authentication state
    setIsAuthenticated(false);
    setCurrentUser(null);

    // Remove stored tokens
    if (storeToken) {
      localStorage.removeItem(tokenStorageKey);
      localStorage.removeItem(serverStorageKey);
    }

    // Reset service configuration
    updateServiceConfig({
      token: undefined,
    });
  }, [storeToken, tokenStorageKey, serverStorageKey, updateServiceConfig]);

  /**
   * Get stored token from local storage
   */
  const getStoredToken = useCallback((): string | null => {
    if (!storeToken) return null;
    return localStorage.getItem(tokenStorageKey);
  }, [storeToken, tokenStorageKey]);

  /**
   * Get stored server URL from local storage
   */
  const getStoredServerUrl = useCallback((): string | null => {
    if (!storeToken) return null;
    return localStorage.getItem(serverStorageKey);
  }, [storeToken, serverStorageKey]);

  // Create context value
  const contextValue = useMemo<AuthContextType>(
    () => ({
      isAuthenticated,
      isAuthenticating,
      error,
      currentUser,
      login,
      loginWithToken,
      logout,
      validateToken,
      getStoredToken,
      getStoredServerUrl,
    }),
    [
      isAuthenticated,
      isAuthenticating,
      error,
      currentUser,
      login,
      loginWithToken,
      logout,
      validateToken,
      getStoredToken,
      getStoredServerUrl,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export default AuthProvider;
