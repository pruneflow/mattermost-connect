// User utilities following Mattermost patterns
import { client } from '../api/client';
import type { UserProfile, TeamMember } from '../api/types';

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
    case 'full_name_nickname':
      return fullName || user.nickname || (useFallbackUsername ? user.username : '');
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

// ============================================================================
// USER ROLE UTILITIES
// ============================================================================

/**
 * Check if user is a system admin
 */
export const isSystemAdmin = (user: UserProfile): boolean => {
  return user.roles?.includes('system_admin') ?? false;
};

/**
 * Get team member roles for a user
 */
export const getTeamMemberRoles = (user: UserProfile, teamMembers: Record<string, TeamMember>): string => {
  const teamMember = teamMembers[user.id];
  return teamMember?.roles || 'team_user';
};

/**
 * Check if user is a team admin
 */
export const isTeamAdmin = (user: UserProfile, teamMembers: Record<string, TeamMember>): boolean => {
  return getTeamMemberRoles(user, teamMembers).includes('team_admin');
};

/**
 * Check if user is a bot
 */
export const isBot = (user: UserProfile): boolean => {
  return user.props?.is_bot === 'true';
};

/**
 * Check if user's role can be changed
 */
export const canChangeRole = (
  user: UserProfile, 
  teamMembers: Record<string, TeamMember>, 
  currentUserId: string, 
  canManage: boolean
): boolean => {
  // Bots cannot have their roles changed
  if (isBot(user)) return false;
  // System admins cannot have their roles changed by team admins
  if (isSystemAdmin(user)) return false;
  // Current user cannot change their own role
  if (user.id === currentUserId) return false;
  // Must have team management permissions
  return canManage;
};

// ============================================================================
// ROLE CHIPS UTILITIES
// ============================================================================

export interface RoleChip {
  label: string;
  color: 'warning' | 'error' | 'primary' | 'default';
  variant: 'filled' | 'outlined';
}

/**
 * Get role chips for a user with proper colors and variants
 */
export const getRoleChips = (user: UserProfile, teamMembers: Record<string, TeamMember>): RoleChip[] => {
  const chips: RoleChip[] = [];
  
  // Bot chip (orange)
  if (isBot(user)) {
    chips.push({
      label: 'Bot',
      color: 'warning',
      variant: 'filled',
    });
  }
  
  // Role chips
  if (isSystemAdmin(user)) {
    chips.push({
      label: 'System Admin',
      color: 'error', // red for system admin
      variant: 'filled',
    });
  } else if (isTeamAdmin(user, teamMembers)) {
    chips.push({
      label: 'Team Admin',
      color: 'primary', // blue for team admin
      variant: 'filled',
    });
  } else {
    chips.push({
      label: 'Member',
      color: 'default', // gray for regular member
      variant: 'outlined',
    });
  }
  
  return chips;
};