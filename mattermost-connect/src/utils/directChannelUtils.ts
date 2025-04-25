// src/utils/directChannelUtils.ts
/**
 * Utility functions for handling direct messages and group channels
 */
import { Channel } from "../core/store/channelStore";
import { User } from "../core/services/authService";
import { stringToColor } from "./mattermostUtils";

/**
 * Checks if a channel is a direct message channel
 * @param channel Channel to check
 * @returns Whether the channel is a direct message
 */
export function isDirectChannel(channel: Channel): boolean {
  return channel.type === "D";
}

/**
 * Checks if a channel is a group message channel
 * @param channel Channel to check
 * @returns Whether the channel is a group message
 */
export function isGroupChannel(channel: Channel): boolean {
  return channel.type === "G";
}

/**
 * Checks if a channel is a direct or group message channel
 * @param channel Channel to check
 * @returns Whether the channel is a direct or group message
 */
export function isDirectOrGroupChannel(channel: Channel): boolean {
  return isDirectChannel(channel) || isGroupChannel(channel);
}

/**
 * Extracts user IDs from a direct channel name
 * Direct channel names are formatted as "user1_id__user2_id" with IDs sorted alphabetically
 * @param channelName The channel name (not display_name)
 * @returns Array of user IDs
 */
export function getUserIdsFromDirectChannel(channelName: string): string[] {
  // Direct channel names are two user IDs sorted alphabetically and joined with a double underscore
  return channelName.split("__");
}

/**
 * Gets the other user ID from a direct channel (not current user)
 * @param channelName The channel name (not display_name)
 * @param currentUserId Current user ID
 * @returns The other user ID or null if not found
 */
export function getOtherUserIdFromDirectChannel(
  channelName: string,
  currentUserId: string,
): string | null {
  const userIds = getUserIdsFromDirectChannel(channelName);
  const otherUserId = userIds.find((id) => id !== currentUserId);
  return otherUserId || null;
}

/**
 * Generates a display name for a direct channel
 * @param otherUser The other user in the direct channel
 * @param fallbackName Fallback name if user info is not available
 * @returns Display name for the direct channel
 */
export function getDirectChannelDisplayName(
  otherUser: User | null | undefined,
  fallbackName: string = "Unknown User",
): string {
  if (!otherUser) {
    return fallbackName;
  }

  if (otherUser.first_name && otherUser.last_name) {
    return `${otherUser.first_name} ${otherUser.last_name}`;
  } else if (otherUser.nickname) {
    return otherUser.nickname;
  } else {
    return otherUser.username || fallbackName;
  }
}

/**
 * Generates a display name for a group channel
 * @param users Array of users in the group
 * @param currentUserId Current user ID to exclude from the display name
 * @param maxNames Maximum number of names to include before using "and X more"
 * @returns Display name for the group channel
 */
export function getGroupChannelDisplayName(
  users: User[],
  currentUserId: string,
  maxNames: number = 3,
): string {
  // Filter out current user and get valid users
  const otherUsers = users.filter((user) => user.id !== currentUserId);

  if (otherUsers.length === 0) {
    return "Group Channel";
  }

  // Format names
  const formattedNames = otherUsers.map((user) => {
    if (user.first_name) {
      return user.first_name;
    } else if (user.nickname) {
      return user.nickname;
    } else {
      return user.username;
    }
  });

  // Limit the number of displayed names
  if (formattedNames.length <= maxNames) {
    return formattedNames.join(", ");
  } else {
    const displayedNames = formattedNames.slice(0, maxNames);
    const remainingCount = formattedNames.length - maxNames;
    return `${displayedNames.join(", ")} and ${remainingCount} more`;
  }
}

/**
 * Generates a unique key for caching display names
 * @param channelId Channel ID
 * @param currentUserId Current user ID
 * @returns Cache key
 */
export function getDisplayNameCacheKey(
  channelId: string,
  currentUserId: string,
): string {
  return `${channelId}:${currentUserId}`;
}

/**
 * Generates a placeholder display name for a direct channel when user data is not available
 * @param userId User ID
 * @returns Placeholder display name
 */
export function getPlaceholderDisplayName(userId: string): string {
  return `User ${userId.substring(0, 5)}...`;
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
 * Generates initials for a direct or group channel
 * @param displayName Display name of the channel
 * @returns Initials (1-2 characters)
 */
export function getChannelInitials(displayName: string): string {
  if (!displayName) return "?";

  const parts = displayName.trim().split(/[\s,]+/);

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

/**
 * Extracts user IDs from a group channel name or members list
 * @param channel Group channel
 * @param members Optional list of channel members
 * @returns Array of user IDs
 */
export function getUserIdsFromGroupChannel(
  channel: Channel,
  members?: { user_id: string }[],
): string[] {
  if (members && members.length > 0) {
    return members.map((member) => member.user_id);
  }

  // If members aren't provided and we have a channel name that looks like a
  // group of user IDs (G__user1__user2__user3), try to parse those
  if (channel.name && channel.name.startsWith("G__")) {
    const parts = channel.name.split("__");
    // Remove the 'G' prefix and return the rest of the parts
    return parts.slice(1).filter((part) => part.length > 0);
  }

  // If we can't determine the members, return an empty array
  // In a real implementation, you would fetch members from the API
  return [];
}
