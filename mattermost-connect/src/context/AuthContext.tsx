// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
  useEffect,
  ComponentType,
} from "react";
import { useMattermost } from "./MattermostProvider";
import { ProviderConfig, User } from "../types";
import { assertServiceInitialized } from "../services";
import AuthenticationRequired from "../components/auth/AuthenticationRequired";
import AuthSkeletonLoader from "../components/auth/AuthSkeletonLoader";

/**
 * Higher-Order Component for Authentication Wrapper
 * Handles authentication state and renders appropriate components
 */
export function withAuthentication<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: {
    /**
     * Optional custom unauthenticated component
     * Defaults to a standard login prompt if not provided
     */
    UnauthenticatedComponent?: ComponentType<{ onLogin: () => void }>;

    /**
     * Optional login handler
     * Useful for custom login flows
     */
    onLogin?: () => void;
  } = {},
) {
  const { UnauthenticatedComponent = AuthenticationRequired, onLogin } =
    options;

  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isAuthenticating } = useAuth();

    // Custom login handler or default to standard login
    const handleLogin =
      onLogin ||
      (() => {
        console.log("Initiating login...");
      });

    // Authentication is still being determined
    if (isAuthenticating) {
      return <AuthSkeletonLoader />;
    }

    // User is not authenticated
    if (!isAuthenticated) {
      return <UnauthenticatedComponent onLogin={handleLogin} />;
    }

    // User is authenticated, render the wrapped component
    return <WrappedComponent {...props} />;
  };
}

/**
 * Hook for authentication-aware rendering
 * Provides a more hook-based approach to authentication
 */
export function useAuthenticatedContent<T>(
  AuthenticatedContent: ComponentType<T>,
  options: {
    UnauthenticatedComponent?: ComponentType<{ onLogin: () => void }>;
    onLogin?: () => void;
  } = {},
) {
  const { isAuthenticated, isAuthenticating } = useAuth();

  const { UnauthenticatedComponent = AuthenticationRequired, onLogin } =
    options;

  // Authentication is still being determined
  if (isAuthenticating) {
    return {
      Component: AuthSkeletonLoader,
      props: {},
    };
  }

  // User is not authenticated
  if (!isAuthenticated) {
    return {
      Component: UnauthenticatedComponent,
      props: {
        onLogin: onLogin || (() => console.log("Login initiated")),
      },
    };
  }

  // User is authenticated
  return {
    Component: AuthenticatedContent,
    props: {},
  };
}

interface Credentials {
  username: string;
  password: string;
}

// Define the context type
export interface AuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  error: Error | null;
  currentUser: User | null;

  logout: () => void;
  validateToken: (token: string) => Promise<boolean>;

  // Token storage methods
  getStoredToken: () => string | null;
  getStoredServerUrl: () => string | null;

  updateCredentials: (
    credentials: Partial<ProviderConfig> & Credentials,
  ) => void;
}

// Create the context
export const AuthContext = createContext<AuthContextType | null>(null);

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
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [credentials, setCredentials] = useState<Credentials>({
    username: "",
    password: "",
  });

  // Method to update service configuration
  const updateCredentials = useCallback(
    (newCredentials: Partial<ProviderConfig> & Credentials) => {
      console.debug("newCredentials", newCredentials);
      const { username, password, ...rest } = newCredentials;
      setCredentials({ username, password });
      updateServiceConfig(rest);
    },
    [],
  );
  console.debug("services", services?.mattermostService);

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

  useEffect(() => {
    const login = async () => {
      if (!services?.mattermostService?.authenticate) return;
      const { username, password } = credentials;
      if (config.serverUrl && !config.token && username && password) {
        const result = await services?.mattermostService?.authenticate(
          username,
          password,
        );
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
      }
    };
    if (!isAuthenticated) {
      void login();
    }
  }, [services, credentials, config, isAuthenticated]);

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
    setCredentials({ username: "", password: "" });
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
      userId: undefined,
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
      logout,
      validateToken,
      getStoredToken,
      getStoredServerUrl,
      updateCredentials,
    }),
    [
      isAuthenticated,
      isAuthenticating,
      error,
      currentUser,
      logout,
      validateToken,
      getStoredToken,
      getStoredServerUrl,
      updateCredentials,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export default AuthProvider;
