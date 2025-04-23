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
import { User } from "../types";
import { ServiceContainer } from "../services";

// Define authentication modes
type AuthenticationMode =
  | "direct_username"
  | "direct_token"
  | "proxy"
  | "custom";

// Expanded login credentials interface
interface LoginCredentials {
  username?: string;
  password?: string;
  token?: string;
  serverUrl?: string;
  proxyUrl?: string;
  clientId?: string;
  userId?: string;
}

export interface AuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  token: string | null;
  currentUser: User | null;
  config: LoginCredentials;

  // Authentication methods
  login: (
    credentials: LoginCredentials | string,
    password?: string,
  ) => Promise<boolean>;
  loginWithToken: (token: string) => Promise<boolean>;
  logout: () => void;
  refreshCurrentUser: () => Promise<User | null>;

  // Utilities
  validateToken: (token: string) => Promise<boolean>;
  storeTokenInLocalStorage: (store: boolean) => void;
  updateConfig: (config: Partial<LoginCredentials>) => void;
}

// Create the authentication context
export const AuthContext = createContext<AuthContextType | null>(null);

// Hook to use the authentication context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export interface AuthProviderProps {
  children: ReactNode;
  services: ServiceContainer | null;
  initialToken?: string;
  useLocalStorage?: boolean;
  tokenStorageKey?: string;
  onAuthSuccess?: (user: User) => void;
  onAuthError?: (error: Error) => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  services,
  initialToken,
  useLocalStorage = false,
  tokenStorageKey = "mattermost_token",
  onAuthSuccess,
  onAuthError,
}) => {
  // State management
  const [token, setToken] = useState<string | null>(initialToken || null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] =
    useState<boolean>(!!initialToken);
  const [storeTokenLocally, setStoreTokenLocally] =
    useState<boolean>(useLocalStorage);
  const [config, setConfig] = useState<LoginCredentials>({});

  // Determine authentication mode based on credentials
  const determineAuthMode = useCallback(
    (credentials: LoginCredentials): AuthenticationMode => {
      // Priority 1: Explicit credentials
      if (credentials.username && credentials.password)
        return "direct_username";

      if (credentials.token) return "direct_token";

      if (credentials.proxyUrl && credentials.clientId) return "proxy";

      if (services?.mattermostService) {
        const providerConfig = services.mattermostService;
        if (providerConfig.mode === "direct" && providerConfig.token)
          return "direct_token";

        if (providerConfig.mode === "proxy") return "proxy";
      }

      // Fallback
      return "custom";
    },
    [services],
  );

  const validateToken = useCallback(
    async (tokenToValidate: string): Promise<boolean> => {
      if (!services?.mattermostService?.validateToken) return false;

      try {
        return await services.mattermostService.validateToken(tokenToValidate);
      } catch (error) {
        console.error("Error validating token:", error);
        return false;
      }
    },
    [services],
  );

  const refreshCurrentUser = useCallback(async (): Promise<User | null> => {
    if (!services?.mattermostService || !isAuthenticated) return null;

    try {
      const user = await (typeof services.mattermostService
        .refreshCurrentUser === "function"
        ? services.mattermostService.refreshCurrentUser()
        : services.mattermostService.getCurrentUser());

      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error("Error refreshing current user:", error);
      return null;
    }
  }, [services, isAuthenticated]);

  // Authentication method with flexible input
  const login = useCallback(
    async (
      credentialsOrUsername: LoginCredentials | string,
      password?: string,
    ): Promise<boolean> => {
      // Normalize input to LoginCredentials
      const credentials: LoginCredentials =
        typeof credentialsOrUsername === "string"
          ? { username: credentialsOrUsername, password }
          : credentialsOrUsername;

      // Validate service availability
      if (!services?.mattermostService) {
        onAuthError?.(new Error("Mattermost service not initialized"));
        return false;
      }

      // Determine authentication mode
      const authMode = determineAuthMode(credentials);

      try {
        let authResult;
        switch (authMode) {
          case "direct_username":
            if (!credentials.username || !credentials.password) {
              console.error("Username and password are required");
              return false;
            }
            if (!services?.mattermostService?.authenticate) {
              console.error(
                "services.mattermostService.authenticate does not exists",
              );
              return false;
            }
            authResult = await services?.mattermostService?.authenticate(
              credentials.username,
              credentials.password,
            );
            break;

          case "direct_token":
            if (!credentials.token) {
              console.error("Token is required");
              return false;
            }
            // Validate token before using
            const isValid = await validateToken(credentials.token);
            if (!isValid) {
              console.error("Invalid token");
              return false;
            }
            authResult = { token: credentials.token };
            break;

          case "proxy":
            if (!credentials.proxyUrl || !credentials.clientId) {
              console.error("Proxy URL and Client ID are required");
              return false;
            }
            // Implement proxy-specific authentication logic
            authResult = { token: "proxy-token" }; // Placeholder
            break;

          default:
            console.error("No valid authentication method found");
            return false;
        }

        // Update authentication state
        setToken(authResult.token);
        setIsAuthenticated(true);

        // Update configuration
        setConfig(credentials);

        // Store token if enabled
        if (storeTokenLocally) {
          localStorage.setItem(tokenStorageKey, authResult.token);
        }

        // Refresh user
        const user = await refreshCurrentUser();

        // Call success callback
        if (user) {
          onAuthSuccess?.(user);
        }

        return true;
      } catch (error) {
        // Handle authentication errors
        const authError =
          error instanceof Error ? error : new Error(String(error));

        onAuthError?.(authError);

        // Reset authentication state
        setIsAuthenticated(false);
        setToken(null);

        return false;
      }
    },
    [
      services,
      storeTokenLocally,
      tokenStorageKey,
      onAuthSuccess,
      onAuthError,
      determineAuthMode,
      validateToken,
      refreshCurrentUser,
    ],
  );

  // Other methods remain similar to the previous implementation
  const loginWithToken = useCallback(
    async (newToken: string): Promise<boolean> => {
      return login({ token: newToken });
    },
    [login],
  );

  const logout = useCallback((): void => {
    // Clear token from local storage
    if (storeTokenLocally) {
      localStorage.removeItem(tokenStorageKey);
    }

    // Reset authentication state
    setToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    setConfig({});
  }, [storeTokenLocally, tokenStorageKey]);

  const storeTokenInLocalStorage = useCallback(
    (store: boolean): void => {
      setStoreTokenLocally(store);

      if (store && token) {
        localStorage.setItem(tokenStorageKey, token);
      } else if (!store) {
        localStorage.removeItem(tokenStorageKey);
      }
    },
    [token, tokenStorageKey],
  );

  const updateConfig = useCallback(
    (newConfig: Partial<LoginCredentials>): void => {
      setConfig((prev) => ({ ...prev, ...newConfig }));
    },
    [],
  );

  // Effect to load token from local storage on startup
  useEffect(() => {
    if (storeTokenLocally && !token) {
      const storedToken = localStorage.getItem(tokenStorageKey);
      if (storedToken) {
        void loginWithToken(storedToken);
      }
    }
  }, [storeTokenLocally, tokenStorageKey, token, loginWithToken]);

  // Memoized context value
  const contextValue = useMemo<AuthContextType>(
    () => ({
      isAuthenticated,
      token,
      currentUser,
      config,
      login,
      loginWithToken,
      logout,
      refreshCurrentUser,
      validateToken,
      storeTokenInLocalStorage,
      updateConfig,
    }),
    [
      isAuthenticated,
      token,
      currentUser,
      config,
      login,
      loginWithToken,
      logout,
      refreshCurrentUser,
      validateToken,
      storeTokenInLocalStorage,
      updateConfig,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
