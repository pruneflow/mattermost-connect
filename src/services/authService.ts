import { store } from '../store';
import { loginUser, logoutUser, getCurrentUser, setServerUrl } from '../store/slices/authSlice';
import { 
  selectIsAuthenticated,
  selectAuthToken,
  selectServerUrl,
  selectIsLoggingIn,
  selectLoginError,
  selectCurrentUser,
  selectCurrentUserId,
  selectWebSocketStatus
} from '../store/selectors';
import type { LoginRequest, UserProfile } from '../api/types';

// Auth state getters
export const isAuthenticated = (): boolean => {
  const state = store.getState();
  return selectIsAuthenticated(state);
};

export const getAuthToken = (): string | null => {
  const state = store.getState();
  return selectAuthToken(state);
};

export const getServerUrl = (): string | null => {
  const state = store.getState();
  return selectServerUrl(state);
};

export const isLoggingIn = (): boolean => {
  const state = store.getState();
  return selectIsLoggingIn(state);
};

export const getLoginError = (): string | null => {
  const state = store.getState();
  return selectLoginError(state);
};

export const getAuthenticatedUser = (): UserProfile | null => {
  const state = store.getState();
  return selectCurrentUser(state);
};

export const getCurrentUserId = (): string => {
  const state = store.getState();
  return selectCurrentUserId(state) || '';
};

export const getConnectionStatus = (): string => {
  const state = store.getState();
  return selectWebSocketStatus(state);
};

// Auth actions
export const login = async (credentials: LoginRequest & { serverUrl: string }): Promise<boolean> => {
  const result = await store.dispatch(loginUser(credentials));
  return loginUser.fulfilled.match(result);
};

export const logout = async (): Promise<void> => {
  await store.dispatch(logoutUser());
};

export const refreshUser = async (): Promise<boolean> => {
  const result = await store.dispatch(getCurrentUser());
  return getCurrentUser.fulfilled.match(result);
};

export const updateServerUrl = (url: string): void => {
  store.dispatch(setServerUrl(url));
};