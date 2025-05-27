import { useCallback, useEffect } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { loginUser, logoutUser, getCurrentUser, setServerUrl } from '../store/slices/authSlice';
import { LoginRequest } from '../api/types';
import { Client4 } from '../api/client';

// Auth hook providing authentication state and actions
export const useAuth = () => {
  const dispatch = useAppDispatch();
  
  // Auth state
  const { isAuthenticated, token, serverUrl } = useAppSelector(state => state.auth);
  const { isLoggingIn, loginError } = useAppSelector(state => state.views.auth);
  const currentUserId = useAppSelector(state => state.entities.users.currentUserId);
  const currentUser = useAppSelector(state => 
    currentUserId ? state.entities.users.profiles[currentUserId] : null
  );

  // Configure Client4 with stored credentials if authenticated
  useEffect(() => {
    if (isAuthenticated && token && serverUrl) {
      if (Client4.getToken() !== token) {
        Client4.setUrl(serverUrl);
        Client4.setToken(token);
      }
    }
  }, [isAuthenticated, token, serverUrl]);

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
    
    // Actions
    login,
    logout,
    refreshUser,
    updateServerUrl,
  };
};

export default useAuth;