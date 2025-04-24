// src/hooks/useAuth.tsx
/**
 * Hook for authentication functionality
 */
import { useCallback } from "react";
import { useAuthStore } from "../core/store/authStore";
import {
  useCurrentUserQuery,
  useLoginMutation,
  useLogoutMutation,
} from "../core/api/queries/authQueries";
import { User } from "../core/services/authService";

/**
 * Login parameters
 */
export interface LoginParams {
  /** Username or email */
  username: string;
  /** Password */
  password: string;
  /** Server URL (for direct mode) */
  serverUrl?: string;
}

/**
 * Hook that provides authentication functionality
 * @returns Authentication state and actions
 */
export function useAuth() {
  // Get state from store
  const { isAuthenticated, isAuthenticating, currentUser, error, serverUrl } =
    useAuthStore();

  // Get mutations
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  // Get current user query
  const currentUserQuery = useCurrentUserQuery();

  /**
   * Login with username and password
   * @param params Login parameters
   * @returns Promise resolving to the logged in user
   */
  const login = useCallback(
    async (params: LoginParams): Promise<User> => {
      return loginMutation.mutateAsync({
        username: params.username,
        password: params.password,
        serverUrl: params.serverUrl,
      });
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
  const refreshCurrentUser = useCallback(async () => {
    if (!isAuthenticated) return null;
    return currentUserQuery.refetch().then((result) => result.data || null);
  }, [isAuthenticated, currentUserQuery]);

  return {
    // State
    isAuthenticated,
    isAuthenticating: isAuthenticating || loginMutation.isPending,
    currentUser,
    error: error || loginMutation.error,
    serverUrl,

    // Status indicators
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isRefreshing: currentUserQuery.isRefetching,

    // Actions
    login,
    logout,
    refreshCurrentUser,
  };
}

/**
 * Hook that requires authentication
 * @param redirectUrl URL to redirect to if not authenticated
 * @returns Authentication state and actions
 */
export function useRequireAuth(redirectUrl: string = "/login") {
  const { isAuthenticated, isAuthenticating } = useAuth();

  // If we're in a browser environment, redirect if not authenticated
  if (typeof window !== "undefined" && !isAuthenticated && !isAuthenticating) {
    window.location.href = redirectUrl;
  }

  return useAuth();
}
