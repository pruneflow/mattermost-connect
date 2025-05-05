// src/hooks/useUsers.tsx
/**
 * User hooks
 * Provides access to user functionality
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useUserQuery,
  useUsersQuery,
  useUserStatusQuery,
  useUserStatusesQuery,
  useUpdateUserProfileMutation,
  useUpdateUserStatusMutation,
  useSearchUsersQuery,
  useUpdatePasswordMutation,
  useUploadProfileImageMutation,
} from "../core/api/queries/userQueries";
import { useUserStore } from "../core/store/userStore";
import { userService } from "../core/services/userService";
import {
  User,
  UserStatus,
  UserProfileUpdate,
  UserWithStatus,
  GetUsersOptions,
} from "../types";
import { useAuthStore } from "../core/store/authStore";
import { handleError } from "../core/store/errorStore";
import { ErrorSource } from "../types";

/**
 * Hook for user profile functionality
 * @param userId User ID
 * @returns User profile data and operations
 */
export function useUser(userId: string | undefined) {
  // Current user from auth store
  const { currentUser } = useAuthStore();

  // Determine if this is the current user
  const isCurrentUser = useMemo(() => {
    return currentUser?.id === userId;
  }, [currentUser, userId]);

  // Get user query
  const userQuery = useUserQuery(userId);

  // Get user status query
  const statusQuery = useUserStatusQuery(userId);

  // User mutations
  const updateProfileMutation = useUpdateUserProfileMutation();
  const updateStatusMutation = useUpdateUserStatusMutation();
  const updatePasswordMutation = useUpdatePasswordMutation();
  const uploadImageMutation = useUploadProfileImageMutation();

  // Get user from user store
  const { getUserById, getUserStatus } = useUserStore();

  // User from store or query
  const user = useMemo(() => {
    if (!userId) return null;

    if (isCurrentUser && currentUser) {
      return currentUser;
    }

    return getUserById(userId) || userQuery.data || null;
  }, [userId, getUserById, userQuery.data, isCurrentUser, currentUser]);

  // User status from store or query
  const status = useMemo(() => {
    if (!userId) return "offline" as UserStatus;

    // Status from store
    const storeStatus = getUserStatus(userId);

    // If query has more recent data, use it
    if (statusQuery.data && statusQuery.dataUpdatedAt > Date.now() - 60000) {
      return statusQuery.data;
    }

    return storeStatus;
  }, [userId, getUserStatus, statusQuery.data, statusQuery.dataUpdatedAt]);

  // Formatted user name
  const displayName = useMemo(() => {
    if (!user) return "";
    return userService.formatUserName(user);
  }, [user]);

  // User initials
  const initials = useMemo(() => {
    if (!user) return "";
    return userService.getUserInitials(user);
  }, [user]);

  // Profile image URL
  const profileImageUrl = useMemo(() => {
    if (!user) return "";
    return userService.getProfilePictureUrl(user);
  }, [user]);

  /**
   * Updates user profile
   * @param data Profile update data
   */
  const updateProfile = useCallback(
    async (data: UserProfileUpdate): Promise<User | null> => {
      if (!isCurrentUser) return null;

      try {
        return await updateProfileMutation.mutateAsync(data);
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return null;
      }
    },
    [isCurrentUser, updateProfileMutation],
  );

  /**
   * Updates user status
   * @param newStatus New status
   */
  const updateStatus = useCallback(
    async (newStatus: UserStatus): Promise<boolean> => {
      if (!isCurrentUser) return false;

      try {
        await updateStatusMutation.mutateAsync(newStatus);
        return true;
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return false;
      }
    },
    [isCurrentUser, updateStatusMutation],
  );

  /**
   * Updates user password
   * @param currentPassword Current password
   * @param newPassword New password
   */
  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<boolean> => {
      if (!isCurrentUser) return false;

      try {
        await updatePasswordMutation.mutateAsync({
          currentPassword,
          newPassword,
        });
        return true;
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return false;
      }
    },
    [isCurrentUser, updatePasswordMutation],
  );

  /**
   * Uploads profile image
   * @param file Image file
   */
  const uploadProfileImage = useCallback(
    async (file: File): Promise<boolean> => {
      if (!isCurrentUser) return false;

      try {
        await uploadImageMutation.mutateAsync(file);
        return true;
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return false;
      }
    },
    [isCurrentUser, uploadImageMutation],
  );

  return {
    // Data
    user,
    status,
    displayName,
    initials,
    profileImageUrl,
    isCurrentUser,

    // State
    isLoading: userQuery.isLoading || statusQuery.isLoading,
    isFetching: userQuery.isFetching || statusQuery.isFetching,
    error: userQuery.error || statusQuery.error,

    // Actions
    updateProfile,
    updateStatus,
    updatePassword,
    uploadProfileImage,
    refreshUser: userQuery.refetch,
    refreshStatus: statusQuery.refetch,

    // Mutations state
    isUpdatingProfile: updateProfileMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isUpdatingPassword: updatePasswordMutation.isPending,
    isUploadingImage: uploadImageMutation.isPending,
    updateProfileError: updateProfileMutation.error,
    updateStatusError: updateStatusMutation.error,
    updatePasswordError: updatePasswordMutation.error,
    uploadImageError: uploadImageMutation.error,
  };
}

/**
 * Hook for user search and listing
 * @param options User query options
 * @returns User listing functionality
 */
export function useUsers(options: GetUsersOptions = {}) {
  // Get users query
  const usersQuery = useUsersQuery(options);

  // Get user statuses query if needed
  const userIds = useMemo(() => options.userIds || [], [options.userIds]);
  const statusesQuery = options.withStatuses
    ? useUserStatusesQuery(userIds)
    : { data: undefined, isLoading: false, error: null };

  // Get user store
  const {
    getUserById,
    getUserStatus,
    getUserDisplayName,
    getUsersByIds,
    getUsersWithStatus,
  } = useUserStore();

  // Users from store or query
  const users = useMemo(() => {
    if (userIds.length > 0) {
      const storeUsers = getUsersByIds(userIds);

      // If we have all users in store and no special options, use store
      if (
        storeUsers.length === userIds.length &&
        !options.withProfiles &&
        !options.withStatuses
      ) {
        return storeUsers;
      }
    }

    return usersQuery.data || [];
  }, [userIds, getUsersByIds, usersQuery.data, options]);

  // Users with status information
  const usersWithStatus = useMemo(() => {
    return getUsersWithStatus(users.map((user) => user.id));
  }, [users, getUsersWithStatus]);

  /**
   * Gets user by ID
   * @param userId User ID
   */
  const getUserInfo = useCallback(
    (userId: string): User | null => {
      return getUserById(userId);
    },
    [getUserById],
  );

  /**
   * Gets user status
   * @param userId User ID
   */
  const getStatus = useCallback(
    (userId: string): UserStatus => {
      return getUserStatus(userId);
    },
    [getUserStatus],
  );

  /**
   * Gets user display name
   * @param userId User ID
   */
  const getDisplayName = useCallback(
    (userId: string): string => {
      return getUserDisplayName(userId);
    },
    [getUserDisplayName],
  );

  /**
   * Refreshes user data
   */
  const refreshUsers = useCallback(() => {
    return usersQuery.refetch();
  }, [usersQuery]);

  /**
   * Refreshes user statuses
   */
  const refreshStatuses = useCallback(() => {
    if (
      "refetch" in statusesQuery &&
      typeof statusesQuery.refetch === "function"
    ) {
      return statusesQuery.refetch();
    }
    return Promise.resolve();
  }, [statusesQuery]);

  return {
    // Data
    users,
    usersWithStatus,

    // State
    isLoading: usersQuery.isLoading || statusesQuery.isLoading,
    isFetching: usersQuery.isFetching,
    error: usersQuery.error || statusesQuery.error,

    // Actions
    refreshUsers,
    refreshStatuses,

    // Helpers
    getUserInfo,
    getStatus,
    getDisplayName,
  };
}

/**
 * Hook for user search
 * @param searchTerm Search term
 * @param options Search options
 * @returns User search functionality
 */
export function useUserSearch(
  searchTerm: string | undefined,
  options: { inTeam?: string; inChannel?: string; notInChannel?: string } = {},
) {
  // Get search query
  const searchQuery = useSearchUsersQuery(searchTerm, options);

  // Get user store
  const { setUsers } = useUserStore();

  // Update store with search results
  useEffect(() => {
    if (searchQuery.data && searchQuery.data.length > 0) {
      setUsers(searchQuery.data);
    }
  }, [searchQuery.data, setUsers]);

  // Search results sorted by display name
  const sortedResults = useMemo(() => {
    if (!searchQuery.data) return [];

    return userService.sortUsersByDisplayName(searchQuery.data);
  }, [searchQuery.data]);

  /**
   * Filters users by search term locally
   * @param users Users to filter
   * @param term Search term
   */
  const filterUsers = useCallback((users: User[], term: string): User[] => {
    return userService.filterUsersByTerm(users, term);
  }, []);

  return {
    // Data
    results: sortedResults,

    // State
    isLoading: searchQuery.isLoading,
    isFetching: searchQuery.isFetching,
    error: searchQuery.error,

    // Actions
    search: searchQuery.refetch,

    // Helpers
    filterUsers,
  };
}

/**
 * Hook for user profile display
 * @returns User formatting utilities
 */
export function useUserProfile() {
  /**
   * Formats a user's name
   * @param user User object
   * @param preferUsername Whether to prefer username over full name
   */
  const formatUserName = useCallback(
    (
      user: User | null | undefined,
      preferUsername: boolean = false,
    ): string => {
      return userService.formatUserName(user, preferUsername);
    },
    [],
  );

  /**
   * Gets a user's initials
   * @param user User object
   */
  const getUserInitials = useCallback(
    (user: User | null | undefined): string => {
      return userService.getUserInitials(user);
    },
    [],
  );

  /**
   * Gets a user's profile picture URL
   * @param user User object
   * @param size Image size
   */
  const getProfilePictureUrl = useCallback(
    (user: User, size: number = 128): string => {
      return userService.getProfilePictureUrl(user, size);
    },
    [],
  );

  /**
   * Gets a color based on user ID
   * @param userId User ID
   */
  const getUserColor = useCallback((userId: string): string => {
    return userService.getUserColor(userId);
  }, []);

  /**
   * Formats multiple users into a list
   * @param users List of users
   * @param maxUsers Maximum number of users to display
   */
  const formatUserList = useCallback(
    (users: User[], maxUsers: number = 3): string => {
      return userService.formatUserList(users, maxUsers);
    },
    [],
  );

  /**
   * Formats user status for display
   * @param status User status
   */
  const formatUserStatus = useCallback((status: UserStatus): string => {
    return userService.formatUserStatus(status);
  }, []);

  /**
   * Gets CSS class for user status
   * @param status User status
   */
  const getUserStatusClass = useCallback((status: UserStatus): string => {
    return userService.getUserStatusClass(status);
  }, []);

  /**
   * Gets icon for user status
   * @param status User status
   */
  const getUserStatusIcon = useCallback((status: UserStatus): string => {
    return userService.getUserStatusIcon(status);
  }, []);

  return {
    // Formatting helpers
    formatUserName,
    getUserInitials,
    getProfilePictureUrl,
    getUserColor,
    formatUserList,
    formatUserStatus,
    getUserStatusClass,
    getUserStatusIcon,
  };
}
