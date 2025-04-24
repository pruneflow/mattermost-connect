// src/hooks/useAuth.ts
/**
 * Hook optimisé pour la gestion de l'authentification
 */
import { useCallback } from "react";
import { useStoreSelector } from "./useStoreSelector";
import { useStoreDispatch } from "./useStoreDispatch";
import { getServices } from "../core/services";
import {
  loginUser,
  logoutUser,
  initializeAuth,
} from "../core/store/thunks/auth.thunks";
import { selectAuthStateForHook } from "../core/store/selectors/auth.selectors";
import { User } from "../core/types/users.types";
import { LoginParams } from "../core/types/auth.types";

/**
 * Interface de retour pour le hook useAuth
 */
interface UseAuthReturnType {
  /** Indique si l'utilisateur est authentifié */
  isAuthenticated: boolean;

  /** Indique si une authentification est en cours */
  isAuthenticating: boolean;

  /** Utilisateur connecté */
  currentUser: User | null;

  /** Erreur d'authentification le cas échéant */
  error: Error | null;

  /** Fonction pour se connecter */
  login: (params: LoginParams) => Promise<any>;

  /** Fonction pour se déconnecter */
  logout: () => void;

  /** Fonction pour initialiser l'authentification */
  initialize: () => Promise<boolean>;
}

/**
 * Hook pour la gestion de l'authentification
 *
 * @returns Interface avec l'état d'authentification et les fonctions associées
 *
 * @example
 * ```tsx
 * function LoginForm() {
 *   const { login, isAuthenticating, error } = useAuth();
 *   const [username, setUsername] = useState('');
 *   const [password, setPassword] = useState('');
 *
 *   const handleSubmit = async (e: React.FormEvent) => {
 *     e.preventDefault();
 *     try {
 *       await login({ username, password });
 *     } catch (err) {
 *       // Gérer l'erreur
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *
 *       {error && <div className="error">{error.message}</div>}
 *       <button type="submit" disabled={isAuthenticating}>
 *         {isAuthenticating ? 'Connexion...' : 'Se connecter'}
 *       </button>
 *     </form>
 *   );
 * }
 *
 */
export function useAuth(): UseAuthReturnType {
  const dispatch = useStoreDispatch();
  const { authService } = getServices();

  // Sélectionner les données d'auth du store avec un sélecteur optimisé
  const { isAuthenticated, isAuthenticating, currentUser, error } =
    useStoreSelector(selectAuthStateForHook);

  // Action pour initialiser l'auth (vérifier le token stocké)
  const initialize = useCallback(async () => {
    return dispatch(initializeAuth(authService));
  }, [dispatch, authService]);

  // Action pour le login
  const login = useCallback(
    async (params: LoginParams) => {
      return dispatch(loginUser(authService, params.username, params.password));
    },
    [dispatch, authService],
  );

  // Action pour le logout
  const logout = useCallback(() => {
    dispatch(logoutUser(authService));
  }, [dispatch, authService]);

  return {
    isAuthenticated,
    isAuthenticating,
    currentUser,
    error,
    login,
    logout,
    initialize,
  };
}
