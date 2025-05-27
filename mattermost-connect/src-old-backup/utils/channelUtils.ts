import { Channel, User } from "../api/types";

/**
 * Utility functions for working with channels
 */

/**
 * Check if a channel is a direct message channel (1-on-1)
 */
export const isDirectChannel = (channel: Channel): boolean => {
  // Direct channels are type 'D' with either no __ or exactly one __ (two IDs total)
  if (channel.type === "D") {
    const parts = channel.name.split("__");
    // A valid direct channel should have exactly 2 user IDs
    return parts.length === 2;
  }
  return false;
};

/**
 * Check if a channel is a group message channel (3+ people)
 */
export const isGroupChannel = (channel: Channel): boolean => {
  // Group channels are either type 'G' or type 'D' with multiple __
  if (channel.type === "G") {
    return true;
  }

  if (channel.type === "D") {
    const parts = channel.name.split("__");
    // Direct channels with more than 2 user IDs are considered group channels
    return parts.length > 2;
  }

  return false;
};

/**
 * Extract user IDs from a direct channel name
 * Direct channel names are in the format user1id__user2id
 */
export const getUserIdsFromDirectChannel = (channelName: string): string[] => {
  // Channel name format: user1ID__user2ID
  const userIds = channelName.split("__");
  return userIds.filter((id) => id !== "");
};

/**
 * Extract user IDs from a group channel name
 * Group channel names can have several formats depending on Mattermost version:
 * - user1id__user2id__user3id (direct-style group channels)
 * - G__user1id__user2id__user3id (prefixed group channels)
 * - other custom formats
 */
export const getUserIdsFromGroupChannel = (channel: Channel): string[] => {
  if (channel.type === "G" || channel.type === "D") {
    // Handle potential 'G' prefix in channel name
    let channelName = channel.name;
    if (channelName.startsWith("G__")) {
      channelName = channelName.substring(3); // Remove G__ prefix
    }

    // Split by double underscore and filter out empty strings and special markers
    const userIds = channelName.split("__").filter((id) => {
      return (
        id !== "" &&
        id !== "me" &&
        id !== "G" &&
        id !== "group" &&
        !id.startsWith("uid")
      ); // Some implementations use uid prefix
    });

    return userIds;
  }

  return [];
};

/**
 * Get the other user ID in a direct channel
 */
export const getOtherUserIdFromDirectChannel = (
  channelName: string,
  currentUserId: string,
): string | null => {
  const userIds = getUserIdsFromDirectChannel(channelName);
  const otherUserId = userIds.find((id) => id !== currentUserId);
  return otherUserId || null;
};

/**
 * Format direct channel display name
 */
export const getDirectChannelDisplayName = (
  user: User | null | undefined,
  fallback = "Direct Message",
): string => {
  if (!user) {
    return fallback;
  }

  // Use full name if available, otherwise username
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  return fullName || user.username || fallback;
};

/**
 * Format group channel display name
 */
export const getGroupChannelDisplayName = (
  users: (User | null | undefined)[],
  fallback = "Group Message",
): string => {
  if (!users || users.length === 0) {
    return fallback;
  }

  // Get user names, filtering out nulls/undefined
  const userNames = users
    .filter((user) => !!user)
    .map((user) => {
      if (!user) return "";
      const fullName = `${user.first_name} ${user.last_name}`.trim();
      return fullName || user.username || "";
    })
    .filter((name) => !!name);

  if (userNames.length === 0) {
    return fallback;
  }

  // If too many users, truncate the list
  if (userNames.length > 3) {
    return `${userNames.slice(0, 3).join(", ")} +${userNames.length - 3}`;
  }

  return userNames.join(", ");
};

/**
 * Sanitize a channel name to meet Mattermost's requirements
 * Channel names must be lowercase, start with a letter, and contain only letters, numbers, dashes, and underscores
 */
export const sanitizeChannelName = (name: string): string => {
  // Replace spaces and special chars with dashes
  let sanitized = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "");

  // Ensure starts with a letter
  if (!/^[a-z]/.test(sanitized)) {
    sanitized = `ch-${sanitized}`;
  }

  // Truncate to 64 chars (Mattermost limit)
  return sanitized.slice(0, 64);
};

/**
 * Validate a channel name meets Mattermost's requirements
 */
const validateChannelName = (name: string): boolean => {
  // Channel names must:
  // - Be lowercase
  // - Start with a letter
  // - Be 2-64 characters long
  // - Contain only letters, numbers, dashes, and underscores
  const regex = /^[a-z][a-z0-9\-_]{1,63}$/;
  return regex.test(name);
};
