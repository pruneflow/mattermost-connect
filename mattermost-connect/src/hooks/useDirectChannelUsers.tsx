// src/hooks/useDirectChannelUsers.tsx
/**
 * Direct channel users hook
 * Provides access to users in direct and group messages
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useChannelStore } from "../core/store/channelStore";
import { useDirectChannelStore } from "../core/store/directChannelStore";
import { useUserStore } from "../core/store/userStore";
import { useUsersQuery } from "../core/api/queries/userQueries";
import { channelService } from "../core/services/channelService";
import { userService } from "../core/services/userService";
import { Channel, User, UserWithStatus } from "../types";
import { useAuthStore } from "../core/store/authStore";
import { handleError } from "../core/store/errorStore";
import { ErrorSource } from "../types";

/**
 * Hook for users in a direct or group channel
 * @param channelId Channel ID
 * @returns Users in the channel
 */
export function useDirectChannelUsers(channelId: string | undefined) {
  const { currentUser } = useAuthStore();

  // State for tracking data initialization
  const [isInitialized, setIsInitialized] = useState(false);

  // Get stores
  const { getChannelById } = useChannelStore();
  const {
    getDirectChannelInfo,
    refreshDirectChannelInfo,
    setDirectChannelInfo,
    isDirectChannelLoading,
  } = useDirectChannelStore();
  const {
    getUserById,
    getUserStatus,
    getUserDisplayName,
    getUsersByIds,
    setUsers,
  } = useUserStore();

  // Get channel
  const channel = useMemo(() => {
    if (!channelId) return null;
    return getChannelById(channelId);
  }, [channelId, getChannelById]);

  // Get direct channel info
  const directInfo = useMemo(() => {
    if (!channelId) return null;
    return getDirectChannelInfo(channelId);
  }, [channelId, getDirectChannelInfo]);

  // Determine if this is a direct or group channel
  const isDirect = useMemo(() => {
    return channel ? channelService.isDirectChannel(channel) : false;
  }, [channel]);

  const isGroup = useMemo(() => {
    return channel ? channelService.isGroupChannel(channel) : false;
  }, [channel]);

  // Extract user IDs from channel
  const userIds = useMemo(() => {
    if (!channel) return [];

    try {
      // Pour les canaux directs, extrayons directement du nom
      if (isDirect) {
        return channelService.getUserIdsFromDirectChannel(channel.name);
      }

      // Pour les canaux de groupe, même logique
      if (isGroup) {
        return channelService.getUserIdsFromGroupChannel(channel);
      }

      // Utiliser directInfo si disponible
      if (directInfo && directInfo.userIds && directInfo.userIds.length > 0) {
        return directInfo.userIds;
      }

      return [];
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "useDirectChannelUsers.userIds",
        channelId: channel.id,
      });
      return [];
    }
  }, [channel, directInfo, isDirect, isGroup]);

  // Filter out current user
  const otherUserIds = useMemo(() => {
    if (!currentUser) return userIds;
    return userIds.filter((id) => id !== currentUser.id);
  }, [userIds, currentUser]);

  // Fetch users with query
  const usersQuery = useUsersQuery({
    userIds: otherUserIds,
    withStatuses: true,
  });

  // Pre-load existing users from store
  const preloadedUsers = useMemo(() => {
    return getUsersByIds(otherUserIds);
  }, [getUsersByIds, otherUserIds]);

  // Check if we need to fetch missing users
  const needsFetch = useMemo(() => {
    return preloadedUsers.length < otherUserIds.length;
  }, [preloadedUsers, otherUserIds]);

  // Pre-load users on mount and when otherUserIds change
  useEffect(() => {
    if (otherUserIds.length > 0 && (needsFetch || !isInitialized)) {
      // Force fetch users
      usersQuery.refetch().then(() => {
        setIsInitialized(true);
      });
    }
  }, [otherUserIds, needsFetch, usersQuery, isInitialized]);

  // Initialize or refresh direct channel info when needed
  useEffect(() => {
    if (
      channel &&
      currentUser &&
      (isDirect || isGroup) &&
      (!directInfo || directInfo.status === "loading")
    ) {
      refreshDirectChannelInfo(channelId!, currentUser.id);
    }
  }, [
    channel,
    currentUser,
    isDirect,
    isGroup,
    directInfo,
    channelId,
    refreshDirectChannelInfo,
  ]);

  // Other user in direct channel
  const otherUser = useMemo(() => {
    if (!isDirect || otherUserIds.length === 0) return null;

    const userId = otherUserIds[0];
    return getUserById(userId);
  }, [isDirect, otherUserIds, getUserById]);

  // All other users in group channel
  const groupUsers = useMemo(() => {
    if (!isGroup) return [];

    return otherUserIds
      .map((id) => getUserById(id))
      .filter((user): user is User => !!user);
  }, [isGroup, otherUserIds, getUserById]);

  // Users with status information
  const usersWithStatus = useMemo(() => {
    return otherUserIds
      .map((userId) => {
        const user = getUserById(userId);
        if (!user) return null;

        const status = getUserStatus(userId);
        const displayName = getUserDisplayName(userId);

        return {
          user,
          status,
          displayName,
        } as UserWithStatus;
      })
      .filter((userStatus): userStatus is UserWithStatus => !!userStatus);
  }, [otherUserIds, getUserById, getUserStatus, getUserDisplayName]);

  // Loading status
  const isLoading = useMemo(() => {
    // Consider loading if we're fetching users or if the direct channel info is loading
    return (
      usersQuery.isLoading ||
      (channelId ? isDirectChannelLoading(channelId) : false) ||
      (needsFetch && !isInitialized)
    );
  }, [
    usersQuery.isLoading,
    channelId,
    isDirectChannelLoading,
    needsFetch,
    isInitialized,
  ]);

  /**
   * Refreshes user information
   */
  const refreshUsers = useCallback(() => {
    return usersQuery.refetch();
  }, [usersQuery]);

  /**
   * Refreshes direct channel info
   */
  const refreshInfo = useCallback(() => {
    if (channelId && currentUser) {
      refreshDirectChannelInfo(channelId, currentUser.id);
    }
  }, [channelId, currentUser, refreshDirectChannelInfo]);

  /**
   * Formats a user's display name
   * @param userId User ID
   */
  const formatDisplayName = useCallback(
    (userId: string): string => {
      const user = getUserById(userId);
      if (!user) return "Unknown User";

      return userService.formatUserName(user);
    },
    [getUserById],
  );

  // Add users to store when query completes
  useEffect(() => {
    if (usersQuery.data && usersQuery.data.length > 0) {
      setUsers(usersQuery.data);
    }
  }, [usersQuery.data, setUsers]);

  return {
    // Data
    userIds,
    otherUserIds,
    isDirect,
    isGroup,
    otherUser,
    groupUsers,
    usersWithStatus,

    // State
    isLoading,
    isInitialized,
    error: usersQuery.error,

    // Actions
    refreshUsers,
    refreshInfo,

    // Helpers
    formatDisplayName,
  };
}
