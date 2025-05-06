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
import { channelLoadingService } from "../core/services/channelLoadingService";
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
  const [isForceLoading, setIsForceLoading] = useState(false);

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

  // Extract user IDs from channel with error handling
  const userIds = useMemo(() => {
    if (!channel) return [];

    try {
      // Check if we already have userIds in directInfo
      if (directInfo && directInfo.userIds && directInfo.userIds.length > 0) {
        return directInfo.userIds;
      }

      if (isDirect) {
        return channelService.getUserIdsFromDirectChannel(channel.name);
      }

      if (isGroup) {
        return channelService.getUserIdsFromGroupChannel(channel);
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

  // Fetch users with query but don't automatically trigger
  const usersQuery = useUsersQuery({
    userIds: otherUserIds,
    withStatuses: true,
    enabled: false, // Don't run automatically
  });

  // Pre-load existing users from store
  const preloadedUsers = useMemo(() => {
    return getUsersByIds(otherUserIds);
  }, [getUsersByIds, otherUserIds]);

  // Check if we need to fetch missing users
  const needsFetch = useMemo(() => {
    // If we have all users, no need to fetch
    if (preloadedUsers.length === otherUserIds.length) {
      return false;
    }

    // If any user is currently loading, don't fetch again
    const loadingUsers = otherUserIds.some((id) =>
      channelLoadingService.isUserLoading(id),
    );

    return !loadingUsers;
  }, [preloadedUsers, otherUserIds]);

  // Pre-load users on mount and when otherUserIds change - with loading checks
  useEffect(() => {
    if (!channelId || !channel || otherUserIds.length === 0) {
      return;
    }

    // Only fetch if we need to and not initialized
    if ((needsFetch || isForceLoading) && (!isInitialized || isForceLoading)) {
      // Mark users as loading
      otherUserIds.forEach((userId) => {
        if (!getUserById(userId)) {
          channelLoadingService.setUserLoading(userId, true);
        }
      });

      // Fetch users
      usersQuery
        .refetch()
        .then(() => {
          // Mark as initialized and remove loading flag
          setIsInitialized(true);
          setIsForceLoading(false);

          // Mark users as not loading
          otherUserIds.forEach((userId) => {
            channelLoadingService.setUserLoading(userId, false);
          });
        })
        .catch(() => {
          // On error, also remove loading flags
          setIsForceLoading(false);
          otherUserIds.forEach((userId) => {
            channelLoadingService.setUserLoading(userId, false);
          });
        });
    } else if (
      preloadedUsers.length === otherUserIds.length &&
      !isInitialized
    ) {
      // If we have all users but not initialized, mark as initialized
      setIsInitialized(true);
    }
  }, [
    channel,
    channelId,
    otherUserIds,
    needsFetch,
    usersQuery,
    isInitialized,
    isForceLoading,
    getUserById,
    preloadedUsers.length,
  ]);

  // Initialize or refresh direct channel info when needed - with loading protection
  useEffect(() => {
    if (!channel || !currentUser || (!isDirect && !isGroup)) {
      return;
    }

    // Check loading state to avoid loops
    if (channelLoadingService.isChannelLoading(channelId!)) {
      return;
    }

    const shouldRefresh =
      !directInfo ||
      directInfo.status === "loading" ||
      (isForceLoading && directInfo.status !== "complete");

    if (shouldRefresh) {
      // Set loading flag
      channelLoadingService.setChannelLoading(channelId!, true);

      // Refresh info
      refreshDirectChannelInfo(channelId!, currentUser.id);

      // Clear loading flag after a short delay
      setTimeout(() => {
        channelLoadingService.setChannelLoading(channelId!, false);
      }, 100);
    }
  }, [
    channel,
    currentUser,
    isDirect,
    isGroup,
    directInfo,
    channelId,
    refreshDirectChannelInfo,
    isForceLoading,
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

  // Loading status with proper checks to avoid loops
  const isLoading = useMemo(() => {
    // If we're forcing a load, we're loading
    if (isForceLoading) return true;

    // If we have no channel or are not direct/group, we're not loading
    if (!channel || (!isDirect && !isGroup)) return false;

    // Check if channel is loading
    if (channelId && isDirectChannelLoading(channelId)) return true;

    // Check if any users are loading
    const anyUserLoading = otherUserIds.some((id) =>
      channelLoadingService.isUserLoading(id),
    );

    // We're loading if we're not initialized, need to fetch, or any user is loading
    return !isInitialized || needsFetch || anyUserLoading;
  }, [
    channel,
    channelId,
    isDirect,
    isGroup,
    isDirectChannelLoading,
    isInitialized,
    needsFetch,
    otherUserIds,
    isForceLoading,
  ]);

  /**
   * Refreshes user information with loading protection
   */
  const refreshUsers = useCallback(() => {
    // Don't refresh if we're already loading
    if (isLoading || isForceLoading) return Promise.resolve(null);

    // Force loading flag
    setIsForceLoading(true);

    // Return the query to allow chaining
    return usersQuery.refetch();
  }, [isLoading, isForceLoading, usersQuery]);

  /**
   * Refreshes direct channel info with loading protection
   */
  const refreshInfo = useCallback(() => {
    if (!channelId || !currentUser) return;

    // Don't refresh if we're already loading
    if (channelLoadingService.isChannelLoading(channelId)) return;

    // Set loading flag
    channelLoadingService.setChannelLoading(channelId, true);

    // Refresh info
    refreshDirectChannelInfo(channelId, currentUser.id);

    // Clear loading flag after a short delay
    setTimeout(() => {
      channelLoadingService.setChannelLoading(channelId, false);
    }, 100);
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
