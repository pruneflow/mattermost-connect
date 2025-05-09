// src/hooks/useDirectChannelUsers.tsx
/**
 * Direct channel users hook
 * Provides access to users in direct and group messages
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  useUserStore,
  useDirectChannelStore,
  useChannelStore,
  handleError,
  useAuthStore,
} from "../core/store";
import { useUsersQuery } from "../core/api/queries/userQueries";
import { channelService } from "../core/services/channelService";
import { userService } from "../core/services/userService";
import { channelLoadingService } from "../core/services/channelLoadingService";
import { User, UserWithStatus } from "../types";
import { ErrorSource } from "../types";

/**
 * Hook for users in a direct or group channel
 * @param channelId Channel ID
 * @returns Users in the channel
 */
export function useDirectChannelUsers(channelId: string | undefined) {
  const { currentUser } = useAuthStore();

  // Use a ref to track initialization to prevent multiple attempts
  const initializationAttemptedRef = useRef<boolean>(false);

  // State for tracking data initialization - just one simple state
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Get stores
  const { getChannelById } = useChannelStore();
  const { getDirectChannelInfo, refreshDirectChannelInfo } =
    useDirectChannelStore();
  const { getUserById, getUserStatus, getUserDisplayName } = useUserStore();

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

  // Single initialization effect that runs only once per channel
  useEffect(() => {
    // Skip if no channel, no current user, or already initialized
    if (
      !channelId ||
      !channel ||
      !currentUser ||
      isInitialized ||
      initializationAttemptedRef.current
    ) {
      return;
    }

    // Mark that we've attempted initialization
    initializationAttemptedRef.current = true;

    // Only proceed for direct/group channels
    if (!channelService.isDirectOrGroupChannel(channel)) {
      setIsInitialized(true);
      return;
    }

    // Check if direct info is already available and complete
    if (directInfo && directInfo.status === "complete") {
      setIsInitialized(true);
      return;
    }

    // Check if the channel is already being loaded
    if (channelLoadingService.isChannelLoading(channelId)) {
      return;
    }

    // Set loading flag
    channelLoadingService.setChannelLoading(channelId, true);

    // Initialize channel info
    const directChannelStore = useDirectChannelStore.getState();
    directChannelStore.refreshDirectChannelInfo(channelId, currentUser.id);

    // Attempt to load users if needed
    if (
      otherUserIds.length > 0 &&
      !channelLoadingService.isUserBatchLoading(otherUserIds)
    ) {
      // Mark users as loading
      otherUserIds.forEach((userId) => {
        if (!getUserById(userId)) {
          channelLoadingService.setUserLoading(userId, true);
        }
      });

      // Execute query
      usersQuery.refetch().finally(() => {
        // Clean up loading states
        otherUserIds.forEach((userId) => {
          channelLoadingService.setUserLoading(userId, false);
        });

        channelLoadingService.setChannelLoading(channelId, false);
        setIsInitialized(true);
      });
    } else {
      // No users to load
      channelLoadingService.setChannelLoading(channelId, false);
      setIsInitialized(true);
    }
  }, [
    channelId,
    channel,
    currentUser,
    directInfo,
    otherUserIds,
    getUserById,
    usersQuery,
  ]);

  useEffect(() => {
    // Sortir si pas de canal ou d'utilisateur actuel
    if (
      !channelId ||
      !currentUser ||
      !channel ||
      !channelService.isDirectOrGroupChannel(channel)
    ) {
      return;
    }

    const refreshIfNeeded = () => {
      const currentDirectInfo = getDirectChannelInfo(channelId);

      if (
        currentDirectInfo?.status === "loading" &&
        !channelLoadingService.isChannelLoading(channelId)
      ) {
        const userIds = currentDirectInfo.userIds.filter(
          (id) => id !== currentUser.id,
        );
        const allUsersLoaded = userIds.every((id) => getUserById(id) !== null);

        if (allUsersLoaded) {
          refreshDirectChannelInfo(channelId, currentUser.id);
        }
      }
    };

    const unsubscribe = useUserStore.subscribe(
      (state) => state.byId,
      () => {
        refreshIfNeeded();
      },
    );

    return () => {
      unsubscribe();
    };
  }, [
    channelId,
    currentUser,
    channel,
    getDirectChannelInfo,
    getUserById,
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

  // Simplified refresh function - only expose for explicit calls, not auto-rendering
  const refreshUsers = useCallback(() => {
    // Skip if already initialized
    if (isInitialized || !channelId || !currentUser) {
      return Promise.resolve(null);
    }

    // Mark as initialized to prevent loops
    setIsInitialized(true);

    // Trigger refresh (used only via explicit user action)
    if (channelService.isDirectOrGroupChannel(channel)) {
      const directChannelStore = useDirectChannelStore.getState();
      directChannelStore.refreshDirectChannelInfo(channelId, currentUser.id);
    }

    return usersQuery.refetch();
  }, [isInitialized, channelId, currentUser, channel, usersQuery]);

  // Loading status combines all relevant indicators
  const isLoading = useMemo(() => {
    // Not loading if initialized and we have the data we need
    if (
      isInitialized &&
      ((isDirect && otherUser) || (isGroup && groupUsers.length > 0))
    ) {
      return false;
    }

    // Consider loading if the channel is loading
    if (channelId && channelLoadingService.isChannelLoading(channelId)) {
      return true;
    }

    // Consider loading if directInfo is in loading state
    if (directInfo && directInfo.status === "loading") {
      return true;
    }

    // Consider loading if any users are loading
    return otherUserIds.some((id) => channelLoadingService.isUserLoading(id));
  }, [
    isInitialized,
    isDirect,
    otherUser,
    isGroup,
    groupUsers,
    channelId,
    directInfo,
    otherUserIds,
  ]);

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

    // Actions - expose only for explicit use
    refreshUsers,

    // Helpers
    formatDisplayName: useCallback(
      (userId: string): string => {
        const user = getUserById(userId);
        if (!user) {
          // Si l'utilisateur n'est pas trouvé, déclenchons une récupération
          // et retournons une valeur temporaire d'attente
          if (!channelLoadingService.isUserLoading(userId)) {
            // Déclencher le chargement de l'utilisateur
            setTimeout(() => {
              const { loadUsersBatch } = useUserStore.getState();
              loadUsersBatch([userId]);
            }, 0);
          }
          return "Chargement...";
        }
        return userService.formatUserName(user);
      },
      [getUserById],
    ),
  };
}
