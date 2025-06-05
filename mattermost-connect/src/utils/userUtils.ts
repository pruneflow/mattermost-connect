// User utilities following Mattermost patterns
import { client } from '../api/client';
import type { UserProfile } from '../api/types';

// Mattermost-style display functions
export const getFullName = (user: UserProfile): string => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.first_name || user.last_name || '';
};

export const displayUsername = (
  user: UserProfile, 
  teammateNameDisplay: string = 'nickname_full_name',
  useFallbackUsername: boolean = true
): string => {
  const fullName = getFullName(user);
  
  switch (teammateNameDisplay) {
    case 'nickname_full_name':
      return user.nickname || fullName || (useFallbackUsername ? user.username : '');
    case 'full_name':
      return fullName || (useFallbackUsername ? user.username : '');
    case 'username':
    default:
      return user.username;
  }
};

/**
 * Get profile image URL for a user (Mattermost pattern)
 * @param userId - The user ID
 * @param lastPictureUpdate - Optional timestamp to force refresh
 * @returns Profile image URL
 */
export const getProfileImageUrl = (userId: string, lastPictureUpdate?: number): string => {
  const baseUrl = `${client.getUrl()}/api/v4/users/${userId}/image`;
  return lastPictureUpdate ? `${baseUrl}?_=${lastPictureUpdate}` : baseUrl;
};