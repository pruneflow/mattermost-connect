// src/hooks/useAuth.ts
import { useState, useCallback } from "react";
import { useConnection, useMattermost } from "../context";
import { assertServiceInitialized } from "../services/factory";

/**
 * Options pour le hook useAuth
 */
interface UseAuthOptions {
  /** Callback à appeler après une authentification réussie */
  onAuthSuccess?: (token: string) => void;

  /** Callback à appeler en cas d'échec d'authentification */
  onAuthError?: (error: Error) => void;

  /** Callback à appeler lors du démarrage de l'authentification */
  onAuthStart?: () => void;

  /** Indique si l'on doit stocker le token dans le localStorage (défaut: false) */
  storeToken?: boolean;

  /** Clé à utiliser pour stocker le token dans le localStorage (défaut: 'mattermost_token') */
  tokenStorageKey?: string;

  /** Clé à utiliser pour stocker l'URL du serveur dans le localStorage (défaut: 'mattermost_server') */
  serverStorageKey?: string;
}

/**
 * Résultat d'une authentification réussie
 */
export interface AuthResult {
  /** Token d'authentification */
  token: string;

  /** URL du serveur (facultatif, fourni uniquement en mode direct) */
  serverUrl?: string;
}

/**
 * État de retour du hook useAuth
 */
interface UseAuthState {
  /** Indique si l'authentification est en cours */
  isAuthenticating: boolean;

  /** Indique si l'utilisateur est authentifié */
  isAuthenticated: boolean;

  /** Erreur éventuelle lors de l'authentification */
  error: Error | null;

  /** Résultat de l'authentification */
  authResult: AuthResult | null;
}

/**
 * Hook personnalisé pour gérer l'authentification à Mattermost
 *
 * @param options Options de configuration
 * @returns État et fonctions pour gérer l'authentification
 */
export function useAuth(options: UseAuthOptions = {}) {
  // Options avec valeurs par défaut
  const {
    onAuthSuccess,
    onAuthError,
    onAuthStart,
    storeToken = false,
    tokenStorageKey = "mattermost_token",
    serverStorageKey = "mattermost_server",
  } = options;

  // Contexte Mattermost
  const { services } = useMattermost();
  const { isConnected } = useConnection();
  // États locaux
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);

  /**
   * Fonction pour s'authentifier avec des identifiants
   * Fonctionne en mode direct et proxy
   */
  const login = useCallback(
    async (username: string, password: string): Promise<AuthResult | null> => {
      if (!services || !services.mattermostService) {
        setError(new Error("Service Mattermost non disponible"));
        return null;
      }

      assertServiceInitialized(services.mattermostService, "mattermostService");

      if (!services.mattermostService.authenticate) {
        setError(
          new Error("La méthode d'authentification n'est pas disponible"),
        );
        return null;
      }

      // Réinitialiser les états
      setIsAuthenticating(true);
      setError(null);
      setAuthResult(null);

      // Notifier le début de l'authentification si callback fourni
      if (onAuthStart) {
        onAuthStart();
      }

      try {
        const result = await services.mattermostService.authenticate(
          username,
          password,
        );

        // Stocker les informations d'authentification
        setAuthResult(result);

        // Stocker dans le localStorage si demandé
        if (storeToken) {
          localStorage.setItem(tokenStorageKey, result.token);
          if (result.serverUrl) {
            localStorage.setItem(serverStorageKey, result.serverUrl);
          }
        }

        // Appeler le callback de succès si fourni
        if (onAuthSuccess) {
          onAuthSuccess(result.token);
        }

        return result;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        console.error("Erreur d'authentification:", errorObj);
        setError(errorObj);

        // Appeler le callback d'erreur si fourni
        if (onAuthError) {
          onAuthError(errorObj);
        }

        return null;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [
      services,
      onAuthStart,
      onAuthSuccess,
      onAuthError,
      storeToken,
      tokenStorageKey,
      serverStorageKey,
    ],
  );

  /**
   * Valide un token existant
   */
  const validateToken = useCallback(
    async (token: string): Promise<boolean> => {
      if (!services || !services.mattermostService) {
        setError(new Error("Service Mattermost non disponible"));
        return false;
      }

      assertServiceInitialized(services.mattermostService, "mattermostService");

      if (!services.mattermostService.validateToken) {
        setError(
          new Error("La méthode de validation de token n'est pas disponible"),
        );
        return false;
      }

      try {
        return await services.mattermostService.validateToken(token);
      } catch (err) {
        console.error("Erreur de validation du token:", err);
        return false;
      }
    },
    [services],
  );

  /**
   * Récupère le token depuis le localStorage
   */
  const getStoredToken = useCallback((): string | null => {
    if (!storeToken) return null;
    return localStorage.getItem(tokenStorageKey);
  }, [storeToken, tokenStorageKey]);

  /**
   * Récupère l'URL du serveur depuis le localStorage
   */
  const getStoredServerUrl = useCallback((): string | null => {
    if (!storeToken) return null;
    return localStorage.getItem(serverStorageKey);
  }, [storeToken, serverStorageKey]);

  /**
   * Déconnecte l'utilisateur en supprimant le token stocké
   */
  const logout = useCallback((): void => {
    // Supprimer le token du localStorage si nécessaire
    if (storeToken) {
      localStorage.removeItem(tokenStorageKey);
      localStorage.removeItem(serverStorageKey);
    }

    // Réinitialiser les états
    setAuthResult(null);
    setError(null);

    // Note: La déconnexion complète nécessiterait de redémarrer l'application
    // ou de réinitialiser le MattermostProvider car le token est utilisé
    // à l'initialisation
  }, [storeToken, tokenStorageKey, serverStorageKey]);

  // État combiné à retourner
  const state: UseAuthState = {
    isAuthenticating,
    isAuthenticated: isConnected,
    error,
    authResult,
  };

  // Retourner l'état et les fonctions
  return {
    ...state,
    login,
    logout,
    validateToken,
    getStoredToken,
    getStoredServerUrl,
  };
}

export default useAuth;
