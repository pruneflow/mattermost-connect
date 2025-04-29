// src/hooks/useAuth.tsx
/**
 * Hook for authentication functionality
 * Provides a simplified interface for working with authentication
 */
import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "../core/store";
import {
  useCurrentUserQuery,
  useLoginMutation,
  useLogoutMutation,
  useInitializeAuthQuery,
} from "../core/api/queries/authQueries";
import { User, LoginParams } from "../types";

/**
 * Hook that provides authentication functionality
 * @returns Authentication state and actions
 */
export function useAuth() {
  // Get state from store
  const {
    isAuthenticated,
    isAuthenticating,
    currentUser,
    error,
    serverUrl,
    refreshCurrentUser,
  } = useAuthStore();

  // Get queries and mutations
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  const currentUserQuery = useCurrentUserQuery();
  const initializeAuthQuery = useInitializeAuthQuery();

  // Track initialization status
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize authentication on mount
  useEffect(() => {
    if (!isInitialized && !isAuthenticated && !isAuthenticating) {
      initializeAuthQuery.refetch().then(() => {
        setIsInitialized(true);
      });
    }
  }, [isInitialized, isAuthenticated, isAuthenticating, initializeAuthQuery]);

  /**
   * Login with username and password
   * @param params Login parameters
   * @returns Promise resolving to the logged in user
   */
  const login = useCallback(
    async (params: LoginParams): Promise<User> => {
      return loginMutation.mutateAsync(params);
    },
    [loginMutation],
  );

  /**
   * Logout the current user
   */
  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  /**
   * Refresh the current user
   * @returns Promise resolving to the refreshed user
   */
  const refresh = useCallback(async () => {
    if (!isAuthenticated) return null;
    return refreshCurrentUser();
  }, [isAuthenticated, refreshCurrentUser]);

  return {
    // State
    isAuthenticated,
    isAuthenticating: isAuthenticating || loginMutation.isPending,
    isInitialized,
    currentUser,
    error: error || loginMutation.error,
    serverUrl,

    // Status indicators
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isRefreshing: currentUserQuery.isRefetching,
    isInitializing: initializeAuthQuery.isRefetching,

    // Actions
    login,
    logout,
    refresh,
  };
}

/**
 * Hook that requires authentication
 * If user is not authenticated, redirects to login page
 *
 * @param redirectUrl URL to redirect to if not authenticated
 * @returns Authentication state and actions
 */
export function useRequireAuth(redirectUrl: string = "/login") {
  const { isAuthenticated, isAuthenticating, isInitialized } = useAuth();

  // Redirect to login if not authenticated and not in the process of authenticating
  useEffect(() => {
    if (
      isInitialized &&
      !isAuthenticated &&
      !isAuthenticating &&
      typeof window !== "undefined"
    ) {
      window.location.href = redirectUrl;
    }
  }, [isAuthenticated, isAuthenticating, isInitialized, redirectUrl]);

  return useAuth();
}
