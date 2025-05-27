import ColorHash from 'color-hash';
import type { Team } from '../api/types';

// Default color hash instance (same as Mattermost)
const defaultColorHash = new ColorHash();

/**
 * Generate team initials from team name
 */
export const getTeamInitials = (team: Team): string => {
  if (!team.display_name) return '?';

  const words = team.display_name.split(' ');
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

/**
 * Generate consistent color based on team name
 * Uses same color-hash library as Mattermost
 */
export const getTeamColor = (teamName: string): string => {
  return defaultColorHash.hex(teamName);
};

/**
 * Filter teams by search term
 */
export const filterTeams = (teams: Team[], searchTerm: string): Team[] => {
  if (!searchTerm) return teams;

  const term = searchTerm.toLowerCase();
  return teams.filter(
    (team) =>
      team.display_name.toLowerCase().includes(term) ||
      team.name.toLowerCase().includes(term),
  );
};