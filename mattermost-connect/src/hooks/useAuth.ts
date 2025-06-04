import { useCallback } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { selectCurrentUser, selectCurrentUserId, selectCurrentTeamId, selectIsAuthenticated, selectAuthToken, selectServerUrl, selectIsLoggingIn, selectLoginError, selectWebSocketStatus } from '../store/selectors';
import { loginUser, logoutUser, getCurrentUser, setServerUrl } from '../store/slices/authSlice';
import { LoginRequest } from '../api/types';

// Auth hook providing authentication state and actions
export const useAuth = () => {
  const dispatch = useAppDispatch();
  
  // Auth state (using individual selectors to avoid object recreation)
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const token = useAppSelector(selectAuthToken);
  const serverUrl = useAppSelector(selectServerUrl);
  const isLoggingIn = useAppSelector(selectIsLoggingIn);
  const loginError = useAppSelector(selectLoginError);
  const currentUserId = useAppSelector(selectCurrentUserId);
  const currentTeamId = useAppSelector(selectCurrentTeamId);
  const currentUser = useAppSelector(selectCurrentUser);
  const connectionStatus = useAppSelector(selectWebSocketStatus);

  // No initialization here - handled at app level

  // Auth actions
  const login = useCallback(
    async (credentials: LoginRequest & { serverUrl: string }) => {
      const result = await dispatch(loginUser(credentials));
      return loginUser.fulfilled.match(result);
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    await dispatch(logoutUser());
  }, [dispatch]);

  const refreshUser = useCallback(async () => {
    const result = await dispatch(getCurrentUser());
    return getCurrentUser.fulfilled.match(result);
  }, [dispatch]);

  const updateServerUrl = useCallback((url: string) => {
    dispatch(setServerUrl(url));
  }, [dispatch]);

  return {
    // State
    isAuthenticated,
    isLoggingIn,
    loginError,
    token,
    serverUrl,
    currentUser,
    currentUserId,
    connectionStatus,
    
    // Actions
    login,
    logout,
    refreshUser,
    updateServerUrl,
  };
};

export default useAuth;