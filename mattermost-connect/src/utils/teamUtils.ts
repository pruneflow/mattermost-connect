// src/utils/teamUtils.ts
/**
 * Team utility functions
 * Provides reusable functions for team operations
 */
import { Team, TeamType } from "../types";
import { formatUnreadCount } from "./formatters";
import { stringToColor } from "./mattermostUtils";

/**
 * Formats a team name, optionally truncating to a maximum length
 *
 * @param name - The name to format
 * @param maxLength - Maximum length before truncating (0 for no limit)
 * @returns Formatted team name
 */
export function formatTeamName(name: string, maxLength: number = 0): string {
  if (!maxLength || name.length <= maxLength) {
    return name;
  }
  return `${name.substring(0, maxLength)}...`;
}

/**
 * Sanitizes a display name to create a valid team name/URL
 *
 * @param displayName - Display name to sanitize
 * @returns Valid team name
 */
export function sanitizeTeamName(displayName: string): string {
  if (!displayName) return "";

  // Convert to lowercase
  let name = displayName.toLowerCase();

  // Replace spaces and special characters with hyphens
  name = name.replace(/[^a-z0-9]/g, "-");

  // Remove consecutive hyphens
  name = name.replace(/-+/g, "-");

  // Remove leading and trailing hyphens
  name = name.replace(/^-+|-+$/g, "");

  // If name is empty or doesn't start with a letter, prefix with 't'
  if (!name || !/^[a-z]/.test(name)) {
    name = "t-" + name;
  }

  return name;
}

/**
 * Validates a team name against naming requirements
 *
 * @param name - Team name to validate
 * @returns Whether the name is valid
 */
export function validateTeamName(name: string): boolean {
  if (!name) return false;

  // Must start with a letter
  if (!/^[a-z]/.test(name)) return false;

  // Must only contain lowercase letters, numbers and hyphens
  if (!/^[a-z0-9-]+$/.test(name)) return false;

  // Cannot end with a hyphen
  if (/-$/.test(name)) return false;

  // Cannot be too short
  if (name.length < 2) return false;

  // Cannot be too long
  if (name.length > 64) return false;

  return true;
}

/**
 * Gets team initials for avatar display
 *
 * @param team - The team object
 * @returns Initials string for team avatar
 */
export function getTeamInitials(team: Team): string {
  if (!team.display_name) return "?";

  const parts = team.display_name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Determines if a team has unread notifications
 *
 * @param team - The team object
 * @param unreadCounts - Record of unread counts by team ID
 * @returns Boolean indicating if team has unread messages
 */
export function hasUnreadMessages(
  team: Team,
  unreadCounts?: Record<string, { msg_count: number; mention_count: number }>,
): boolean {
  if (!unreadCounts || !unreadCounts[team.id]) return false;
  return unreadCounts[team.id].msg_count > 0;
}

/**
 * Determines if a team has unread mentions
 *
 * @param team - The team object
 * @param unreadCounts - Record of unread counts by team ID
 * @returns Boolean indicating if team has unread mentions
 */
export function hasUnreadMentions(
  team: Team,
  unreadCounts?: Record<string, { msg_count: number; mention_count: number }>,
): boolean {
  if (!unreadCounts || !unreadCounts[team.id]) return false;
  return unreadCounts[team.id].mention_count > 0;
}

/**
 * Gets formatted unread counts for a team
 *
 * @param team - The team object
 * @param unreadCounts - Record of unread counts by team ID
 * @param maxDisplayCount - Maximum count to display before showing "+"
 * @returns Formatted message and mention counts
 */
export function getFormattedUnreadCounts(
  team: Team,
  unreadCounts?: Record<string, { msg_count: number; mention_count: number }>,
  maxDisplayCount: number = 99,
): {
  messageCount: string;
  mentionCount: string;
  hasUnreads: boolean;
  hasMentions: boolean;
} {
  if (!unreadCounts || !unreadCounts[team.id]) {
    return {
      messageCount: "",
      mentionCount: "",
      hasUnreads: false,
      hasMentions: false,
    };
  }

  const { msg_count, mention_count } = unreadCounts[team.id];

  return {
    messageCount: formatUnreadCount(msg_count, maxDisplayCount),
    mentionCount: formatUnreadCount(mention_count, maxDisplayCount),
    hasUnreads: msg_count > 0,
    hasMentions: mention_count > 0,
  };
}

/**
 * Formats a team object for display
 *
 * @param team - Raw team data
 * @param memberCount - Number of team members (optional)
 * @returns Formatted team data for display
 */
export function formatTeamForDisplay(
  team: Team,
  memberCount?: number | null,
): {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: TeamType;
  isOpen: boolean;
  memberCount: number | null;
  url: string;
  color: string;
} {
  return {
    id: team.id,
    name: team.name,
    displayName: team.display_name,
    description: team.description || "",
    type: team.type,
    isOpen: team.type === "O",
    memberCount: memberCount || null,
    url: `/${team.name}`,
    color: stringToColor(team.name),
  };
}
