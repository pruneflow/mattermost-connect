import type { UserProfile } from '../api/types';

/**
 * Filter users based on search term matching username, names, nickname, and email
 * @param users Array of user profiles to filter
 * @param searchTerm Search term to match against
 * @returns Filtered array of users that match the search term
 */
export const filterUsersBySearchTerm = (users: UserProfile[], searchTerm: string): UserProfile[] => {
  if (!searchTerm || searchTerm.length < 2) {
    return users;
  }

  const normalizedSearchTerm = searchTerm.toLowerCase();
  
  return users.filter(user => 
    user.username?.toLowerCase().includes(normalizedSearchTerm) ||
    user.first_name?.toLowerCase().includes(normalizedSearchTerm) ||
    user.last_name?.toLowerCase().includes(normalizedSearchTerm) ||
    user.nickname?.toLowerCase().includes(normalizedSearchTerm) ||
    user.email?.toLowerCase().includes(normalizedSearchTerm)
  );
};

/**
 * Check if a user matches a search term
 * @param user User profile to check
 * @param searchTerm Search term to match against
 * @returns True if user matches the search term
 */
export const userMatchesSearchTerm = (user: UserProfile, searchTerm: string): boolean => {
  if (!searchTerm || searchTerm.length < 2) {
    return true;
  }

  const normalizedSearchTerm = searchTerm.toLowerCase();
  
  return !!(
    user.username?.toLowerCase().includes(normalizedSearchTerm) ||
    user.first_name?.toLowerCase().includes(normalizedSearchTerm) ||
    user.last_name?.toLowerCase().includes(normalizedSearchTerm) ||
    user.nickname?.toLowerCase().includes(normalizedSearchTerm) ||
    user.email?.toLowerCase().includes(normalizedSearchTerm)
  );
};