// src/core/store/thunks/auth.thunks.ts
import { AuthService } from "../../services/auth.service";
import { Dispatch } from "../store";

/**
 * Initialise l'authentification au démarrage
 */
export const initializeAuth =
  (authService: AuthService) => async (dispatch: Dispatch) => {
    dispatch({ type: "AUTH_VALIDATE_TOKEN_REQUEST" });

    try {
      const isAuthenticated = await authService.initializeAuth();
      return isAuthenticated;
    } catch (error) {
      dispatch({
        type: "AUTH_VALIDATE_TOKEN_ERROR",
        payload: { error },
      });
      return false;
    }
  };

/**
 * Action pour se connecter
 */
export const loginUser =
  (authService: AuthService, username: string, password: string) =>
  async (dispatch: Dispatch) => {
    dispatch({
      type: "AUTH_LOGIN_REQUEST",
      payload: { username },
    });

    try {
      const result = await authService.login(username, password);
      return result;
    } catch (error) {
      dispatch({
        type: "AUTH_LOGIN_ERROR",
        payload: { error, username },
      });
      throw error;
    }
  };

/**
 * Action pour se déconnecter
 */
export const logoutUser =
  (authService: AuthService) => (dispatch: Dispatch) => {
    authService.logout();
    dispatch({ type: "AUTH_LOGOUT" });
  };
