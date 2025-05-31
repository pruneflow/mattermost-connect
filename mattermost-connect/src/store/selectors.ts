import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import type { Team, User } from '../api/types';

// ============================================================================
// BASE SELECTORS (non-memoized, simple accessors)
// ============================================================================

export const selectTeamsState = (state: RootState) => state.entities.teams;
export const selectUsersState = (state: RootState) => state.entities.users;
export const selectCurrentTeamId = (state: RootState) => state.entities.teams.currentTeamId;
export const selectCurrentUserId = (state: RootState) => state.entities.users.currentUserId;

// ============================================================================
// MEMOIZED TEAM SELECTORS
// ============================================================================

/**
 * Get teams as an array (internal selector)
 */
const selectTeamsArray = createSelector(
  [selectTeamsState],
  (teamsState) => Object.values(teamsState.teams)
);


/**
 * Get current team object (memoized)
 * Performance benefit: Avoids lookup on every render
 */
export const selectCurrentTeam = createSelector(
  [selectTeamsState, selectCurrentTeamId],
  (teamsState, currentTeamId) => {
    return currentTeamId ? teamsState.teams[currentTeamId] : null;
  }
);

/**
 * Get team by ID selector factory (memoized)
 * Usage: const selectTeam = selectTeamById(teamId)
 */
export const selectTeamById = (teamId: string | null) => createSelector(
  [selectTeamsState],
  (teamsState) => teamId ? teamsState.teams[teamId] : null
);

/**
 * Get teams unread statuses (exact Mattermost pattern)
 * Returns [unreadTeamsSet, mentionsInTeamMap] like official Mattermost
 */
export const getTeamsUnreadStatuses = createSelector(
  [
    (state: RootState) => state.entities.teams.unreads,
  ],
  (teamUnreads): [Set<string>, Map<string, number>] => {
    const teamUnreadsSet = new Set<string>();
    const teamMentionsMap = new Map<string, number>();

    // Iterate through team unreads (from /users/me/teams/unread API)
    for (const [teamId, unread] of Object.entries(teamUnreads)) {
      // Add team to unread set if it has unread messages
      if (unread.msg_count > 0) {
        teamUnreadsSet.add(teamId);
      }

      // Add mentions count
      if (unread.mention_count > 0) {
        teamMentionsMap.set(teamId, unread.mention_count);
      }
    }

    return [teamUnreadsSet, teamMentionsMap];
  }
);

/**
 * Get teams with unread data (main teams selector) - Mattermost pattern
 * Uses getTeamsUnreadStatuses for consistency with official Mattermost
 */
export const selectTeams = createSelector(
  [
    selectTeamsArray,
    selectCurrentTeamId,
    getTeamsUnreadStatuses
  ],
  (teams, currentTeamId, [unreadTeamsSet, mentionsInTeamMap]) => {
    return teams.map(team => {
      const hasUnreads = unreadTeamsSet.has(team.id);
      const mentionCount = mentionsInTeamMap.get(team.id) || 0;
      
      return {
        ...team,
        isActive: team.id === currentTeamId,
        hasUnreads,
        mentionCount,
      };
    });
  }
);

/**
 * Get teams filtered by search query (memoized)
 * Performance benefit: Expensive filtering only happens when teams or query changes
 */
export const selectTeamsByQuery = (searchQuery: string) => createSelector(
  [selectTeams],
  (teams) => {
    if (!searchQuery.trim()) return teams;
    
    const query = searchQuery.toLowerCase().trim();
    return teams.filter(team => 
      team.display_name.toLowerCase().includes(query) ||
      team.name.toLowerCase().includes(query) ||
      (team.description || '').toLowerCase().includes(query)
    );
  }
);



// ============================================================================
// MEMOIZED USER SELECTORS
// ============================================================================

/**
 * Get current user profile (memoized)
 * Performance benefit: Avoids lookup on every render
 */
export const selectCurrentUser = createSelector(
  [selectUsersState, selectCurrentUserId],
  (usersState, currentUserId) => {
    return currentUserId ? usersState.profiles[currentUserId] : null;
  }
);

/**
 * Get users as array (memoized)
 * Performance benefit: Avoids Object.values() recalculation
 */
export const selectUsersArray = createSelector(
  [selectUsersState],
  (usersState) => Object.values(usersState.profiles)
);

/**
 * Get user by ID selector factory (memoized)
 * Usage: const selectUser = selectUserById(userId)
 */
export const selectUserById = (userId: string | null) => createSelector(
  [selectUsersState],
  (usersState) => userId ? usersState.profiles[userId] : null
);

// ============================================================================
// UNREAD COUNTS SELECTORS
// ============================================================================

/**
 * Get channel unread count by ID (memoized)
 */
export const selectChannelUnreadCount = (channelId: string) => createSelector(
  [(state: RootState) => state.entities.channels.unreads],
  (channelUnreads) => channelUnreads[channelId]?.msg_count || 0
);

/**
 * Get channel mention count by ID (memoized)
 */
export const selectChannelMentionCount = (channelId: string) => createSelector(
  [(state: RootState) => state.entities.channels.unreads],
  (channelUnreads) => channelUnreads[channelId]?.mention_count || 0
);


/**
 * Check if channel is muted (memoized)
 */
export const selectIsChannelMuted = (channelId: string) => createSelector(
  [(state: RootState) => state.entities.channels.myMembers],
  (channelMembers) => {
    const membership = channelMembers[channelId];
    return membership?.notify_props?.mark_unread === 'mention';
  }
);

// ============================================================================
// COMBINED SELECTORS (most performance-critical)
// ============================================================================

/**
 * Get teams sorted by activity (memoized)
 * Performance benefit: Expensive sorting only on data change
 */
export const selectTeamsSortedByActivity = createSelector(
  [selectTeams],
  (teams) => {
    return [...teams].sort((a, b) => {
      // Active team first
      if (a.isActive) return -1;
      if (b.isActive) return 1;
      
      // Teams with mentions next
      if (a.mentionCount > 0 && b.mentionCount === 0) return -1;
      if (b.mentionCount > 0 && a.mentionCount === 0) return 1;
      
      // Teams with unreads next
      if (a.hasUnreads && !b.hasUnreads) return -1;
      if (b.hasUnreads && !a.hasUnreads) return 1;
      
      // Alphabetical for the rest
      return a.display_name.localeCompare(b.display_name);
    });
  }
);

// ============================================================================
// PERMISSIONS SELECTORS (for usePermissions optimization)
// ============================================================================

/**
 * Get current user roles (memoized)
 * Performance benefit: Avoids string parsing on every permission check
 */
export const selectCurrentUserRoles = createSelector(
  [selectCurrentUser],
  (currentUser) => {
    if (!currentUser?.roles) return [];
    return currentUser.roles.split(' ').filter(Boolean);
  }
);

/**
 * Check if current user is system admin (memoized)
 * Performance benefit: Avoids role checking on every render
 */
export const selectIsSystemAdmin = createSelector(
  [selectCurrentUserRoles],
  (roles) => roles.includes('system_admin')
);

/**
 * Get team member roles for current user (memoized)
 * Performance benefit: Avoids team member lookup on every permission check
 */
export const selectCurrentUserTeamRoles = (teamId: string) => createSelector(
  [selectTeamsState],
  (teamsState) => {
    const member = teamsState.myMembers[teamId];
    if (!member?.roles) return ['team_user'];
    return member.roles.split(' ').filter(Boolean);
  }
);