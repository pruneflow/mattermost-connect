// src/core/store/selectors/auth.selectors.ts
/**
 * Sélecteurs pour l'état d'authentification
 */

import { createSelector } from "../selector-utils";
import { RootState } from "../store.config";

/**
 * Sélectionne l'état d'authentification complet
 */
export const selectAuthState = (state: RootState) => state.auth;

/**
 * Sélectionne l'indicateur d'authentification
 */
export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (authState) => authState.isAuthenticated,
);

/**
 * Sélectionne l'indicateur de chargement de l'authentification
 */
export const selectIsAuthenticating = createSelector(
  selectAuthState,
  (authState) => authState.isAuthenticating,
);

/**
 * Sélectionne l'utilisateur courant
 */
export const selectCurrentUser = createSelector(
  selectAuthState,
  (authState) => authState.currentUser,
);

/**
 * Sélectionne l'ID de l'utilisateur courant
 */
export const selectCurrentUserId = createSelector(
  selectCurrentUser,
  (currentUser) => currentUser?.id || null,
);

/**
 * Sélectionne le token d'authentification
 */
export const selectAuthToken = createSelector(
  selectAuthState,
  (authState) => authState.token,
);

/**
 * Sélectionne l'erreur d'authentification
 */
export const selectAuthError = createSelector(
  selectAuthState,
  (authState) => authState.error,
);

/**
 * Sélectionne l'URL du serveur
 */
export const selectServerUrl = createSelector(
  selectAuthState,
  (authState) => authState.serverUrl,
);

/**
 * Sélectionne l'état d'authentification pour le hook useAuth
 */
export const selectAuthStateForHook = createSelector(
  selectIsAuthenticated,
  selectIsAuthenticating,
  selectCurrentUser,
  selectAuthError,
  (isAuthenticated, isAuthenticating, currentUser, error) => ({
    isAuthenticated,
    isAuthenticating,
    currentUser,
    error,
  }),
);
