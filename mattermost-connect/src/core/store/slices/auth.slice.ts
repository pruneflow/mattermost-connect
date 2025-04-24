// src/core/store/slices/auth.slice.ts
/**
 * Slice pour la gestion de l'authentification
 */
import { createReducer, createAction, Action } from "../store";
import { User } from "../../services/auth.service";

export interface AuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  token: string | null;
  currentUser: User | null;
  error: Error | null;
  serverUrl?: string;
}

// État initial
const initialState: AuthState = {
  isAuthenticated: false,
  isAuthenticating: false,
  token: null,
  currentUser: null,
  error: null,
  serverUrl: undefined,
};

// Actions
export const authLogin = createAction<{ username: string; password: string }>(
  "AUTH_LOGIN_REQUEST",
);
export const authLoginSuccess = createAction<{
  token: string;
  currentUser: User;
  userId: string;
  serverUrl?: string;
}>("AUTH_LOGIN_SUCCESS");
export const authLoginError = createAction<{ error: Error; username: string }>(
  "AUTH_LOGIN_ERROR",
);
export const authLogout = createAction("AUTH_LOGOUT");
export const authValidateToken = createAction("AUTH_VALIDATE_TOKEN_REQUEST");
export const authValidateTokenSuccess = createAction<{
  token: string;
  currentUser: User;
  userId: string;
  serverUrl?: string;
}>("AUTH_VALIDATE_TOKEN_SUCCESS");
export const authValidateTokenError = createAction<{ error: Error }>(
  "AUTH_VALIDATE_TOKEN_ERROR",
);
export const authSetCurrentUser = createAction<{ currentUser: User }>(
  "AUTH_SET_CURRENT_USER",
);

// Reducer
export const authReducer = createReducer<AuthState>(initialState, {
  [authLogin.type]: (state, payload) => ({
    ...state,
    isAuthenticating: true,
    error: null,
  }),

  [authLoginSuccess.type]: (state, payload) => ({
    ...state,
    isAuthenticated: true,
    isAuthenticating: false,
    token: payload.token,
    currentUser: payload.currentUser,
    error: null,
    serverUrl: payload.serverUrl,
  }),

  [authLoginError.type]: (state, payload) => ({
    ...state,
    isAuthenticated: false,
    isAuthenticating: false,
    error: payload.error,
  }),

  [authLogout.type]: () => ({
    ...initialState,
  }),

  [authValidateToken.type]: (state) => ({
    ...state,
    isAuthenticating: true,
    error: null,
  }),

  [authValidateTokenSuccess.type]: (state, payload) => ({
    ...state,
    isAuthenticated: true,
    isAuthenticating: false,
    token: payload.token,
    currentUser: payload.currentUser,
    error: null,
    serverUrl: payload.serverUrl,
  }),

  [authValidateTokenError.type]: (state, payload) => ({
    ...state,
    isAuthenticated: false,
    isAuthenticating: false,
    token: null,
    currentUser: null,
    error: payload.error,
  }),

  [authSetCurrentUser.type]: (state, payload) => ({
    ...state,
    currentUser: payload.currentUser,
  }),
});
