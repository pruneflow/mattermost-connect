// src/core/api/queries/userQueries.ts
/**
 * React Query hooks for user operations
 * Optimized and standardized queries using shared patterns
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS } from "../queryClient";
import {
  User,
  UserStatus,
  UserStatusInfo,
  UserProfileUpdate,
  ApiError,
} from "../../../types";
import { useAuthStore, useUserStore } from "../../store";
import { createQueryOptions, createMutationOptions } from "../queryUtils";

/**
 * Options for fetching users
 */
export interface GetUsersOptions {
  /** List of user IDs to fetch */
  userIds?: string[];
  /** Channel ID to get members from */
  inChannel?: string;
  /** Team ID to get members from */
  inTeam?: string;
  /** Whether to include detailed profiles */
  withProfiles?: boolean;
  /** Whether to include statuses */
  withStatuses?: boolean;
}

/**
 * Fetches a user by ID
 * @param userId User ID
 * @returns Query hook for a user
 */
export const useUserQuery = (userId: string | undefined) => {
  const { setUser, setLoading, setError, getUserById } = useUserStore();

  return useQuery<User, ApiError>({
    queryKey: userId
      ? QUERY_KEYS.users.byId(userId)
      : ["users", "byId", "undefined"],
    queryFn: async () => {
      if (!userId) {
        throw new Error("User ID is required");
      }

      // Check if user is already in store
      const cachedUser = getUserById(userId);
      if (cachedUser) {
        return cachedUser;
      }

      setLoading(true); // Set global loading state
      setLoadingId(userId, true); // Set loading for this specific user

      try {
        const response = await apiClient.get<User>(`users/${userId}`);
        const user = response.data;

        // Update store
        setUser(user);

        return user;
      } catch (error) {
        setError(error as Error);
        throw error;
      } finally {
        setLoading(false);
        setLoadingId(userId, false);
      }
    },
    // Don't run query if userId is not provided
    enabled: !!userId,
    ...createQueryOptions("user", {
      // Cache for 5 minutes
      staleTime: 5 * 60 * 1000,
    }),
  });
};

/**
 * Fetches multiple users based on options
 * @param options Options for fetching users
 * @returns Query hook for users
 */
export const useUsersQuery = (options: GetUsersOptions = {}) => {
  const { setUsers, setLoading, setError } = useUserStore();

  // Create a stable query key based on options
  const queryKey = (() => {
    if (options.userIds?.length) {
      return QUERY_KEYS.users.byIds(options.userIds);
    }
    if (options.inChannel) {
      return QUERY_KEYS.users.inChannel(options.inChannel);
    }
    if (options.inTeam) {
      return QUERY_KEYS.users.inTeam(options.inTeam);
    }
    return QUERY_KEYS.users.all;
  })();

  return useQuery<User[], ApiError>({
    queryKey,
    queryFn: async () => {
      // If no specific options are provided, return empty array
      if (!options.userIds?.length && !options.inChannel && !options.inTeam) {
        return [];
      }

      setLoading(true);

      try {
        let users: User[] = [];

        // Handle fetching users by IDs - use POST to /users/ids
        if (options.userIds?.length) {
          console.debug("Fetching users by IDs:", options.userIds);

          // Use POST request to fetch users by IDs
          const response = await apiClient.post<User[]>(
            "users/ids",
            options.userIds,
          );
          users = response.data;
        }
        // Handle fetching users by channel
        else if (options.inChannel) {
          // Build URL with pagination and additional parameters
          let url = `users?in_channel=${encodeURIComponent(options.inChannel)}`;

          if (options.withProfiles) {
            url += "&with_profiles=true";
          }

          const response = await apiClient.get<User[]>(url);
          users = response.data;
        }
        // Handle fetching users by team
        else if (options.inTeam) {
          // Build URL with pagination and additional parameters
          let url = `users?in_team=${encodeURIComponent(options.inTeam)}`;

          if (options.withProfiles) {
            url += "&with_profiles=true";
          }

          const response = await apiClient.get<User[]>(url);
          users = response.data;
        }

        // Update store with received users
        if (users.length > 0) {
          setUsers(users);
        }

        return users;
      } catch (error) {
        setError(error as Error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    ...createQueryOptions("user", {
      // Cache for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Only enable the query if we have parameters to search with
      enabled: !!(
        options.userIds?.length ||
        options.inChannel ||
        options.inTeam
      ),
    }),
  });
};

/**
 * Fetches a user's status
 * @param userId User ID
 * @returns Query hook for user status
 */
export const useUserStatusQuery = (userId: string | undefined) => {
  const { setUserStatus } = useUserStore();

  return useQuery<UserStatus, ApiError>({
    queryKey: userId
      ? QUERY_KEYS.users.status(userId)
      : ["users", "status", "undefined"],
    queryFn: async () => {
      if (!userId) {
        throw new Error("User ID is required");
      }

      const response = await apiClient.get<{ status: UserStatus }>(
        `users/${userId}/status`,
      );
      const status = response.data.status;

      // Update store
      setUserStatus(userId, status);

      return status;
    },
    // Don't run query if userId is not provided
    enabled: !!userId,
    ...createQueryOptions("user", {
      // Cache for a shorter time since statuses change frequently
      staleTime: 60 * 1000, // 1 minute
    }),
  });
};

/**
 * Fetches statuses for multiple users
 * @param userIds User IDs
 * @returns Query hook for user statuses
 */
export const useUserStatusesQuery = (userIds: string[] = []) => {
  const { setUserStatuses } = useUserStore();

  return useQuery<UserStatusInfo[], ApiError>({
    queryKey: [...QUERY_KEYS.users.statuses, userIds],
    queryFn: async () => {
      if (!userIds.length) {
        return [];
      }

      const response = await apiClient.post<UserStatusInfo[]>(
        "users/status/ids",
        userIds,
      );
      const statuses = response.data;

      // Update store with statuses
      setUserStatuses(statuses);

      return statuses;
    },
    // Don't run query if no userIds are provided
    enabled: userIds.length > 0,
    ...createQueryOptions("user", {
      // Cache for a shorter time since statuses change frequently
      staleTime: 60 * 1000, // 1 minute
    }),
  });
};

/**
 * Updates the current user's profile
 */
export const useUpdateUserProfileMutation = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuthStore();

  return useMutation<User, ApiError, UserProfileUpdate>({
    mutationFn: async (userData) => {
      if (!currentUser) {
        throw new Error("User must be authenticated");
      }

      const response = await apiClient.put<User>("users/me/patch", userData);
      return response.data;
    },
    onSuccess: (updatedUser) => {
      // Invalidate user query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.users.byId(updatedUser.id),
      });

      // Update user store
      const { setUser } = useUserStore.getState();
      setUser(updatedUser);

      // Also update auth store if this is the current user
      const { setCurrentUser } = useAuthStore.getState();
      setCurrentUser(updatedUser);
    },
    ...createMutationOptions(),
  });
};

/**
 * Updates the current user's status
 */
export const useUpdateUserStatusMutation = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuthStore();

  return useMutation<
    { userId: string; status: UserStatus },
    ApiError,
    UserStatus
  >({
    mutationFn: async (status) => {
      // Get current user ID
      if (!currentUser) {
        throw new Error("User must be authenticated");
      }

      // Update status via API
      await apiClient.put(`users/${currentUser.id}/status`, { status });

      return { userId: currentUser.id, status };
    },
    onSuccess: ({ userId, status }) => {
      // Invalidate status query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.users.status(userId),
      });

      // Update user store
      const { setUserStatus } = useUserStore.getState();
      setUserStatus(userId, status);
    },
    ...createMutationOptions(),
  });
};

/**
 * Updates the current user's password
 */
export const useUpdatePasswordMutation = () => {
  return useMutation<
    boolean,
    ApiError,
    { currentPassword: string; newPassword: string }
  >({
    mutationFn: async ({ currentPassword, newPassword }) => {
      await apiClient.put("users/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return true;
    },
    ...createMutationOptions(),
  });
};

/**
 * Uploads a user profile image
 */
export const useUploadProfileImageMutation = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuthStore();

  return useMutation<string, ApiError, File>({
    mutationFn: async (imageFile) => {
      // Get current user ID
      if (!currentUser) {
        throw new Error("User must be authenticated");
      }

      // Create form data for file upload
      const formData = new FormData();
      formData.append("image", imageFile);

      // Upload image
      await apiClient.post(`users/${currentUser.id}/image`, formData);

      return currentUser.id;
    },
    onSuccess: (userId) => {
      // Invalidate user query to get updated profile with new image
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.users.byId(userId),
      });

      // Also invalidate current user query in auth store
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.auth.current,
      });
    },
    ...createMutationOptions(),
  });
};

/**
 * Searches for users by term
 * @param term Search term
 * @param options Options for the search
 * @returns Query hook for user search results
 */
export const useSearchUsersQuery = (
  term: string | undefined,
  options: { inTeam?: string; inChannel?: string; notInChannel?: string } = {},
) => {
  const { setUsers, setLoading, setError } = useUserStore();

  return useQuery<User[], ApiError>({
    queryKey: ["users", "search", term, options],
    queryFn: async () => {
      if (!term) {
        return [];
      }

      setLoading(true);

      try {
        // Build query parameters
        const searchBody: Record<string, any> = { term };

        if (options.inTeam) {
          searchBody.team_id = options.inTeam;
        }

        if (options.inChannel) {
          searchBody.channel_id = options.inChannel;
        }

        if (options.notInChannel) {
          searchBody.not_in_channel_id = options.notInChannel;
        }

        // Search users
        const response = await apiClient.post<User[]>(
          "users/search",
          searchBody,
        );
        const users = response.data;

        // Update store
        setUsers(users);

        return users;
      } catch (error) {
        setError(error as Error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    // Don't run query if no term is provided
    enabled: !!term,
    ...createQueryOptions("user", {
      // Cache for a short time
      staleTime: 60 * 1000, // 1 minute
    }),
  });
};

// Helper function to access setLoadingId from userStore
const setLoadingId = (userId: string, isLoading: boolean) => {
  useUserStore.getState().setLoadingId(userId, isLoading);
};
