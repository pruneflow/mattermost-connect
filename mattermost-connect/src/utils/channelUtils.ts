// src/utils/channelUtils.ts
/**
 * Channel utility functions
 * Generic helper functions for working with channels
 */
import { channelService } from "../core/services/channelService";
import { Channel, ChannelType, ChannelGroupType, User } from "../types";

// Re-export the useful functions from channelService for backward compatibility
export const isDirectChannel =
  channelService.isDirectChannel.bind(channelService);
export const isGroupChannel =
  channelService.isGroupChannel.bind(channelService);
export const isDirectOrGroupChannel =
  channelService.isDirectOrGroupChannel.bind(channelService);
export const isPublicChannel =
  channelService.isPublicChannel.bind(channelService);
export const isPrivateChannel =
  channelService.isPrivateChannel.bind(channelService);
export const getUserIdsFromDirectChannel =
  channelService.getUserIdsFromDirectChannel.bind(channelService);
export const getOtherUserIdFromDirectChannel =
  channelService.getOtherUserIdFromDirectChannel.bind(channelService);
export const getUserIdsFromGroupChannel =
  channelService.getUserIdsFromGroupChannel.bind(channelService);
export const generateDirectChannelName =
  channelService.generateDirectChannelName.bind(channelService);
export const getDirectChannelDisplayName =
  channelService.getDirectChannelDisplayName.bind(channelService);
export const getGroupChannelDisplayName =
  channelService.getGroupChannelDisplayName.bind(channelService);
export const getChannelInitials =
  channelService.getChannelInitials.bind(channelService);

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
 * Gets a unique identifier for a channel type
 * @param channelType Channel type character
 * @returns Readable type name
 */
export function getChannelTypeName(channelType: ChannelType): string {
  switch (channelType) {
    case "O":
      return "public";
    case "P":
      return "private";
    case "D":
      return "direct";
    case "G":
      return "group";
    default:
      return "unknown";
  }
}

/**
 * Builds a display name for a list of channel members
 * @param members List of member names
 * @param maxNames Maximum number of names to display
 * @returns Formatted display name
 */
export function buildGroupDisplayName(
  members: string[],
  maxNames: number = 3,
): string {
  if (members.length === 0) return "Group Channel";

  if (members.length <= maxNames) {
    return members.join(", ");
  }

  const visibleMembers = members.slice(0, maxNames);
  const remainingCount = members.length - maxNames;

  return `${visibleMembers.join(", ")} and ${remainingCount} more`;
}

/**
 * Converts a display name to a valid channel name
 * @param displayName Display name
 * @returns Valid channel name
 */
export function sanitizeChannelName(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 64);
}

/**
 * Checks if a channel is a default system channel
 * @param channel Channel to check
 * @returns Whether the channel is a system default
 */
export function isDefaultChannel(channel: Channel): boolean {
  return channel.name === "town-square" || channel.name === "off-topic";
}

/**
 * Creates a canonical name for a group channel
 * @param userIds List of user IDs
 * @returns Canonical group channel name
 */
export function createGroupChannelName(userIds: string[]): string {
  return `G__${userIds.sort().join("__")}`;
}
