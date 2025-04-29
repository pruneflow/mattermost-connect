// src/core/api/queries/authQueries.ts
/**
 * React Query hooks for authentication operations
 * Provides standardized queries for authentication operations
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { User, LoginParams, ApiError } from "../../../types";
import { emitEvent, useAuthStore, handleError } from "../../store";
import { apiClient } from "../client";
import { QUERY_KEYS } from "../queryClient";
import { createQueryOptions, createMutationOptions } from "../queryUtils";
import { EventType } from "../../../types";
import { ErrorSource } from "../../../types";

/**
 * Fetches the current authenticated user
 * @returns Query hook for current user
 */
export const useCurrentUserQuery = () => {
  const { refreshCurrentUser, setLoading, setError } = useAuthStore();

  return useQuery<User, ApiError>({
    queryKey: QUERY_KEYS.auth.current,
    queryFn: async () => {
      setLoading(true);

      try {
        const user = await refreshCurrentUser();

        if (!user) {
          throw new Error("Failed to fetch current user");
        }

        return user;
      } catch (error) {
        setError(error as Error);
        // Use standardized error handling
        handleError(error as Error, ErrorSource.AUTH);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    // Only fetch if authenticated
    enabled: useAuthStore.getState().isAuthenticated,
    // Use optimized query options
    ...createQueryOptions("user", {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Don't refetch on window focus (handled by WebSocket events)
      refetchOnWindowFocus: false,
    }),
  });
};

/**
 * Login mutation
 */
export const useLoginMutation = () => {
  const { login, setLoading, setError } = useAuthStore();

  return useMutation<User, ApiError, LoginParams>({
    mutationFn: async ({ username, password, serverUrl }: LoginParams) => {
      setLoading(true);

      try {
        const user = await login({ username, password, serverUrl });

        // Emit login success event
        emitEvent(EventType.LOGIN_SUCCESS, {
          user,
          timestamp: Date.now(),
        });

        return user;
      } catch (error) {
        setError(error as Error);
        // Use standardized error handling
        handleError(error as Error, ErrorSource.AUTH);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    ...createMutationOptions({
      // Don't retry login attempts
      retry: false,
    }),
  });
};

/**
 * Logout mutation
 */
export const useLogoutMutation = () => {
  const { logout } = useAuthStore();

  return useMutation<boolean, ApiError, void>({
    mutationFn: async () => {
      // Get current user before logout for event emission
      const currentUser = useAuthStore.getState().currentUser;

      // Execute logout
      logout();

      // Emit logout event
      emitEvent(EventType.LOGOUT, {
        user: currentUser,
        timestamp: Date.now(),
      });

      return true;
    },
    ...createMutationOptions(),
  });
};

/**
 * Forgot password mutation
 */
export const useForgotPasswordMutation = () => {
  return useMutation<boolean, ApiError, string>({
    mutationFn: async (email: string) => {
      await apiClient.post("users/password/reset", { email });
      return true;
    },
    ...createMutationOptions({
      onError: (error) => {
        handleError(error as Error, ErrorSource.AUTH);
      },
    }),
  });
};

/**
 * Reset password mutation
 */
export const useResetPasswordMutation = () => {
  return useMutation<boolean, ApiError, { token: string; newPassword: string }>(
    {
      mutationFn: async ({ token, newPassword }) => {
        await apiClient.post("users/password/reset/complete", {
          token,
          new_password: newPassword,
        });
        return true;
      },
      ...createMutationOptions({
        onError: (error) => {
          handleError(error as Error, ErrorSource.AUTH);
        },
      }),
    },
  );
};

/**
 * Initialize authentication
 * @returns Query hook for initializing authentication
 */
export const useInitializeAuthQuery = () => {
  const { initialize, setLoading, setError } = useAuthStore();

  return useQuery<boolean, ApiError>({
    queryKey: QUERY_KEYS.auth.initialize,
    queryFn: async () => {
      setLoading(true);

      try {
        const result = await initialize();
        return result;
      } catch (error) {
        setError(error as Error);
        handleError(error as Error, ErrorSource.AUTH);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    ...createQueryOptions("auth", {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 0,
    }),
  });
};
