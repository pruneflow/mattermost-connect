// src/hooks/useDirectChannels.tsx
/**
 * Direct channel hooks
 * Provides access to direct and group message functionality
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useChannelQuery } from "../core/api/queries/channelQueries";
import { useDirectChannelStore } from "../core/store/directChannelStore";
import { useChannelStore } from "../core/store/channelStore";
import { useUserStore } from "../core/store/userStore";
import { channelService } from "../core/services/channelService";
import { Channel, DirectChannelInfo, UserWithStatus, User } from "../types";
import { useAuthStore } from "../core/store/authStore";
import { handleError } from "../core/store/errorStore";
import { ErrorSource } from "../types";
import { apiClient } from "../core/api/client";
import { userService } from "../core/services/userService";

/**
 * Hook for direct channel functionality
 * @returns Direct channel operations and data
 */
export function useDirectChannels() {
  const { currentUser } = useAuthStore();
  const {
    directChannelInfoById,
    setDirectChannelInfo,
    updateDirectChannelInfo,
    setDirectChannelUserStatus,
  } = useDirectChannelStore();

  const { getChannelsByType } = useChannelStore();
  const { getUserById, getUserStatus } = useUserStore();

  // Get all direct and group channels
  const directChannels = useMemo(() => {
    // We don't filter by team here since direct channels can be accessed from any team
    const allChannels = getChannelsByType("", "direct");
    return allChannels;
  }, [getChannelsByType]);

  const groupChannels = useMemo(() => {
    // We don't filter by team here since group channels can be accessed from any team
    const allChannels = getChannelsByType("", "group");
    return allChannels;
  }, [getChannelsByType]);

  /**
   * Creates a direct channel with a user
   * @param userId User ID to create a direct channel with
   */
  const createDirectChannel = useCallback(
    async (userId: string): Promise<Channel | null> => {
      if (!currentUser) {
        throw new Error("Must be authenticated to create direct channels");
      }

      try {
        // Generate direct channel name
        const channelName = channelService.generateDirectChannelName(
          currentUser.id,
          userId,
        );

        // Check if channel already exists
        const existingChannel = directChannels.find(
          (channel) => channel.name === channelName,
        );

        if (existingChannel) {
          return existingChannel;
        }

        // Create channel
        const response = await apiClient.post<Channel>("channels/direct", [
          currentUser.id,
          userId,
        ]);

        // Get the channel from store or response
        const channel = response.data;

        // Get other user
        const otherUser = getUserById(userId);

        // Create direct channel info
        if (otherUser && channel) {
          const directInfo: DirectChannelInfo = {
            isDirect: true,
            isGroup: false,
            displayName: channelService.getDirectChannelDisplayName(otherUser),
            userIds: [currentUser.id, userId],
            otherUserId: userId,
            userStatus: getUserStatus(userId),
            status: "complete",
          };

          setDirectChannelInfo(channel.id, directInfo);
        }

        return channel;
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return null;
      }
    },
    [
      currentUser,
      directChannels,
      getUserById,
      getUserStatus,
      setDirectChannelInfo,
    ],
  );

  /**
   * Creates a group channel with multiple users
   * @param userIds User IDs to include in the group channel
   */
  const createGroupChannel = useCallback(
    async (userIds: string[]): Promise<Channel | null> => {
      if (!currentUser) {
        throw new Error("Must be authenticated to create group channels");
      }

      if (userIds.length < 2) {
        throw new Error(
          "Group channels require at least 3 participants (including you)",
        );
      }

      try {
        // Ensure current user is included
        const allUserIds = [
          currentUser.id,
          ...userIds.filter((id) => id !== currentUser.id),
        ];

        // Create channel
        const response = await apiClient.post<Channel>(
          "channels/group",
          allUserIds,
        );

        // Get the created channel
        const channel = response.data;

        // Get users
        const users = allUserIds
          .map((id) => getUserById(id))
          .filter((user): user is User => !!user);

        // Create group channel info
        if (channel) {
          const directInfo: DirectChannelInfo = {
            isDirect: false,
            isGroup: true,
            displayName: channelService.getGroupChannelDisplayName(
              users,
              currentUser.id,
            ),
            userIds: allUserIds,
            status: "complete",
          };

          setDirectChannelInfo(channel.id, directInfo);
        }

        return channel;
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return null;
      }
    },
    [currentUser, getUserById, setDirectChannelInfo],
  );

  /**
   * Gets direct channel info
   * @param channelId Channel ID
   */
  const getDirectChannelInfo = useCallback(
    (channelId: string): DirectChannelInfo | null => {
      return directChannelInfoById[channelId] || null;
    },
    [directChannelInfoById],
  );

  /**
   * Refreshes direct channel info
   * @param channelId Channel ID
   */
  const refreshDirectChannelInfo = useCallback(
    (channelId: string) => {
      if (!currentUser) return;

      const directChannelStore = useDirectChannelStore.getState();
      directChannelStore.refreshDirectChannelInfo(channelId, currentUser.id);
    },
    [currentUser],
  );

  return {
    // Data
    directChannels,
    groupChannels,

    // Actions
    createDirectChannel,
    createGroupChannel,
    getDirectChannelInfo,
    refreshDirectChannelInfo,
  };
}

/**
 * Hook for a specific direct channel
 * @param channelId Channel ID
 * @returns Direct channel data and operations
 */
export function useDirectChannel(channelId: string | undefined) {
  const { currentUser } = useAuthStore();
  const { channelQuery, channel } = useChannelInfo(channelId);

  const {
    directChannelInfoById,
    getDirectChannelInfo,
    setDirectChannelUserStatus,
    refreshDirectChannelInfo,
  } = useDirectChannelStore();

  const { getUserById, getUserStatus } = useUserStore();

  // Get direct channel info
  const directInfo = useMemo(() => {
    if (!channelId) return null;
    return getDirectChannelInfo(channelId);
  }, [channelId, getDirectChannelInfo]);

  // Refresh direct channel info if needed
  useEffect(() => {
    if (
      channel &&
      currentUser &&
      channelService.isDirectOrGroupChannel(channel) &&
      (!directInfo || directInfo.status === "loading")
    ) {
      refreshDirectChannelInfo(channelId!, currentUser.id);
    }
  }, [channel, currentUser, directInfo, channelId, refreshDirectChannelInfo]);

  // Get other user for direct channels
  const otherUser = useMemo(() => {
    if (!directInfo || !directInfo.isDirect || !directInfo.otherUserId)
      return null;

    return getUserById(directInfo.otherUserId);
  }, [directInfo, getUserById]);

  // Get other users for group channels
  const groupUsers = useMemo(() => {
    if (!directInfo || !directInfo.isGroup || !directInfo.userIds) return [];

    return directInfo.userIds
      .filter((id) => id !== currentUser?.id)
      .map((id) => {
        const user = getUserById(id);
        if (!user) return null;

        return {
          user,
          status: getUserStatus(id),
          displayName: userService.formatUserName(user),
        } as UserWithStatus;
      })
      .filter((u): u is UserWithStatus => !!u);
  }, [directInfo, currentUser, getUserById, getUserStatus]);

  // Update user status when it changes
  useEffect(() => {
    if (directInfo?.isDirect && directInfo.otherUserId && channelId) {
      const status = getUserStatus(directInfo.otherUserId);
      setDirectChannelUserStatus(channelId, status);
    }
  }, [directInfo, channelId, getUserStatus, setDirectChannelUserStatus]);

  return {
    // Data
    channel,
    directInfo,
    otherUser,
    groupUsers,

    // State
    isLoading: channelQuery.isLoading,
    error: channelQuery.error,
    isDirect: directInfo?.isDirect || false,
    isGroup: directInfo?.isGroup || false,

    // Actions
    refreshDirectInfo: () => {
      if (channelId && currentUser) {
        refreshDirectChannelInfo(channelId, currentUser.id);
      }
    },
  };
}

/**
 * Helper hook to get channel info
 * @param channelId Channel ID
 */
function useChannelInfo(channelId: string | undefined) {
  const channelQuery = useChannelQuery(channelId);
  const { getChannelById } = useChannelStore();

  // Get channel from store or query
  const channel = useMemo(() => {
    if (!channelId) return null;
    return getChannelById(channelId) || channelQuery.data || null;
  }, [channelId, getChannelById, channelQuery.data]);

  return { channelQuery, channel };
}
