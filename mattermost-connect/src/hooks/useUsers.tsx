// src/hooks/useUsers.tsx
/**
 * Hook for user functionality
 */
import { useCallback } from "react";
import {
  useUserStore,
  UserStatus,
  getUserStatus,
  formatUserName,
} from "../core/store/userStore";
import { User } from "../core/services/authService";
import {
  useUserQuery,
  useUsersQuery,
  useUserStatusQuery,
  useUserStatusesQuery,
  useUpdateUserProfileMutation,
  useUpdateUserStatusMutation,
  useUpdatePasswordMutation,
  useUploadProfileImageMutation,
  useSearchUsersQuery,
} from "../core/api/queries/userQueries";

/**
 * Hook that provides user information
 * @param userId User ID
 * @returns User state and actions
 */
export function useUser(userId: string | undefined) {
  // Get state from store
  const { getUserById, getUserDisplayName, setUserStatus } = useUserStore();

  // Get user query
  const userQuery = useUserQuery(userId);
  const userStatusQuery = useUserStatusQuery(userId);

  /**
   * Gets the user's online status
   * @returns User's online status
   */
  const getStatus = useCallback(() => {
    if (!userId) return "offline" as UserStatus;
    return getUserStatus(userId);
  }, [userId]);

  /**
   * Gets the user's display name
   * @returns User's display name
   */
  const getDisplayName = useCallback(() => {
    if (!userId) return "Unknown User";
    return getUserDisplayName(userId);
  }, [userId]);

  /**
   * Refreshes the user data
   * @returns Promise resolving to the refreshed user
   */
  const refreshUser = useCallback(async () => {
    return userQuery.refetch().then((result) => result.data || null);
  }, [userQuery]);

  /**
   * Refreshes the user's status
   * @returns Promise resolving to the refreshed status
   */
  const refreshStatus = useCallback(async () => {
    return userStatusQuery.refetch().then((result) => result.data || null);
  }, [userStatusQuery]);

  return {
    // State
    user: userQuery.data,
    status: getStatus(),
    displayName: getDisplayName(),
    isLoading: userQuery.isLoading || userQuery.isFetching,
    isStatusLoading: userStatusQuery.isLoading || userStatusQuery.isFetching,
    error: userQuery.error,
    statusError: userStatusQuery.error,

    // Actions
    refreshUser,
    refreshStatus,
    getDisplayName,
  };
}

/**
 * Hook that provides multiple users information
 * @param options Options for fetching users
 * @returns Users state and actions
 */
export function useUsers(
  options: {
    userIds?: string[];
    inChannel?: string;
    inTeam?: string;
  } = {},
) {
  // Get users query
  const usersQuery = useUsersQuery(options);
  const userStatusesQuery = useUserStatusesQuery(options.userIds);

  /**
   * Refreshes the users data
   * @returns Promise resolving to the refreshed users
   */
  const refreshUsers = useCallback(async () => {
    return usersQuery.refetch().then((result) => result.data || []);
  }, [usersQuery]);

  /**
   * Refreshes the users' statuses
   * @returns Promise resolving to the refreshed statuses
   */
  const refreshStatuses = useCallback(async () => {
    return userStatusesQuery.refetch().then((result) => result.data || []);
  }, [userStatusesQuery]);

  /**
   * Gets a formatted user name
   * @param user User object
   * @returns Formatted user name
   */
  const formatName = useCallback((user: User | null | undefined) => {
    return formatUserName(user);
  }, []);

  return {
    // State
    users: usersQuery.data || [],
    statuses: userStatusesQuery.data || [],
    isLoading: usersQuery.isLoading || usersQuery.isFetching,
    isStatusesLoading:
      userStatusesQuery.isLoading || userStatusesQuery.isFetching,
    error: usersQuery.error,
    statusesError: userStatusesQuery.error,

    // Actions
    refreshUsers,
    refreshStatuses,
    formatName,
  };
}

/**
 * Hook that provides user search functionality
 * @param term Search term
 * @param options Search options
 * @returns Search results state and actions
 */
export function useUserSearch(
  term: string | undefined,
  options: { inTeam?: string; inChannel?: string; notInChannel?: string } = {},
) {
  // Get search query
  const searchQuery = useSearchUsersQuery(term, options);

  /**
   * Refreshes the search results
   * @returns Promise resolving to the refreshed results
   */
  const refreshResults = useCallback(async () => {
    return searchQuery.refetch().then((result) => result.data || []);
  }, [searchQuery]);

  return {
    // State
    results: searchQuery.data || [],
    isLoading: searchQuery.isLoading || searchQuery.isFetching,
    error: searchQuery.error,

    // Actions
    refreshResults,
  };
}

/**
 * Hook that provides current user profile functionality
 * @returns Current user profile state and actions
 */
export function useUserProfile() {
  // Get mutations
  const updateProfileMutation = useUpdateUserProfileMutation();
  const updateStatusMutation = useUpdateUserStatusMutation();
  const updatePasswordMutation = useUpdatePasswordMutation();
  const uploadProfileImageMutation = useUploadProfileImageMutation();

  /**
   * Updates the user's profile
   * @param profileData Profile data to update
   * @returns Promise resolving to the updated user
   */
  const updateProfile = useCallback(
    async (
      profileData: Partial<{
        email: string;
        username: string;
        first_name: string;
        last_name: string;
        nickname: string;
        position: string;
      }>,
    ) => {
      return updateProfileMutation.mutateAsync(profileData);
    },
    [updateProfileMutation],
  );

  /**
   * Updates the user's status
   * @param status New status
   * @returns Promise resolving to the updated status
   */
  const updateStatus = useCallback(
    async (status: UserStatus) => {
      return updateStatusMutation.mutateAsync(status);
    },
    [updateStatusMutation],
  );

  /**
   * Updates the user's password
   * @param currentPassword Current password
   * @param newPassword New password
   * @returns Promise resolving to success indicator
   */
  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      return updatePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
    },
    [updatePasswordMutation],
  );

  /**
   * Uploads a profile image
   * @param imageFile Image file to upload
   * @returns Promise resolving to the user ID
   */
  const uploadProfileImage = useCallback(
    async (imageFile: File) => {
      return uploadProfileImageMutation.mutateAsync(imageFile);
    },
    [uploadProfileImageMutation],
  );

  return {
    // State
    isUpdatingProfile: updateProfileMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isUpdatingPassword: updatePasswordMutation.isPending,
    isUploadingImage: uploadProfileImageMutation.isPending,
    profileError: updateProfileMutation.error,
    statusError: updateStatusMutation.error,
    passwordError: updatePasswordMutation.error,
    imageError: uploadProfileImageMutation.error,

    // Actions
    updateProfile,
    updateStatus,
    updatePassword,
    uploadProfileImage,
  };
}
