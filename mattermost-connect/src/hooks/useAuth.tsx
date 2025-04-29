// src/hooks/useAuth.tsx
/**
 * Authentication hooks
 * Provides standardized access to authentication functionality
 */
import { useState, useEffect, useCallback } from "react";
import {
  useLoginMutation,
  useLogoutMutation,
  useCurrentUserQuery,
  useInitializeAuthQuery,
} from "../core/api/queries/authQueries";
import { useAuthStore } from "../core/store/authStore";
import { useWsStore } from "../core/store/wsStore";
import { User, LoginParams } from "../types";
import { handleError } from "../core/store/errorStore";
import { ErrorSource } from "../types";

/**
 * Hook for authentication functionality
 * Provides standardized interface for login, logout, and auth state
 */
export function useAuth() {
  const {
    isAuthenticated,
    isAuthenticating,
    currentUser,
    token,
    serverUrl,
    error,
  } = useAuthStore();

  // Use React Query mutations for login and logout
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  // Additional state for login error tracking
  const [loginError, setLoginError] = useState<Error | null>(null);

  /**
   * Logs in a user with credentials
   * @param credentials Login credentials
   * @returns The authenticated user
   */
  const login = useCallback(
    async (credentials: LoginParams): Promise<User> => {
      try {
        setLoginError(null);
        return await loginMutation.mutateAsync(credentials);
      } catch (error) {
        setLoginError(error as Error);
        throw error;
      }
    },
    [loginMutation],
  );

  /**
   * Logs out the current user
   */
  const logout = useCallback(() => {
    try {
      logoutMutation.mutate();

      // Disconnect WebSocket if connected
      const { isConnected, disconnect } = useWsStore.getState();
      if (isConnected) {
        disconnect(1000, "User logged out");
      }
    } catch (error) {
      handleError(error as Error, ErrorSource.AUTH);
    }
  }, [logoutMutation]);

  /**
   * Refreshes the current user data
   */
  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      return await useAuthStore.getState().refreshCurrentUser();
    } catch (error) {
      handleError(error as Error, ErrorSource.AUTH);
      return null;
    }
  }, []);

  return {
    // Auth state
    isAuthenticated,
    isAuthenticating,
    loginError,
    error,
    currentUser,
    token,
    serverUrl,

    // Auth actions
    login,
    logout,
    refreshUser,
  };
}

/**
 * Hook that requires authentication
 * Redirects or throws error if user is not authenticated
 *
 * @param onUnauthenticated Optional callback when user is not authenticated
 * @returns The authenticated user
 */
export function useRequireAuth(onUnauthenticated?: () => void): User {
  const { isAuthenticated, currentUser } = useAuth();

  useEffect(() => {
    if (!isAuthenticated && onUnauthenticated) {
      onUnauthenticated();
    }
  }, [isAuthenticated, onUnauthenticated]);

  if (!isAuthenticated || !currentUser) {
    throw new Error("Authentication required");
  }

  return currentUser;
}

/**
 * Hook to initialize authentication from stored token
 * @returns Authentication initialization state
 */
export function useAuthInitialize() {
  const initializeQuery = useInitializeAuthQuery();

  return {
    isInitialized: initializeQuery.isSuccess,
    isInitializing: initializeQuery.isLoading,
    error: initializeQuery.error,
    initialized: initializeQuery.data,
  };
}

/**
 * Hook to get the current user
 * @returns Current user query
 */
export function useCurrentUser() {
  const currentUserQuery = useCurrentUserQuery();

  return {
    currentUser: currentUserQuery.data,
    isLoading: currentUserQuery.isLoading,
    error: currentUserQuery.error,
    refetch: currentUserQuery.refetch,
  };
}
