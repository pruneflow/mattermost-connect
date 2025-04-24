// src/providers/AuthProvider.tsx
/**
 * Provider pour la gestion de l'authentification
 * Expose les fonctionnalités d'authentification et l'état courant
 */
import React, {
  useEffect,
  useMemo,
  useCallback,
  useState,
  ReactNode,
} from "react";
import { useServices } from "./ServicesProvider";
import { AuthContext, AuthContextValue } from "./contexts";
import { selectAuthStateForHook } from "../core/store/selectors/auth.selectors";
import { useStoreSelector } from "../hooks/useStoreSelector";
import { User } from "../core/types/users.types";

/**
 * Propriétés du provider d'authentification
 */
interface AuthProviderProps {
  /** Enfants du provider */
  children: ReactNode;

  /** Initialiser automatiquement l'authentification */
  autoInitialize?: boolean;

  /** Callback appelé après initialisation */
  onInitialized?: (isAuthenticated: boolean) => void;

  /** Callback appelé après connexion réussie */
  onLoginSuccess?: (user: User) => void;

  /** Callback appelé après déconnexion */
  onLogout?: () => void;
}

/**
 * Hook pour accéder au contexte d'authentification
 *
 * @returns Contexte d'authentification
 * @throws Error si utilisé en dehors d'un AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

/**
 * Provider pour la gestion de l'authentification
 *
 * @example
 * ```tsx
 * <AuthProvider
 *   autoInitialize={true}
 *   onLoginSuccess={(user) => console.log(`Welcome ${user.username}!`)}
 * >
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({
  children,
  autoInitialize = true,
  onInitialized,
  onLoginSuccess,
  onLogout,
}: AuthProviderProps): JSX.Element {
  const { authService, errorService } = useServices();
  const [isInitializing, setIsInitializing] = useState(autoInitialize);

  // Sélectionner les données d'auth du store avec un sélecteur optimisé
  const { isAuthenticated, isAuthenticating, currentUser, error } =
    useStoreSelector(selectAuthStateForHook);

  // Initialiser l'authentification au montage
  useEffect(() => {
    if (autoInitialize) {
      const initialize = async () => {
        try {
          const isAuth = await authService.initializeAuth();
          if (onInitialized) {
            onInitialized(isAuth);
          }
        } catch (err) {
          errorService.handleError(
            err instanceof Error ? err : new Error(String(err)),
            { source: "AuthProvider.initialize" },
          );
        } finally {
          setIsInitializing(false);
        }
      };

      initialize();
    }
  }, [authService, errorService, autoInitialize, onInitialized]);

  // Action pour le login
  const login = useCallback(
    async (username: string, password: string, serverUrl?: string) => {
      try {
        const result = await authService.login(username, password);

        if (onLoginSuccess && result.token && currentUser) {
          onLoginSuccess(currentUser);
        }

        return result;
      } catch (err) {
        errorService.handleError(
          err instanceof Error ? err : new Error(String(err)),
          { source: "AuthProvider.login", username },
        );
        throw err;
      }
    },
    [authService, errorService, currentUser, onLoginSuccess],
  );

  // Action pour le logout
  const logout = useCallback(() => {
    try {
      authService.logout();

      if (onLogout) {
        onLogout();
      }
    } catch (err) {
      errorService.handleError(
        err instanceof Error ? err : new Error(String(err)),
        { source: "AuthProvider.logout" },
      );
    }
  }, [authService, errorService, onLogout]);

  // Contexte mémoïsé
  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      isAuthenticating: isAuthenticating || isInitializing,
      currentUser,
      error,
      serverUrl: authService.getStoredServerUrl() || undefined,
      login,
      logout,
    }),
    [
      isAuthenticated,
      isAuthenticating,
      isInitializing,
      currentUser,
      error,
      authService,
      login,
      logout,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
