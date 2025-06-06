import type { Channel, UserProfile } from '../api/types';
import { displayUsername } from './userUtils';
import type { EnrichedChannel } from '../store/selectors';

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
 * Extract user IDs from a group channel name
 */
export const getUserIdsFromGroupChannel = (channel: Channel): string[] => {
  if (channel.type === 'G' || channel.type === 'D') {
    let channelName = channel.name;
    if (channelName.startsWith('G__')) {
      channelName = channelName.substring(3);
    }
    
    const userIds = channelName.split('__').filter((id) => {
      return (
        id !== '' &&
        id !== 'me' &&
        id !== 'G' &&
        id !== 'group' &&
        !id.startsWith('uid')
      );
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
 * Format group channel display name
 */
export const getGroupChannelDisplayName = (
  users: (UserProfile | null | undefined)[],
  fallback = 'Group Message'
): string => {
  if (!users || users.length === 0) {
    return fallback;
  }
  
  const userNames = users
    .filter((user) => !!user)
    .map((user) => displayUsername(user!, 'full_name', true))
    .filter((name) => !!name);
  
  if (userNames.length === 0) {
    return fallback;
  }
  
  if (userNames.length > 3) {
    return `${userNames.slice(0, 3).join(', ')} +${userNames.length - 3}`;
  }
  
  return userNames.join(', ');
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
    const userIds = getUserIdsFromGroupChannel(channel);
    const users = userIds.map(id => userProfiles[id]);
    return getGroupChannelDisplayName(users);
  }
  
  return channel.display_name || channel.name;
};

/**
 * Select best channel based on rules when no lastVisited channel
 * Rules: If current is direct/group, keep it. Otherwise: Public > Private > Direct > Group
 */
export const selectChannelByRules = (
  currentChannelId: string | null,
  allChannels: EnrichedChannel[]
): string | null => {
  if (allChannels.length === 0) return null;

  // Rule: If current channel is direct or group, keep it (they're global)
  if (currentChannelId) {
    const currentChannel = allChannels.find(ch => ch.id === currentChannelId);
    if (currentChannel && (currentChannel.type === 'D' || currentChannel.type === 'G')) {
      return currentChannelId; // Keep direct/group channels
    }
  }

  // Priority: Public > Private > Direct > Group
  const publicChannels = allChannels.filter(ch => ch.type === 'O');
  if (publicChannels.length > 0) {
    return publicChannels[0].id;
  }

  const privateChannels = allChannels.filter(ch => ch.type === 'P');
  if (privateChannels.length > 0) {
    return privateChannels[0].id;
  }

  const directChannels = allChannels.filter(ch => ch.type === 'D');
  if (directChannels.length > 0) {
    return directChannels[0].id;
  }

  const groupChannels = allChannels.filter(ch => ch.type === 'G');
  if (groupChannels.length > 0) {
    return groupChannels[0].id;
  }

  return null;
};