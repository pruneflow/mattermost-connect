// src/core/api/queries/authQueries.ts
/**
 * React Query hooks for authentication operations
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS } from "../queryClient";
import { User, authService } from "../../services/authService";
import { useAuthStore } from "../../store/authStore";

/**
 * Fetches the current authenticated user
 * @returns Query hook for current user
 */
export const useCurrentUserQuery = () => {
  const { setCurrentUser } = useAuthStore();

  return useQuery({
    queryKey: QUERY_KEYS.auth.current,
    queryFn: async () => {
      const response = await apiClient.get<User>("users/me");
      const user = response.data;

      // Update auth store
      setCurrentUser(user);

      return user;
    },
    // Cache data for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Only fetch if authenticated
    enabled: useAuthStore.getState().isAuthenticated,
  });
};

/**
 * Login mutation
 */
export const useLoginMutation = () => {
  const { login } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      username,
      password,
      serverUrl,
    }: {
      username: string;
      password: string;
      serverUrl?: string;
    }) => {
      return login(username, password, serverUrl);
    },
  });
};

/**
 * Logout mutation
 */
export const useLogoutMutation = () => {
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      logout();
      return true;
    },
  });
};

/**
 * Forgot password mutation
 */
export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      await apiClient.post("users/password/reset", { email });
      return true;
    },
  });
};

/**
 * Reset password mutation
 */
export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: async ({
      token,
      newPassword,
    }: {
      token: string;
      newPassword: string;
    }) => {
      await apiClient.post("users/password/reset/complete", {
        token,
        new_password: newPassword,
      });
      return true;
    },
  });
};

/**
 * Initialize authentication
 * @returns Query hook for initializing authentication
 */
export const useInitializeAuthQuery = () => {
  const { initialize } = useAuthStore();

  return useQuery({
    queryKey: ["auth", "initialize"],
    queryFn: async () => {
      return initialize();
    },
    // Don't automatically refetch
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    // Don't cache the result
    staleTime: 0,
  });
};
