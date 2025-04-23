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

export interface AuthContextType {
  // État d'authentification
  isAuthenticated: boolean;
  token: string | null;
  currentUser: User | null;

  // Méthodes d'authentification
  login: (username: string, password: string) => Promise<boolean>;
  loginWithToken: (token: string) => Promise<boolean>;
  logout: () => void;
  refreshCurrentUser: () => Promise<User | null>;

  // Utilitaires
  validateToken: (token: string) => Promise<boolean>;
  storeTokenInLocalStorage: (store: boolean) => void;
}

// Création du contexte avec une valeur par défaut
export const AuthContext = createContext<AuthContextType | null>(null);

// Hook pour utiliser le contexte d'authentification
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
  tokenStorageKey?: string; // Prop pour la clé de stockage
  onAuthSuccess?: (user: User) => void;
  onAuthError?: (error: Error) => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  services,
  initialToken,
  useLocalStorage = false,
  tokenStorageKey = "mattermost_token", // Valeur par défaut si non fournie
  onAuthSuccess,
  onAuthError,
}) => {
  // État
  const [token, setToken] = useState<string | null>(initialToken || null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] =
    useState<boolean>(!!initialToken);
  const [storeTokenLocally, setStoreTokenLocally] =
    useState<boolean>(useLocalStorage);

  const [configState, setConfigState] = useState<{
    serverUrl?: string;
    proxyUrl?: string;
    clientId?: string;
    userId?: string;
  }>({});

  const updateConfig = useCallback(
    (newConfig: {
      serverUrl?: string;
      proxyUrl?: string;
      clientId?: string;
      userId?: string;
    }) => {
      setConfigState((prev) => ({ ...prev, ...newConfig }));
    },
    [],
  );

  // Authentification avec identifiants
  const login = useCallback(
    async (
      usernameOrConfig:
        | string
        | {
            username: string;
            password: string;
            serverUrl?: string;
            proxyUrl?: string;
            clientId?: string;
          },
      password?: string,
    ): Promise<boolean> => {
      // Gestion d'un objet de configuration complet
      if (typeof usernameOrConfig === "object") {
        const config = usernameOrConfig;

        // Mettre à jour la configuration
        updateConfig({
          serverUrl: config.serverUrl,
          proxyUrl: config.proxyUrl,
          clientId: config.clientId,
        });

        // Authentifier avec username/password
        if (config.username && config.password) {
          // Logic pour créer un service temporaire si nécessaire
          // Ou utiliser le service existant si compatible avec la config

          try {
            // Auth logic...
            return true;
          } catch (error) {
            if (onAuthError) onAuthError(error as Error);
            return false;
          }
        }
      }

      // Cas classique username/password
      else if (typeof usernameOrConfig === "string" && password) {
        if (!services?.mattermostService?.authenticate) return false;

        try {
          const result = await services.mattermostService.authenticate(
            usernameOrConfig,
            password,
          );

          // Mettre à jour token et état...
          return true;
        } catch (error) {
          if (onAuthError) onAuthError(error as Error);
          return false;
        }
      }

      return false;
    },
    [services, updateConfig, onAuthSuccess, onAuthError],
  );

  // Authentification avec token
  const loginWithToken = useCallback(
    async (newToken: string): Promise<boolean> => {
      if (!services?.mattermostService) return false;

      try {
        // Valider le token
        const isValid = await validateToken(newToken);
        if (!isValid) {
          throw new Error("Invalid token");
        }

        // Mettre à jour l'état
        setToken(newToken);
        setIsAuthenticated(true);

        // Stocker le token si demandé
        if (storeTokenLocally) {
          localStorage.setItem(tokenStorageKey, newToken);
        }

        // Charger l'utilisateur
        await refreshCurrentUser();

        return true;
      } catch (error) {
        setIsAuthenticated(false);
        setToken(null);
        const typedError =
          error instanceof Error ? error : new Error(String(error));
        if (onAuthError) onAuthError(typedError);
        return false;
      }
    },
    [services, storeTokenLocally, tokenStorageKey, onAuthError],
  );

  // Déconnexion
  const logout = useCallback((): void => {
    // Supprimer le token du stockage local
    if (storeTokenLocally) {
      localStorage.removeItem(tokenStorageKey);
    }

    // Réinitialiser l'état
    setToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  }, [storeTokenLocally, tokenStorageKey]);

  // Validation de token
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

  // Rafraîchir l'utilisateur courant
  const refreshCurrentUser = useCallback(async (): Promise<User | null> => {
    if (!services?.mattermostService || !isAuthenticated) return null;

    try {
      let user: User;

      // Utiliser refreshCurrentUser si disponible, sinon getCurrentUser
      if (typeof services.mattermostService.refreshCurrentUser === "function") {
        user = await services.mattermostService.refreshCurrentUser();
      } else {
        user = await services.mattermostService.getCurrentUser();
      }

      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error("Error refreshing current user:", error);
      return null;
    }
  }, [services, isAuthenticated]);

  // Configurer le stockage local
  const storeTokenInLocalStorage = useCallback(
    (store: boolean): void => {
      setStoreTokenLocally(store);

      // Si activé, stocker le token actuel
      if (store && token) {
        localStorage.setItem(tokenStorageKey, token);
      }
      // Si désactivé, supprimer le token
      else if (!store) {
        localStorage.removeItem(tokenStorageKey);
      }
    },
    [token, tokenStorageKey],
  );

  // Effet pour charger le token depuis le stockage local au démarrage
  useEffect(() => {
    if (storeTokenLocally && !token) {
      const storedToken = localStorage.getItem(tokenStorageKey);
      if (storedToken) {
        void loginWithToken(storedToken);
      }
    }
  }, [storeTokenLocally, tokenStorageKey, token, loginWithToken]);

  // Valeur du contexte
  const contextValue = useMemo<AuthContextType>(
    () => ({
      isAuthenticated,
      token,
      currentUser,
      login,
      loginWithToken,
      logout,
      refreshCurrentUser,
      validateToken,
      storeTokenInLocalStorage,
      updateConfig,
      config: configState,
    }),
    [
      isAuthenticated,
      token,
      currentUser,
      login,
      loginWithToken,
      logout,
      refreshCurrentUser,
      validateToken,
      storeTokenInLocalStorage,
      updateConfig,
      configState,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
