import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import type { Channel, UserProfile } from '../api/types';
import { getChannelDisplayName } from '../utils/channelUtils';

// Extended channel type with enriched data
export interface EnrichedChannel extends Channel {
  isActive: boolean;
  hasUnreads: boolean;
  unreadCount: number;
  mentionCount: number;
  isMuted: boolean;
  computedDisplayName?: string;
  otherUser?: UserProfile | null;
  otherUserId?: string;
  users?: UserProfile[];
  userIds?: string[];
}

// ============================================================================
// PATTERN 1: BASE SELECTORS (non-memoized, simple accessors) - Mattermost pattern
// Usage: const data = useAppSelector(selectChannelsData);
// ============================================================================

export const selectTeamsState = (state: RootState) => state.entities.teams;
export const selectUsersState = (state: RootState) => state.entities.users;
export const selectCurrentTeamId = (state: RootState) => state.entities.teams.currentTeamId;
export const selectCurrentUserId = (state: RootState) => state.entities.users.currentUserId;

// Channels state selectors (Pattern 1)
export const selectChannelsState = (state: RootState) => state.entities.channels;
export const selectCurrentChannelId = (state: RootState) => state.entities.channels.currentChannelId;
export const selectChannelsData = (state: RootState) => state.entities.channels.channels;
export const selectChannelUnreads = (state: RootState) => state.entities.channels.unreads;
export const selectChannelMembers = (state: RootState) => state.entities.channels.myMembers;

// ============================================================================
// MEMOIZED TEAM SELECTORS
// ============================================================================

/**
 * Get teams as an array (memoized) - Following Mattermost pattern
 */
export const selectTeams = createSelector(
  [selectTeamsState],
  (teamsState) => Object.values(teamsState.teams)
);

/**
 * Get teams as an object/dictionary (memoized)
 * Performance benefit: Avoids creating new object reference on every render
 */
export const selectTeamsById = createSelector(
  [selectTeamsState],
  (teamsState) => teamsState.teams
);

// ============================================================================
// PATTERN 2: CURRENT TEAM/CHANNEL SELECTORS (like Mattermost getChannelsInCurrentTeam)
// ============================================================================

/**
 * Get channels in current team (Pattern 2) - Exact Mattermost pattern
 * Like getChannelsInCurrentTeam but for any current context
 */
export const selectChannelsInCurrentTeam = createSelector(
  [selectChannelsData, selectCurrentTeamId, (state: RootState) => state.entities.channels.channelsInTeam],
  (allChannels, currentTeamId, channelsInTeam) => {
    if (!currentTeamId) return [];
    const channelIds = channelsInTeam[currentTeamId] || [];
    return channelIds.map(id => allChannels[id]).filter(Boolean);
  }
);

/**
 * Get channels in current team with ALL data: unreads, user names, display names, etc.
 * This is the single source of truth for complete channel data
 */
export const selectChannelsForCurrentTeam = createSelector(
  [
    selectChannelsInCurrentTeam,
    (state: RootState) => state.entities.channels.unreads,
    (state: RootState) => state.entities.channels.myMembers,
    selectCurrentChannelId,
    selectUsersState,
    selectCurrentUserId
  ],
  (teamChannels, channelUnreads, channelMembers, currentChannelId, usersState, currentUserId): EnrichedChannel[] => {
    return teamChannels.map(channel => {
      // Unread data from single source of truth: channels.unreads
      const membership = channelMembers[channel.id];
      const isMuted = membership?.notify_props?.mark_unread === 'mention';
      const unread = channelUnreads[channel.id];
      
      const unreadCount = isMuted ? 0 : (unread?.msg_count || 0);
      const mentionCount = unread?.mention_count || 0;
      const hasUnreads = unreadCount > 0 || mentionCount > 0;

      // Compute display name and user data for direct/group channels
      let computedDisplayName = channel.display_name;
      let otherUser: UserProfile | null = null;
      let otherUserId: string | undefined = undefined;
      let users: UserProfile[] = [];
      let userIds: string[] = [];

      if (channel.type === 'D' && currentUserId) {
        // Direct channel - extract other user
        const channelUserIds = channel.name.split('__');
        otherUserId = channelUserIds.find(id => id !== currentUserId);
        otherUser = otherUserId ? usersState.profiles[otherUserId] : null;
        computedDisplayName = getChannelDisplayName(channel, usersState.profiles, currentUserId);
      } else if (channel.type === 'G' && currentUserId) {
        // Group channel - extract all users except current
        userIds = channel.name.split('__').filter(id => id !== 'G' && id !== '' && id !== currentUserId);
        users = userIds.map(id => usersState.profiles[id]).filter(Boolean);
        computedDisplayName = getChannelDisplayName(channel, usersState.profiles, currentUserId);
      }
      
      return {
        ...channel,
        // Unread data
        isActive: channel.id === currentChannelId,
        hasUnreads,
        unreadCount,
        mentionCount,
        isMuted,
        // Display name and user data
        computedDisplayName,
        otherUser,
        otherUserId,
        users,
        userIds,
      } as EnrichedChannel;
    });
  }
);

/**
 * Get public channels in current team with all data (unreads, etc.)
 */
export const selectPublicChannelsInCurrentTeam = createSelector(
  [selectChannelsForCurrentTeam],
  (allChannels): EnrichedChannel[] => allChannels.filter(channel => channel.type === 'O')
);

/**
 * Get private channels in current team with all data (unreads, etc.)
 */
export const selectPrivateChannelsInCurrentTeam = createSelector(
  [selectChannelsForCurrentTeam],
  (allChannels): EnrichedChannel[] => allChannels.filter(channel => channel.type === 'P')
);

/**
 * Get direct channels in current team with all data (unreads, user names, etc.)
 */
export const selectDirectChannelsInCurrentTeam = createSelector(
  [selectChannelsForCurrentTeam],
  (allChannels): EnrichedChannel[] => allChannels.filter(channel => channel.type === 'D')
);

/**
 * Get group channels in current team with all data (unreads, user names, etc.)
 */
export const selectGroupChannelsInCurrentTeam = createSelector(
  [selectChannelsForCurrentTeam],
  (allChannels): EnrichedChannel[] => allChannels.filter(channel => channel.type === 'G')
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
 * Get teams with unread data (derived selector) - Mattermost pattern
 * Uses getTeamsUnreadStatuses for consistency with official Mattermost
 */
export const selectTeamsWithUnreads = createSelector(
  [
    selectTeams,
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
// CHANNELS SELECTORS (continued from Pattern 1)
// ============================================================================

/**
 * Get channels as array (internal selector)
 */
const selectChannelsArray = createSelector(
  [selectChannelsState],
  (channelsState) => Object.values(channelsState.channels)
);

/**
 * Get current channel with all enriched data (memoized)
 * Performance benefit: Avoids lookup on every render
 */
export const selectCurrentChannel = createSelector(
  [selectChannelsForCurrentTeam, selectCurrentChannelId],
  (channels, currentChannelId): EnrichedChannel | null => {
    if (!currentChannelId) return null;
    return channels.find(channel => channel.id === currentChannelId) || null;
  }
);


// ============================================================================
// PATTERN 3: FACTORY SELECTORS (dynamic parameters) - Exact Mattermost pattern  
// Usage: const getChannels = useMemo(() => makeSelectChannelsInTeam(), []); const channels = useAppSelector(state => getChannels(state, teamId));
// ============================================================================

// ============================================================================
// CURRENT TEAM SELECTORS (no parameters, safe for useAppSelector)
// ============================================================================


/**
 * Get public channels in current team
 */
export const selectPublicChannelsForCurrentTeam = createSelector(
  [selectChannelsForCurrentTeam],
  (teamChannels) => teamChannels.filter(channel => channel.type === 'O')
);

/**
 * Get private channels in current team
 */
export const selectPrivateChannelsForCurrentTeam = createSelector(
  [selectChannelsForCurrentTeam],
  (teamChannels) => teamChannels.filter(channel => channel.type === 'P')
);


/**
 * Get channels for team (factory pattern) - Exact Mattermost pattern
 * Usage: const getChannelsInTeam = makeSelectChannelsInTeam(); const channels = useSelector(state => getChannelsInTeam(state, teamId));
 */
export const makeSelectChannelsInTeam = () => createSelector(
  [
    selectChannelsState,
    (state: RootState, teamId: string) => teamId
  ],
  (channelsState, teamId) => {
    const channelIds = channelsState.channelsInTeam[teamId] || [];
    return channelIds.map(id => channelsState.channels[id]).filter(Boolean);
  }
);

/**
 * Get direct message channels (memoized)
 * Following Mattermost pattern
 */
export const selectDirectChannels = createSelector(
  [selectChannelsArray],
  (channels) => channels.filter(channel => channel.type === 'D')
);

/**
 * Get group message channels (memoized)
 */
export const selectGroupChannels = createSelector(
  [selectChannelsArray],
  (channels) => channels.filter(channel => channel.type === 'G')
);

/**
 * Get public channels for team (factory pattern)
 */
export const makeSelectPublicChannelsInTeam = () => {
  const getChannelsInTeam = makeSelectChannelsInTeam();
  return createSelector(
    [getChannelsInTeam],
    (teamChannels) => teamChannels.filter(channel => channel.type === 'O')
  );
};

/**
 * Get private channels for team (factory pattern)
 */
export const makeSelectPrivateChannelsInTeam = () => {
  const getChannelsInTeam = makeSelectChannelsInTeam();
  return createSelector(
    [getChannelsInTeam],
    (teamChannels) => teamChannels.filter(channel => channel.type === 'P')
  );
};

/**
 * Get my channel member by ID (memoized)
 */
export const selectMyChannelMember = (channelId: string) => createSelector(
  [selectChannelsState],
  (channelsState) => channelsState.myMembers[channelId] || null
);

// ============================================================================
// UNREAD COUNTS SELECTORS
// ============================================================================

/**
 * Get channel by ID with all data (unreads, user names, etc.)
 */
export const selectChannelById = (channelId: string) => createSelector(
  [selectChannelsForCurrentTeam],
  (channels): EnrichedChannel | null => {
    return channels.find(channel => channel.id === channelId) || null;
  }
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

/**
 * Get channels with unread data for team (factory pattern)
 * Following Mattermost patterns for sidebar display
 */
export const makeSelectChannelsWithUnreads = () => {
  const getChannelsInTeam = makeSelectChannelsInTeam();
  return createSelector(
    [
      getChannelsInTeam,
      (state: RootState) => state.entities.channels.unreads,
      (state: RootState) => state.entities.channels.myMembers,
      selectCurrentChannelId
    ],
    (teamChannels, channelUnreads, channelMembers, currentChannelId) => {
      return teamChannels.map(channel => {
        const unread = channelUnreads[channel.id];
        const membership = channelMembers[channel.id];
        const isMuted = membership?.notify_props?.mark_unread === 'mention';
        
        const unreadCount = isMuted ? 0 : (unread?.msg_count || 0);
        const mentionCount = unread?.mention_count || 0;
        const hasUnreads = unreadCount > 0 || mentionCount > 0;
        
        return {
          ...channel,
          isActive: channel.id === currentChannelId,
          hasUnreads,
          unreadCount,
          mentionCount,
          isMuted,
        };
      });
    }
  );
};

/**
 * Get channels sorted by Mattermost sidebar order (factory pattern)
 * Performance benefit: Expensive sorting only on data change
 */
export const makeSelectChannelsSortedBySidebar = () => {
  const getChannelsWithUnreads = makeSelectChannelsWithUnreads();
  return createSelector(
    [getChannelsWithUnreads],
    (channels) => {
      return [...channels].sort((a, b) => {
        // Active channel first
        if (a.isActive) return -1;
        if (b.isActive) return 1;
        
        // Channels with mentions next
        if (a.mentionCount > 0 && b.mentionCount === 0) return -1;
        if (b.mentionCount > 0 && a.mentionCount === 0) return 1;
        
        // Channels with unreads next
        if (a.hasUnreads && !b.hasUnreads) return -1;
        if (b.hasUnreads && !a.hasUnreads) return 1;
        
        // Alphabetical for the rest
        return a.display_name.localeCompare(b.display_name);
      });
    }
  );
};

// ============================================================================
// WEBSOCKET & TYPING EVENTS SELECTORS
// ============================================================================

export const selectWebSocketState = (state: RootState) => state.websocket;
export const selectWebSocketStatus = (state: RootState) => state.websocket?.status || 'disconnected';

// ============================================================================
// AUTH & VIEWS SELECTORS
// ============================================================================

/**
 * Get auth state fields (individual selectors)
 */
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthToken = (state: RootState) => state.auth.token;
export const selectServerUrl = (state: RootState) => state.auth.serverUrl;

/**
 * Get auth views state fields (individual selectors)
 */
export const selectIsLoggingIn = (state: RootState) => state.views.auth.isLoggingIn;
export const selectLoginError = (state: RootState) => state.views.auth.loginError;

/**
 * Get all typing events (memoized)
 */
export const selectTypingEvents = createSelector(
  [selectWebSocketState],
  (websocketState) => websocketState.typingEvents
);

/**
 * Get typing events for specific channel (memoized)
 * Performance benefit: Avoids filtering on every render
 */
export const selectTypingEventsForChannel = (channelId: string) => createSelector(
  [selectTypingEvents],
  (typingEvents) => typingEvents.filter(event => event.channel_id === channelId)
);

/**
 * Check if anyone is typing in channel (memoized)
 */
export const selectIsAnyoneTypingInChannel = (channelId: string) => createSelector(
  [selectTypingEventsForChannel(channelId)],
  (channelTypingEvents) => channelTypingEvents.length > 0
);

/**
 * Get typing users for channel (memoized)
 * Performance benefit: Avoids Set creation and filtering on every render
 */
export const selectTypingUsersInChannel = (channelId: string) => createSelector(
  [selectTypingEventsForChannel(channelId)],
  (channelTypingEvents) => {
    const uniqueUsernames = Array.from(
      new Set(channelTypingEvents.map(event => event.username))
    );
    return uniqueUsernames.filter(username => username !== 'Someone');
  }
);

// ============================================================================
// ADDITIONAL SELECTORS FOR HOOKS (to avoid inline selectors)
// ============================================================================

// Users state selectors
export const selectUserStatuses = (state: RootState) => state.entities.users.statuses;
export const selectUserProfiles = (state: RootState) => state.entities.users.profiles;

// WebSocket status selector
export const selectWebSocketConnectionStatus = (state: RootState) => state.websocket.status;

// Loading state selector
export const selectLoadingState = (state: RootState) => state.loading;

// (Moved to Pattern 1 section above)

// Team members selector
export const selectTeamMembers = (state: RootState) => state.entities.teams.myMembers;

// Navigation state selectors
export const selectCurrentUrl = (state: RootState) => state.views.navigation.currentUrl;
export const selectPreviousUrl = (state: RootState) => state.views.navigation.previousUrl;
export const selectLastVisitedChannels = (state: RootState) => state.views.navigation.lastVisitedChannels;
export const selectIsNavigating = (state: RootState) => state.views.navigation.isNavigating;

// UI layout selectors
export const selectIsMobile = (state: RootState) => state.views.ui.isMobile;
export const selectSidebarWidth = (state: RootState) => state.views.ui.sidebarWidth;

/**
 * Get typing message for channel (memoized)
 * Following Mattermost pattern for typing indicators
 */
export const selectTypingMessageForChannel = (channelId: string) => createSelector(
  [selectTypingUsersInChannel(channelId)],
  (typingUsers) => {
    if (typingUsers.length === 0) return '';
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    return 'Several people are typing...';
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
  [selectTeamsWithUnreads],
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