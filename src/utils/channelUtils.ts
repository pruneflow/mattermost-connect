import type { Channel, UserProfile, PreferenceType, EnrichedChannel } from '../api/types';
import { displayUsername } from './userUtils';

/**
 * Channel utility functions following Mattermost patterns
 */

/**
 * Check if a channel is a direct message channel (1-on-1)
 */
export const isDirectChannel = (channel: Channel): boolean => {
  if (channel.type === 'D') {
    const parts = channel.name.split('__');
    return parts.length === 2;
  }
  return false;
};

/**
 * Check if a channel is a group message channel (3+ people)
 */
export const isGroupChannel = (channel: Channel): boolean => {
  if (channel.type === 'G') {
    return true;
  }
  
  if (channel.type === 'D') {
    const parts = channel.name.split('__');
    return parts.length > 2;
  }
  
  return false;
};

/**
 * Extract user IDs from a direct channel name
 * Direct channel names are in the format user1id__user2id
 */
export const getUserIdsFromDirectChannel = (channelName: string): string[] => {
  const userIds = channelName.split('__');
  return userIds.filter((id) => id !== '');
};


/**
 * Get the other user ID in a direct channel
 */
export const getOtherUserIdFromDirectChannel = (
  channelName: string,
  currentUserId: string
): string | null => {
  const userIds = getUserIdsFromDirectChannel(channelName);
  const otherUserId = userIds.find((id) => id !== currentUserId);
  return otherUserId || null;
};

/**
 * Format direct channel display name using Mattermost's displayUsername utility
 */
export const getDirectChannelDisplayName = (
  user: UserProfile | null | undefined,
  fallback = 'Direct Message'
): string => {
  if (!user) {
    return fallback;
  }
  
  return displayUsername(user, 'nickname_full_name', true);
};


/**
 * Extract usernames from group channel display name
 */
export const extractUsernamesFromDisplayName = (displayName: string): string[] => {
  if (!displayName) {
    return [];
  }
  
  return displayName
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0);
};

/**
 * Get group channel display name using displayUsername for consistency
 */
export const getGroupChannelDisplayName = (
  displayName: string,
  currentUsername: string,
  userProfiles: Record<string, UserProfile>
): string => {
  const usernames = extractUsernamesFromDisplayName(displayName);
  const filteredUsernames = usernames.filter(username => username !== currentUsername);
  
  if (filteredUsernames.length === 0) {
    return 'Group Message';
  }

  // Extract user profiles once for better performance
  const userProfilesList = Object.values(userProfiles);
  
  // Find UserProfile for each username and use displayUsername
  const displayNames = filteredUsernames
    .map(username => {
      // Find user by username in userProfiles
      const user = userProfilesList.find(profile => profile.username === username);
      return user ? displayUsername(user, 'nickname_full_name', true) : username;
    })
    .filter(name => name); // Remove any null/undefined values

  return displayNames.length > 0 ? displayNames.join(', ') : 'Group Message';
};

/**
 * Sanitize a channel name to meet Mattermost's requirements
 */
export const sanitizeChannelName = (name: string): string => {
  let sanitized = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '');
  
  if (!/^[a-z]/.test(sanitized)) {
    sanitized = `ch-${sanitized}`;
  }
  
  return sanitized.slice(0, 64);
};

/**
 * Get computed display name for any channel type
 */
export const getChannelDisplayName = (
  channel: Channel,
  userProfiles: Record<string, UserProfile>,
  currentUserId: string | null
): string => {
  if (channel.type === 'D' && currentUserId) {
    const otherUserId = getOtherUserIdFromDirectChannel(channel.name, currentUserId);
    const otherUser = otherUserId ? userProfiles[otherUserId] : null;
    return getDirectChannelDisplayName(otherUser);
  }
  
  if (channel.type === 'G') {
    // For group channels, remove current user from display_name
    if (channel.display_name && currentUserId) {
      const currentUser = userProfiles[currentUserId];
      if (currentUser) {
        return getGroupChannelDisplayName(channel.display_name, currentUser.username, userProfiles);
      }
    }
    return channel.display_name || 'Group Message';
  }
  
  return channel.display_name || channel.name;
};

/**
 * Simplified channel processing logic
 */
export interface ProcessedChannelData {
  computedDisplayName: string;
  otherUser?: UserProfile | null;
  otherUserId?: string;
}


/**
 * Process channel data for display - simplified version
 */
export const processChannelData = (
  channel: Channel,
  userProfiles: Record<string, UserProfile>,
  currentUserId: string | null
): ProcessedChannelData => {
  const result: ProcessedChannelData = {
    computedDisplayName: getChannelDisplayName(channel, userProfiles, currentUserId),
  };

  if (channel.type === 'D' && currentUserId) {
    // Direct channel - extract other user
    const otherUserId = getOtherUserIdFromDirectChannel(channel.name, currentUserId);
    const otherUser = otherUserId ? userProfiles[otherUserId] : null;
    
    result.otherUserId = otherUserId || undefined;
    result.otherUser = otherUser;
  }

  return result;
};

/**
 * Select best channel based on rules when no lastVisited channel
 * Rules: If current is direct/group, keep it. Otherwise: Public > Private > Direct > Group
 */
export const selectChannelByRules = (
  currentChannelId: string | null,
  allChannels: EnrichedChannel[],
  excludeCurrentChannel: boolean = false
): string | null => {
  if (allChannels.length === 0) return null;

  // Rule: If current channel is direct or group, keep it (they're global)
  // Only apply this rule if we're not excluding the current channel
  if (!excludeCurrentChannel && currentChannelId) {
    const currentChannel = allChannels.find(ch => ch.id === currentChannelId);
    if (currentChannel && (currentChannel.type === 'D' || currentChannel.type === 'G')) {
      return currentChannelId; // Keep direct/group channels
    }
  }

  // Filter out current channel if requested
  const channelsToUse = excludeCurrentChannel && currentChannelId
    ? allChannels.filter(ch => ch.id !== currentChannelId)
    : allChannels;

  if (channelsToUse.length === 0) return null;

  // Priority: Public > Private > Direct > Group
  const publicChannels = channelsToUse.filter(ch => ch.type === 'O');
  if (publicChannels.length > 0) {
    return publicChannels[0].id;
  }

  const privateChannels = channelsToUse.filter(ch => ch.type === 'P');
  if (privateChannels.length > 0) {
    return privateChannels[0].id;
  }

  const directChannels = channelsToUse.filter(ch => ch.type === 'D');
  if (directChannels.length > 0) {
    return directChannels[0].id;
  }

  const groupChannels = channelsToUse.filter(ch => ch.type === 'G');
  if (groupChannels.length > 0) {
    return groupChannels[0].id;
  }

  return null;
};

/**
 * Check if a group channel should be displayed based on Mattermost preferences
 * Pure utility function - no Redux dependencies
 */
export const shouldDisplayGroupChannel = (
  channel: Channel,
  preferences: PreferenceType[],
  hasUnreads: boolean = false
): boolean => {
  // Only apply to group channels
  if (channel.type !== 'G') {
    return true;
  }

  // Find group_channel_show preference for this channel
  const showPreference = preferences.find(
    p => p.category === 'group_channel_show' && p.name === channel.id
  );

  // If preference is set to hide ('false'), only show if there are unread messages
  if (showPreference?.value === 'false') {
    return hasUnreads;
  }

  // If preference is 'true' or not set, always show
  return true;
};

/**
 * Helper to create preference object for closing group channel conversation
 */
export const createCloseGroupChannelPreference = (
  channelId: string,
  userId: string
): PreferenceType => {
  return {
    user_id: userId,
    category: 'group_channel_show',
    name: channelId,
    value: 'false'
  };
};

/**
 * Helper to create preference object for opening group channel conversation
 */
export const createOpenGroupChannelPreference = (
  channelId: string,
  userId: string
): PreferenceType => {
  return {
    user_id: userId,
    category: 'group_channel_show',
    name: channelId,
    value: 'true'
  };
};