// Import official Mattermost utils
import { displayUsername, getFullName } from 'mattermost-redux/utils/user_utils';
import { Client4 } from '../api/client';

// Re-export official functions directly
export { displayUsername, getFullName };

/**
 * Get profile image URL for a user (Mattermost pattern)
 * @param userId - The user ID
 * @param lastPictureUpdate - Optional timestamp to force refresh
 * @returns Profile image URL
 */
export const getProfileImageUrl = (userId: string, lastPictureUpdate?: number): string => {
  const baseUrl = `${Client4.getUrl()}/api/v4/users/${userId}/image`;
  return lastPictureUpdate ? `${baseUrl}?_=${lastPictureUpdate}` : baseUrl;
};