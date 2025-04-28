// src/hooks/useUsers.tsx
/**
 * Hook for user functionality
 * Provides optimized React hooks for working with users
 */
import { useCallback, useMemo, useEffect } from "react";
import { User, UserStatus, UserProfileUpdate } from "../types";
import { useUserStore } from "../core/store";
import { userService } from "../core/services/userService";
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
import { useEntityQuery } from "./useEntityQuery";

/**
 * Hook that provides information about a specific user
 * @param userId User ID
 * @returns User state and actions
 */
export function useUser(userId: string | undefined) {
  // Get state from store
  const { getUserById, getUserStatus, getUserDisplayName, setUserStatus } =
    useUserStore();

  // Get queries
  const userQuery = useUserQuery(userId);
  const userStatusQuery = useUserStatusQuery(userId);

  /**
   * Gets the user's current status
   * @returns User status
   */
  const getStatus = useCallback((): UserStatus => {
    if (!userId) return "offline";
    return getUserStatus(userId);
  }, [userId, getUserStatus]);

  /**
   * Gets the user's display name
   * @returns Formatted user name
   */
  const getDisplayName = useCallback((): string => {
    if (!userId) return "Unknown User";
    return getUserDisplayName(userId);
  }, [userId, getUserDisplayName]);

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

  // Get avatar URL using service
  const avatarUrl = useMemo(() => {
    const user = getUserById(userId || "");
    return user ? userService.getProfilePictureUrl(user) : "";
  }, [userId, getUserById]);

  // Memoize user object to avoid unnecessary re-renders
  const user = useMemo(() => {
    return userId ? getUserById(userId) : null;
  }, [userId, getUserById, userQuery.data]);

  // Get color for avatar background (used for users without images)
  const userColor = useMemo(() => {
    return userId ? userService.getUserColor(userId) : "#cccccc";
  }, [userId]);

  return {
    // State
    user,
    status: getStatus(),
    displayName: getDisplayName(),
    avatarUrl,
    userColor,
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
 * Hook that provides information about multiple users
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

  // Get formatting helpers from service
  const formatName = useCallback((user: User | null | undefined) => {
    return userService.formatUserName(user);
  }, []);

  /**
   * Gets avatars for a list of users
   * @param users List of users
   * @returns Map of user IDs to avatar URLs
   */
  const getAvatarUrls = useCallback((users: User[]) => {
    const avatarMap: Record<string, string> = {};

    users.forEach((user) => {
      avatarMap[user.id] = userService.getProfilePictureUrl(user);
    });

    return avatarMap;
  }, []);

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

  // Sort users by display name
  const sortedUsers = useMemo(() => {
    if (!usersQuery.data) return [];
    return userService.sortUsersByDisplayName(usersQuery.data);
  }, [usersQuery.data]);

  // Combine users with their statuses
  const usersWithStatus = useMemo(() => {
    if (!usersQuery.data) return [];

    const { statusByUserId } = useUserStore.getState();

    return usersQuery.data.map((user) => ({
      user,
      status: statusByUserId[user.id] || "offline",
      displayName: userService.formatUserName(user),
    }));
  }, [usersQuery.data]);

  return {
    // State
    users: usersQuery.data || [],
    sortedUsers,
    usersWithStatus,
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
    getAvatarUrls,
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

  // Filter results by search term using service function
  const filteredResults = useMemo(() => {
    if (!searchQuery.data || !term) return searchQuery.data || [];
    return userService.filterUsersByTerm(searchQuery.data, term);
  }, [searchQuery.data, term]);

  return {
    // State
    results: filteredResults,
    isLoading: searchQuery.isLoading || searchQuery.isFetching,
    error: searchQuery.error,

    // Actions
    refreshResults,
  };
}

/**
 * Hook that provides profile management functionality for the current user
 * @returns User profile state and actions
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
    async (profileData: UserProfileUpdate) => {
      // Use service to create a sanitized update object
      const sanitizedData = userService.createProfileUpdate(profileData);
      return updateProfileMutation.mutateAsync(sanitizedData);
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

/**
 * Hook that monitors typing users in a channel
 * @param channelId Channel ID
 * @returns Typing users information
 */
export function useTypingUsers(channelId: string | undefined) {
  // Get state from store
  const { getTypingUsers, byId } = useUserStore();

  // Get typing user IDs
  const typingUserIds = useMemo(() => {
    if (!channelId) return [];
    return getTypingUsers(channelId);
  }, [channelId, getTypingUsers]);

  // Get typing user objects
  const typingUsers = useMemo(() => {
    return typingUserIds
      .map((userId) => byId[userId])
      .filter((user): user is User => !!user);
  }, [typingUserIds, byId]);

  // Generate typing message
  const typingMessage = useMemo(() => {
    return userService.formatTypingMessage(typingUsers);
  }, [typingUsers]);

  return {
    // State
    typingUserIds,
    typingUsers,
    typingMessage,
    isTyping: typingUsers.length > 0,

    // Helper for components
    getFormattedMessage: () => typingMessage,
  };
}

/**
 * Generic hook for user entity operations using the EntityQuery hook
 */
export function useUserEntities(
  options: {
    userIds?: string[];
    inChannel?: string;
    inTeam?: string;
    enabled?: boolean;
  } = {},
) {
  // Use the generic entity query hook with user-specific config
  return useEntityQuery<User>({
    entityType: "user",
    endpoint: "users",
    idField: "id",
    initialParams: options,
    enabled: options.enabled !== false,
    select: (data) => userService.sortUsersByDisplayName(data),
  });
}
