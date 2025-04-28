// src/utils/directChannelUtils.ts
/**
 * Utility functions specifically for direct and group message channels
 * Extended functionality on top of the core channelUtils
 */
import { stringToColor } from "./mattermostUtils";
import { Channel } from "../types/channel.types";
import { User } from "../types/auth.types";
import {
  isDirectChannel,
  isGroupChannel,
  isDirectOrGroupChannel,
  getUserIdsFromDirectChannel,
  getOtherUserIdFromDirectChannel,
  getUserIdsFromGroupChannel,
  getDirectChannelDisplayName,
  getGroupChannelDisplayName,
  getChannelInitials,
} from "./channelUtils";

// Re-export base functions for backward compatibility
export {
  isDirectChannel,
  isGroupChannel,
  isDirectOrGroupChannel,
  getUserIdsFromDirectChannel,
  getOtherUserIdFromDirectChannel,
  getUserIdsFromGroupChannel,
  getDirectChannelDisplayName,
  getGroupChannelDisplayName,
  getChannelInitials,
};

/**
 * Status for a direct channel information request
 */
export type DirectChannelInfoStatus = "complete" | "loading" | "error";

/**
 * Interface for direct channel information
 */
export interface DirectChannelDisplayInfo {
  /** Whether the channel is a direct message */
  isDirect: boolean;
  /** Whether the channel is a group message */
  isGroup: boolean;
  /** Display name for the channel */
  displayName: string;
  /** User IDs for display and avatar purposes */
  userIds: string[];
  /** Avatar URLs for members (for group channels) */
  avatarUrls?: string[];
  /** Status of the other user (for direct channels) */
  status?: string;
  /** Avatar URL of the other user (for direct channels) */
  avatarUrl?: string;
  /** Loading status of the display info */
  isLoading: boolean;
}

/**
 * Generates a color for a group channel based on its ID
 * @param channelId Channel ID
 * @returns Hex color code
 */
export function getGroupChannelColor(channelId: string): string {
  return stringToColor(channelId);
}

/**
 * Creates a formatted display object for direct/group channels
 * @param channel Channel object
 * @param users Map of user objects by ID
 * @param currentUserId Current user ID
 * @param statusMap Map of user statuses
 * @returns Formatted display info
 */
export function createDirectChannelDisplayInfo(
  channel: Channel,
  users: Record<string, User>,
  currentUserId: string,
  statusMap: Record<string, string> = {},
): DirectChannelDisplayInfo {
  // Default values
  const result: DirectChannelDisplayInfo = {
    isDirect: false,
    isGroup: false,
    displayName: channel.display_name,
    userIds: [],
    isLoading: false,
  };

  // Direct message
  if (isDirectChannel(channel)) {
    const userIds = getUserIdsFromDirectChannel(channel.name);
    const otherUserId = getOtherUserIdFromDirectChannel(
      channel.name,
      currentUserId,
    );

    result.isDirect = true;
    result.userIds = userIds;

    // Get other user info if available
    if (otherUserId) {
      const otherUser = users[otherUserId];

      if (otherUser) {
        result.displayName = getDirectChannelDisplayName(otherUser);
        result.status = statusMap[otherUserId] || "offline";

        // Set avatar URL if available
        if (otherUser.last_picture_update) {
          result.avatarUrl = `/api/v4/users/${otherUser.id}/image?_=${otherUser.last_picture_update}`;
        }
      } else {
        // User not loaded yet
        result.isLoading = true;
      }
    }
  }
  // Group message
  else if (isGroupChannel(channel)) {
    const userIds = getUserIdsFromGroupChannel(channel);
    result.isGroup = true;
    result.userIds = userIds;

    // Get avatars for users in the group
    const groupUsers: User[] = [];
    const avatarUrls: string[] = [];

    userIds.forEach((userId) => {
      const user = users[userId];
      if (user) {
        groupUsers.push(user);

        if (user.last_picture_update) {
          avatarUrls.push(
            `/api/v4/users/${user.id}/image?_=${user.last_picture_update}`,
          );
        }
      }
    });

    if (groupUsers.length > 0) {
      // Create group display name from user list
      result.displayName = getGroupChannelDisplayName(
        groupUsers,
        currentUserId,
      );
      result.avatarUrls = avatarUrls;
    } else {
      // Users not loaded yet
      result.isLoading = true;
    }
  }

  return result;
}

/**
 * Checks if all required users for a direct channel are loaded
 * @param channel Channel to check
 * @param users Map of users by ID
 * @param currentUserId Current user ID
 * @returns Whether all required users are loaded
 */
export function areDirectChannelUsersLoaded(
  channel: Channel,
  users: Record<string, User>,
  currentUserId: string,
): boolean {
  // For direct messages, we need the other user
  if (isDirectChannel(channel)) {
    const otherUserId = getOtherUserIdFromDirectChannel(
      channel.name,
      currentUserId,
    );
    return otherUserId ? !!users[otherUserId] : true;
  }

  // For group messages, we should have at least one other user
  if (isGroupChannel(channel)) {
    const userIds = getUserIdsFromGroupChannel(channel);
    const otherUserIds = userIds.filter((id) => id !== currentUserId);
    return otherUserIds.some((id) => !!users[id]);
  }

  // Not a direct/group channel, so no users needed
  return true;
}

/**
 * Builds a list of user IDs needed to properly display all direct/group channels
 * @param channels List of channels
 * @param users Current loaded users map
 * @param currentUserId Current user ID
 * @returns List of user IDs that need to be loaded
 */
export function getNeededUserIdsForDirectChannels(
  channels: Channel[],
  users: Record<string, User>,
  currentUserId: string,
): string[] {
  const neededUserIds: string[] = [];

  channels.forEach((channel) => {
    if (isDirectChannel(channel)) {
      const otherUserId = getOtherUserIdFromDirectChannel(
        channel.name,
        currentUserId,
      );
      if (
        otherUserId &&
        !users[otherUserId] &&
        !neededUserIds.includes(otherUserId)
      ) {
        neededUserIds.push(otherUserId);
      }
    } else if (isGroupChannel(channel)) {
      const userIds = getUserIdsFromGroupChannel(channel);
      userIds.forEach((userId) => {
        if (
          userId !== currentUserId &&
          !users[userId] &&
          !neededUserIds.includes(userId)
        ) {
          neededUserIds.push(userId);
        }
      });
    }
  });

  return neededUserIds;
}
