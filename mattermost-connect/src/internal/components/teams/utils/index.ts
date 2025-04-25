// src/internal/components/teams/utils/index.ts

import { stringToColor, Team } from "../../../../index";
import { getInitials } from "../../../utils/helper";

/**
 * Formats a team name, optionally truncating to a maximum length
 *
 * @param name - The name to format
 * @param maxLength - Maximum length before truncating (0 for no limit)
 * @returns Formatted team name
 */
export const formatTeamName = (name: string, maxLength: number = 0): string => {
  if (!maxLength || name.length <= maxLength) {
    return name;
  }
  return `${name.substring(0, maxLength)}...`;
};

/**
 * Generates a team avatar color from the team name
 *
 * @param team - The team object
 * @returns Color string for team avatar
 */
export const getTeamAvatarColor = (team: Team): string => {
  return stringToColor(team.name || team.display_name);
};

/**
 * Gets team initials for avatar display
 *
 * @param team - The team object
 * @returns Initials string for team avatar
 */
export const getTeamInitials = (team: Team): string => {
  return getInitials(team.display_name);
};

/**
 * Determines if a team has unread notifications
 *
 * @param team - The team object
 * @param unreadCounts - Record of unread counts by team ID
 * @returns Boolean indicating if team has unread messages
 */
export const hasUnreadMessages = (
  team: Team,
  unreadCounts?: Record<string, { messageCount: number; mentionCount: number }>,
): boolean => {
  if (!unreadCounts || !unreadCounts[team.id]) return false;
  return unreadCounts[team.id].messageCount > 0;
};

/**
 * Determines if a team has unread mentions
 *
 * @param team - The team object
 * @param unreadCounts - Record of unread counts by team ID
 * @returns Boolean indicating if team has unread mentions
 */
export const hasUnreadMentions = (
  team: Team,
  unreadCounts?: Record<string, { messageCount: number; mentionCount: number }>,
): boolean => {
  if (!unreadCounts || !unreadCounts[team.id]) return false;
  return unreadCounts[team.id].mentionCount > 0;
};

/**
 * Gets unread counts for a team
 *
 * @param team - The team object
 * @param unreadCounts - Record of unread counts by team ID
 * @returns Object with message and mention counts
 */
export const getTeamUnreadCounts = (
  team: Team,
  unreadCounts?: Record<string, { messageCount: number; mentionCount: number }>,
): { messageCount: number; mentionCount: number } => {
  if (!unreadCounts || !unreadCounts[team.id]) {
    return { messageCount: 0, mentionCount: 0 };
  }
  return unreadCounts[team.id];
};
