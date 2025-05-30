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
 * Get teams as an array (memoized)
 * Performance benefit: Avoids Object.values() recalculation on every render
 */
export const selectTeamsArray = createSelector(
  [selectTeamsState],
  (teamsState) => Object.values(teamsState.teams)
);

/**
 * Get teams with unread counts enriched (memoized)
 * Performance benefit: Combines teams and unreads data efficiently
 */
export const selectTeamsWithUnreads = createSelector(
  [selectTeamsState],
  (teamsState) => {
    const teams = Object.values(teamsState.teams);
    const unreads = teamsState.unreads;
    
    return teams.map(team => ({
      ...team,
      unreadCount: unreads[team.id]?.msg_count || 0,
      mentionCount: unreads[team.id]?.mention_count || 0,
    }));
  }
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
 * Get teams filtered by search query (memoized)
 * Performance benefit: Expensive filtering only happens when teams or query changes
 */
export const selectTeamsByQuery = (searchQuery: string) => createSelector(
  [selectTeamsArray],
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

/**
 * Get total unread count across all teams (memoized)
 * Performance benefit: Expensive calculation only on unreads change
 */
export const selectTotalUnreadCount = createSelector(
  [selectTeamsState],
  (teamsState) => {
    return Object.values(teamsState.unreads).reduce(
      (total, unread) => total + (unread.msg_count || 0),
      0
    );
  }
);

/**
 * Get total mention count across all teams (memoized)
 * Performance benefit: Expensive calculation only on unreads change
 */
export const selectTotalMentionCount = createSelector(
  [selectTeamsState],
  (teamsState) => {
    return Object.values(teamsState.unreads).reduce(
      (total, unread) => total + (unread.mention_count || 0),
      0
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
// COMBINED SELECTORS (most performance-critical)
// ============================================================================

/**
 * Get enriched team data for TeamList component (memoized)
 * Performance benefit: Combines multiple data sources efficiently
 * This is the most valuable selector for TeamList performance
 */
export const selectEnrichedTeams = createSelector(
  [selectTeamsArray, selectTeamsState, selectCurrentTeamId],
  (teams, teamsState, currentTeamId) => {
    const unreads = teamsState.unreads;
    
    return teams.map(team => ({
      ...team,
      isActive: team.id === currentTeamId,
      unreadCount: unreads[team.id]?.msg_count || 0,
      mentionCount: unreads[team.id]?.mention_count || 0,
      hasUnreads: (unreads[team.id]?.msg_count || 0) > 0,
      hasMentions: (unreads[team.id]?.mention_count || 0) > 0,
    }));
  }
);

/**
 * Get teams sorted by activity (memoized)
 * Performance benefit: Expensive sorting only on data change
 */
export const selectTeamsSortedByActivity = createSelector(
  [selectEnrichedTeams],
  (enrichedTeams) => {
    return [...enrichedTeams].sort((a, b) => {
      // Active team first
      if (a.isActive) return -1;
      if (b.isActive) return 1;
      
      // Teams with mentions next
      if (a.hasMentions && !b.hasMentions) return -1;
      if (b.hasMentions && !a.hasMentions) return 1;
      
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