// src/hooks/useDirectChannels.tsx
/**
 * Hook for managing direct and group message channels
 */
import { useMemo } from "react";
import { Channel } from "../core/store/channelStore";
import { useAuthStore } from "../core/store/authStore";
import { getUserStatus, useUserStore } from "../core/store/userStore";
import {
  getDirectChannelDisplayName,
  getGroupChannelDisplayName,
  getOtherUserIdFromDirectChannel,
  getUserIdsFromDirectChannel,
  getUserIdsFromGroupChannel,
  isDirectChannel,
  isGroupChannel,
} from "../utils/directChannelUtils";

/**
 * Status for a direct channel information request
 */
export type DirectChannelInfoStatus = "complete" | "loading" | "error";

/**
 * Interface for direct channel information
 */
export interface DirectChannelInfo {
  /** Whether the channel is a direct message */
  isDirect: boolean;
  /** Whether the channel is a group message */
  isGroup: boolean;
  /** Display name for the channel */
  displayName: string;
  /** User ID(s) associated with the channel */
  userIds: string[];
  /** Other user ID (for direct channels, not current user) */
  otherUserId?: string | null;
  /** Avatar image URL for other user (direct channels) */
  userImageUrl?: string;
  /** Online status of other user (direct channels) */
  userStatus?: "online" | "away" | "dnd" | "offline";
  /** Avatar image URLs for group channels */
  groupAvatarUrls?: string[];
  /** Loading status for channel info */
  status: DirectChannelInfoStatus;
}

/**
 * Hook that provides utilities for working with direct and group message channels
 */
export function useDirectChannels() {
  // Get current user
  const { currentUser } = useAuthStore();
  const currentUserId = currentUser?.id || "";

  // Get user store for user information
  const { getUserById } = useUserStore();

  /**
   * Gets detailed information about a direct or group channel
   * @param channel Channel to process
   * @returns Direct channel information
   */
  const getChannelInfo = (channel: Channel): DirectChannelInfo => {
    const isDirect = isDirectChannel(channel);
    const isGroup = isGroupChannel(channel);
    let displayName = channel.display_name;
    let userIds: string[] = [];
    let otherUserId: string | null = "";
    let userImageUrl: string | undefined = undefined;
    let userStatus: "online" | "away" | "dnd" | "offline" | undefined =
      undefined;
    let groupAvatarUrls: string[] = [];
    let status: DirectChannelInfoStatus = "complete";

    // Process direct message channel
    if (isDirect) {
      // Extract user IDs from channel name
      userIds = getUserIdsFromDirectChannel(channel.name);
      otherUserId = getOtherUserIdFromDirectChannel(
        channel.name,
        currentUserId,
      );

      if (otherUserId) {
        const otherUser = getUserById(otherUserId);

        // Get display name
        if (otherUser) {
          displayName = getDirectChannelDisplayName(otherUser);

          // Get avatar URL if available
          if (otherUser.last_picture_update) {
            userImageUrl = `/api/v4/users/${otherUser.id}/image?_=${otherUser.last_picture_update}`;
          }

          // Get user status
          userStatus = getUserStatus(otherUserId);
          status = "complete";
        } else {
          // User data is not available yet - we're in loading state
          // Use a more user-friendly placeholder than just the ID
          displayName =
            otherUserId.length > 8
              ? `Loading user... (${otherUserId.substring(0, 5)})`
              : `Loading user... (${otherUserId})`;

          // Show loading status
          userStatus = "offline"; // Default status while loading
          status = "loading";
        }
      }
    }
    // Process group message channel
    else if (isGroup) {
      // Try to collect user IDs if we have them
      userIds = getUserIdsFromGroupChannel(channel);

      // Get group avatar URLs (simplified)
      const memberAvatars: string[] = [];
      groupAvatarUrls = memberAvatars;

      // Generate a display name if not already set
      if (!displayName || displayName === "Group Channel") {
        // In a real implementation, this would use the actual group members
        const groupUsers = userIds
          .map((id) => getUserById(id))
          .filter((user) => !!user);

        if (groupUsers.length > 0) {
          displayName = getGroupChannelDisplayName(groupUsers, currentUserId);
          status = "complete";
        } else {
          displayName = "Group Message";
          status = "loading";
        }
      }
    }

    return {
      isDirect,
      isGroup,
      displayName,
      userIds,
      otherUserId,
      userImageUrl,
      userStatus,
      groupAvatarUrls,
      status,
    };
  };

  /**
   * Processes a list of channels to get direct channel information
   * @param channels List of channels to process
   * @returns Map of channel IDs to direct channel information
   */
  const getChannelsInfo = (
    channels: Channel[],
  ): Record<string, DirectChannelInfo> => {
    const channelsInfo: Record<string, DirectChannelInfo> = {};

    channels.forEach((channel) => {
      channelsInfo[channel.id] = getChannelInfo(channel);
    });

    return channelsInfo;
  };

  /**
   * Gets direct message display names for a list of channels
   * @param channels List of channels
   * @returns Record of channel IDs to display names
   */
  const getDirectMessageDisplayNames = (
    channels: Channel[],
  ): Record<string, string[]> => {
    const displayNames: Record<string, string[]> = {};

    channels.forEach((channel) => {
      const info = getChannelInfo(channel);
      displayNames[channel.id] = [info.displayName];
    });

    return displayNames;
  };

  /**
   * Checks if all direct channel users are loaded
   * @param channels List of channels to check
   * @returns Whether all direct channel users are loaded
   */
  const areAllDirectChannelUsersLoaded = (channels: Channel[]): boolean => {
    for (const channel of channels) {
      if (isDirectChannel(channel)) {
        const otherUserId = getOtherUserIdFromDirectChannel(
          channel.name,
          currentUserId,
        );
        if (otherUserId && !getUserById(otherUserId)) {
          return false;
        }
      } else if (isGroupChannel(channel)) {
        const memberIds = getUserIdsFromGroupChannel(channel);
        for (const memberId of memberIds) {
          if (memberId !== currentUserId && !getUserById(memberId)) {
            return false;
          }
        }
      }
    }
    return true;
  };

  return {
    getChannelInfo,
    getChannelsInfo,
    getDirectMessageDisplayNames,
    areAllDirectChannelUsersLoaded,
  };
}

/**
 * Hook that provides information for a single direct or group channel
 * @param channel Channel to get information for
 * @returns Direct channel information
 */
export function useDirectChannel(channel: Channel | null | undefined) {
  const { getChannelInfo } = useDirectChannels();

  // Memoize the channel info to prevent unnecessary recalculations
  return useMemo(() => {
    if (!channel) {
      return {
        isDirect: false,
        isGroup: false,
        displayName: "",
        userIds: [],
        status: "complete" as DirectChannelInfoStatus,
      };
    }

    return getChannelInfo(channel);
  }, [channel, getChannelInfo]);
}
