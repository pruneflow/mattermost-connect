// src/hooks/useDirectChannels.tsx
/**
 * Hook for direct channel functionality
 */
import { useCallback, useEffect, useMemo } from "react";
import { Channel, User, DirectChannelInfo } from "../types";
import { useChannelStore } from "../core/store/channelStore";
import { useDirectChannelStore } from "../core/store/directChannelStore";
import { useAuthStore } from "../core/store/authStore";
import { useUserStore } from "../core/store/userStore";
import { channelService } from "../core/services/channelService";
import { useUsersQuery } from "../core/api/queries/userQueries";

/**
 * Hook that provides utilities for working with direct channels
 */
export function useDirectChannels() {
  // Get current user
  const { currentUser } = useAuthStore();
  const currentUserId = currentUser?.id || "";

  // Get user store
  const { byId: users, statusByUserId: statuses } = useUserStore();

  // Get direct channel store
  const {
    getDirectChannelInfo,
    setDirectChannelInfo,
    refreshDirectChannelInfo,
  } = useDirectChannelStore();

  /**
   * Gets detailed information about a direct or group channel
   * @param channel Channel to process
   * @returns Direct channel information
   */
  const getChannelInfo = useCallback(
    (channel: Channel): DirectChannelInfo => {
      // Check existing info
      const existingInfo = getDirectChannelInfo(channel.id);
      if (existingInfo) {
        return existingInfo;
      }

      // If not direct or group, return minimal default info
      if (!channelService.isDirectOrGroupChannel(channel)) {
        return {
          isDirect: false,
          isGroup: false,
          displayName: channel.display_name || "Channel",
          userIds: [],
          status: "complete",
        };
      }

      // Create info
      const info = channelService.createDirectChannelInfo(
        channel,
        currentUserId,
        users,
        statuses,
      );

      // Cache the result
      setDirectChannelInfo(channel.id, info);

      return info;
    },
    [
      currentUserId,
      users,
      statuses,
      getDirectChannelInfo,
      setDirectChannelInfo,
    ],
  );

  /**
   * Processes a list of channels to get direct channel information
   * @param channels List of channels to process
   * @returns Map of channel IDs to direct channel information
   */
  const getChannelsInfo = useCallback(
    (channels: Channel[]): Record<string, DirectChannelInfo> => {
      const channelsInfo: Record<string, DirectChannelInfo> = {};

      channels.forEach((channel) => {
        channelsInfo[channel.id] = getChannelInfo(channel);
      });

      return channelsInfo;
    },
    [getChannelInfo],
  );

  /**
   * Gets direct message display names for a list of channels
   * @param channels List of channels
   * @returns Record of channel IDs to display names
   */
  const getDirectMessageDisplayNames = useCallback(
    (channels: Channel[]): Record<string, string[]> => {
      const displayNames: Record<string, string[]> = {};

      channels.forEach((channel) => {
        const info = getChannelInfo(channel);
        displayNames[channel.id] = [info.displayName];
      });

      return displayNames;
    },
    [getChannelInfo],
  );

  /**
   * Checks if all direct channel users are loaded
   * @param channels List of channels to check
   * @returns Whether all direct channel users are loaded
   */
  const areAllDirectChannelUsersLoaded = useCallback(
    (channels: Channel[]): boolean => {
      for (const channel of channels) {
        if (
          !channelService.areDirectChannelUsersLoaded(
            channel,
            users,
            currentUserId,
          )
        ) {
          return false;
        }
      }
      return true;
    },
    [users, currentUserId],
  );

  /**
   * Gets a list of user IDs needed to properly display all direct channels
   * @param channels List of channels
   * @returns Array of user IDs that need to be loaded
   */
  const getNeededUserIds = useCallback(
    (channels: Channel[]): string[] => {
      return channelService.getNeededUserIdsForDirectChannels(
        channels,
        users,
        currentUserId,
      );
    },
    [users, currentUserId],
  );

  return {
    getChannelInfo,
    getChannelsInfo,
    getDirectMessageDisplayNames,
    areAllDirectChannelUsersLoaded,
    getNeededUserIds,
  };
}

/**
 * Hook that ensures users for direct channels are loaded
 * @param channels Channels to load users for
 */
export function useDirectChannelUsers(channels: Channel[] = []) {
  // Get current user
  const { currentUser } = useAuthStore();
  const currentUserId = currentUser?.id || "";

  // Get needed user IDs
  const { getNeededUserIds } = useDirectChannels();

  // Compute user IDs to load
  const userIdsToLoad = useMemo(
    () => getNeededUserIds(channels),
    [channels, getNeededUserIds],
  );

  // Use query to load users
  const {
    isLoading: isLoadingUsers,
    data: loadedUsers,
    error,
  } = useUsersQuery({
    userIds: userIdsToLoad.length > 0 ? userIdsToLoad : undefined,
  });

  // Update direct channel info when users load
  const { refreshDirectChannelInfo } = useDirectChannelStore();

  useEffect(() => {
    if (loadedUsers && loadedUsers.length > 0) {
      // Refresh all direct channel info that involves these users
      channels.forEach((channel) => {
        if (channelService.isDirectOrGroupChannel(channel)) {
          refreshDirectChannelInfo(channel.id, currentUserId);
        }
      });
    }
  }, [loadedUsers, channels, currentUserId, refreshDirectChannelInfo]);

  return {
    isLoadingUsers,
    userIdsToLoad,
    userIdsCount: userIdsToLoad.length,
    loadedUsers,
    loadedCount: loadedUsers?.length || 0,
    stillMissingCount: userIdsToLoad.length - (loadedUsers?.length || 0),
    error,
  };
}

/**
 * Hook that provides information for a single direct channel
 * @param channel Channel to get information for
 * @returns Direct channel information
 */
export function useDirectChannel(channel: Channel | null | undefined) {
  const { getChannelInfo } = useDirectChannels();

  // Memoize the channel info
  return useMemo(() => {
    if (!channel) {
      return {
        isDirect: false,
        isGroup: false,
        displayName: "",
        userIds: [],
        status: "complete" as const,
      };
    }

    return getChannelInfo(channel);
  }, [channel, getChannelInfo]);
}
