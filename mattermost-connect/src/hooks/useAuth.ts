// src/hooks/useAuth.ts
/**
 * Hook pour la gestion de l'authentification
 */
import { useCallback } from "react";
import { useStoreSelector } from "./useStoreSelector";
import { useStoreDispatch } from "./useStoreDispatch";
import { getServices } from "../core/services"; // Supposons une fonction pour accéder aux services
import {
  loginUser,
  logoutUser,
  initializeAuth,
} from "../core/store/thunks/auth.thunks";
import { User } from "../core/services/auth.service";

interface UseAuthReturnType {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  currentUser: User | null;
  error: Error | null;
  login: (username: string, password: string) => Promise<any>;
  logout: () => void;
  initialize: () => Promise<boolean>;
}

export function useAuth(): UseAuthReturnType {
  const dispatch = useStoreDispatch();
  const { authService } = getServices();

  // Sélectionner les données d'auth du store
  const authState = useStoreSelector((state) => state.auth);

  // Action pour initialiser l'auth (vérifier le token stocké)
  const initialize = useCallback(async () => {
    return dispatch(initializeAuth(authService));
  }, [dispatch, authService]);

  // Action pour le login
  const login = useCallback(
    async (username: string, password: string) => {
      return dispatch(loginUser(authService, username, password));
    },
    [dispatch, authService],
  );

  // Action pour le logout
  const logout = useCallback(() => {
    dispatch(logoutUser(authService));
  }, [dispatch, authService]);

  return {
    isAuthenticated: authState.isAuthenticated,
    isAuthenticating: authState.isAuthenticating,
    currentUser: authState.currentUser,
    error: authState.error,
    login,
    logout,
    initialize,
  };
}
