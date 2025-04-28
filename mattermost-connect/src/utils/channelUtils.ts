// src/utils/channelUtils.ts
/**
 * Utility functions for working with channels
 * Centralized utilities for all channel types
 */
import { Channel } from "../types/channel.types";
import { User } from "../types/auth.types";
import { UserStatus } from "../types/user.types";

/**
 * Channel information interface for direct and group channels
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
  userStatus?: UserStatus;
  /** Avatar image URLs for group channels */
  groupAvatarUrls?: string[];
  /** Loading status for channel info */
  status: "complete" | "loading" | "error";
}

// ===========================================
// Channel Type Detection
// ===========================================

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
 * Checks if a channel is a public channel
 * @param channel Channel to check
 * @returns Whether the channel is public
 */
export function isPublicChannel(channel: Channel): boolean {
  return channel.type === "O";
}

/**
 * Checks if a channel is a private channel
 * @param channel Channel to check
 * @returns Whether the channel is private
 */
export function isPrivateChannel(channel: Channel): boolean {
  return channel.type === "P";
}

// ===========================================
// User ID Extraction and Manipulation
// ===========================================

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
  return [];
}

/**
 * Generates a channel name for direct messages
 * @param userId Current user ID
 * @param otherId Other user ID
 * @returns Channel name
 */
export function generateDirectChannelName(
  userId: string,
  otherId: string,
): string {
  // Direct channel names are two user IDs sorted alphabetically and joined with a double underscore
  return [userId, otherId].sort().join("__");
}

// ===========================================
// Display Name Formatting
// ===========================================

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
      return user.username || "User";
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
 * Gets initials from a display name
 * @param displayName Display name
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
 * Gets a placeholder display name for a direct channel when user data is not available
 * @param userId User ID
 * @returns Placeholder display name
 */
export function getPlaceholderDisplayName(userId: string): string {
  return `User ${userId.substring(0, 5)}...`;
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

// ===========================================
// Channel Grouping and Organization
// ===========================================

/**
 * Gets channels by type from a channel list
 * @param channels List of channels
 * @param type Channel type (O, P, D, G)
 * @returns Filtered channels
 */
export function filterChannelsByType(
  channels: Channel[],
  type: string,
): Channel[] {
  return channels.filter((channel) => channel.type === type);
}

/**
 * Gets favorite channels from a channel list
 * @param channels List of channels
 * @returns Favorite channels
 */
export function getFavoriteChannels(channels: Channel[]): Channel[] {
  return channels.filter((channel) => channel.is_favorite);
}

/**
 * Gets channels for a specific team
 * @param channels List of channels
 * @param teamId Team ID
 * @returns Channels for the team
 */
export function getChannelsForTeam(
  channels: Channel[],
  teamId: string,
): Channel[] {
  return channels.filter((channel) => channel.team_id === teamId);
}

/**
 * Sorts channels by display name
 * @param channels List of channels to sort
 * @returns Sorted channels
 */
export function sortChannelsByDisplayName(channels: Channel[]): Channel[] {
  return [...channels].sort((a, b) =>
    a.display_name.localeCompare(b.display_name),
  );
}
