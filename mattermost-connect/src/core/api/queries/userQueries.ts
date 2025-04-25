// src/core/api/queries/userQueries.ts
/**
 * React Query hooks for user operations
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS, invalidateQueries } from "../queryClient";
import { User } from "../../services/authService";
import {
  UserStatus,
  UserStatusInfo,
  useUserStore,
} from "../../store/userStore";

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
}

/**
 * Fetches a user by ID
 * @param userId User ID
 * @returns Query hook for a user
 */
export const useUserQuery = (userId: string | undefined) => {
  const { setUser, setLoading, setError, getUserById } = useUserStore();

  return useQuery({
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

      setLoading(userId, true);
      try {
        const response = await apiClient.get<User>(`users/${userId}`);
        const user = response.data;

        // Update store
        setUser(user);

        return user;
      } catch (error) {
        setError(userId, error as Error);
        throw error;
      }
    },
    // Don't run query if userId is not provided
    enabled: !!userId,
    // Cache data for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Fetches multiple users based on options
 * @param options Options for fetching users
 * @returns Query hook for users
 */
export const useUsersQuery = (options: GetUsersOptions = {}) => {
  const { setUsers, addPendingUser } = useUserStore();

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

  return useQuery({
    queryKey,
    queryFn: async () => {
      // If no specific options are provided, return empty array
      if (!options.userIds?.length && !options.inChannel && !options.inTeam) {
        return [];
      }

      try {
        let users: User[] = [];

        // Handle fetching users by IDs - use POST to /users/ids
        if (options.userIds?.length) {
          // Mark users as pending
          options.userIds.forEach((id) => addPendingUser(id));

          console.log("Fetching users by IDs:", options.userIds);

          // Use POST request to fetch users by IDs
          const response = await apiClient.post<User[]>(
            "users/ids",
            options.userIds,
          );
          users = response.data;

          console.log(
            "Received users:",
            users.map((u) => u.id),
          );
        }
        // Handle fetching users by channel
        else if (options.inChannel) {
          const response = await apiClient.get<User[]>(
            `users?in_channel=${encodeURIComponent(options.inChannel)}`,
          );
          users = response.data;
        }
        // Handle fetching users by team
        else if (options.inTeam) {
          const response = await apiClient.get<User[]>(
            `users?in_team=${encodeURIComponent(options.inTeam)}`,
          );
          users = response.data;
        }

        // Update store with received users
        if (users.length > 0) {
          setUsers(users);
        }

        return users;
      } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
      }
    },
    // Cache data for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Only enable the query if we have parameters to search with
    enabled: !!(options.userIds?.length || options.inChannel || options.inTeam),
  });
};

/**
 * Fetches a user's status
 * @param userId User ID
 * @returns Query hook for user status
 */
export const useUserStatusQuery = (userId: string | undefined) => {
  const { setUserStatus } = useUserStore();

  return useQuery({
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
    // Cache data for a short time (statuses change frequently)
    staleTime: 60 * 1000, // 1 minute
  });
};

/**
 * Fetches statuses for multiple users
 * @param userIds User IDs
 * @returns Query hook for user statuses
 */
export const useUserStatusesQuery = (userIds: string[] = []) => {
  const { setUserStatuses } = useUserStore();

  return useQuery({
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

      // Update store
      setUserStatuses(statuses);

      return statuses;
    },
    // Don't run query if no userIds are provided
    enabled: userIds.length > 0,
    // Cache data for a short time (statuses change frequently)
    staleTime: 60 * 1000, // 1 minute
  });
};

/**
 * Updates the current user's profile
 */
export const useUpdateUserProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      userData: Partial<{
        email: string;
        username: string;
        first_name: string;
        last_name: string;
        nickname: string;
        position: string;
      }>,
    ) => {
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
  });
};

/**
 * Updates the current user's status
 */
export const useUpdateUserStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: UserStatus) => {
      // Get current user ID
      const currentUser = useAuthStore.getState().currentUser;
      if (!currentUser) {
        throw new Error("No current user found");
      }

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
  });
};

/**
 * Updates the current user's password
 */
export const useUpdatePasswordMutation = () => {
  return useMutation({
    mutationFn: async ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => {
      await apiClient.put("users/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return true;
    },
  });
};

/**
 * Uploads a user profile image
 */
export const useUploadProfileImageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageFile: File) => {
      // Get current user ID
      const currentUser = useAuthStore.getState().currentUser;
      if (!currentUser) {
        throw new Error("No current user found");
      }

      const formData = new FormData();
      formData.append("image", imageFile);

      await apiClient.post(`users/${currentUser.id}/image`, formData);
      return currentUser.id;
    },
    onSuccess: (userId) => {
      // Invalidate user query to get updated profile with new image
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.users.byId(userId),
      });

      // Also invalidate current user query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.auth.current,
      });
    },
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
  const { setUsers } = useUserStore();

  return useQuery({
    queryKey: ["users", "search", term, options],
    queryFn: async () => {
      if (!term) {
        return [];
      }

      // Build query parameters
      let endpoint = "users/search";
      const body: any = { term };

      if (options.inTeam) {
        body.team_id = options.inTeam;
      }

      if (options.inChannel) {
        body.channel_id = options.inChannel;
      }

      if (options.notInChannel) {
        body.not_in_channel_id = options.notInChannel;
      }

      // Search users
      const response = await apiClient.post<User[]>(endpoint, body);
      const users = response.data;

      // Update store
      setUsers(users);

      return users;
    },
    // Don't run query if no term is provided
    enabled: !!term,
    // Cache data for a short time
    staleTime: 60 * 1000, // 1 minute
  });
};

// Import at the end to avoid circular dependencies
import { useAuthStore } from "../../store/authStore";
