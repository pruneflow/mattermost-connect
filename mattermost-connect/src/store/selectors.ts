import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import type { Channel, Team, User } from '../api/types';
import { getChannelDisplayName } from '../utils/channelUtils';

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
 * Get channels with unreads in current team (Pattern 2)
 */
export const selectChannelsWithUnreadsInCurrentTeam = createSelector(
  [
    selectChannelsInCurrentTeam,
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

/**
 * Get public channels in current team (Pattern 2)
 */
export const selectPublicChannelsInCurrentTeam = createSelector(
  [selectChannelsInCurrentTeam],
  (teamChannels) => teamChannels.filter(channel => channel.type === 'O')
);

/**
 * Get private channels in current team (Pattern 2)
 */
export const selectPrivateChannelsInCurrentTeam = createSelector(
  [selectChannelsInCurrentTeam],
  (teamChannels) => teamChannels.filter(channel => channel.type === 'P')
);

/**
 * Get direct channels in current team with computed display names (Pattern 2)
 * Following official Mattermost pattern with completeDirectChannelDisplayName
 */
export const selectDirectChannelsInCurrentTeam = createSelector(
  [selectChannelsInCurrentTeam, selectUsersState, selectCurrentUserId],
  (teamChannels, usersState, currentUserId) => {
    const directChannels = teamChannels.filter(channel => channel.type === 'D');
    
    return directChannels.map(channel => {
      if (!currentUserId) {
        return { ...channel, computedDisplayName: 'Direct Message', otherUser: null };
      }
      
      // Extract other user ID from channel name (official MM pattern)
      const userIds = channel.name.split('__');
      const otherUserId = userIds.find(id => id !== currentUserId);
      const otherUser = otherUserId ? usersState.profiles[otherUserId] : null;
      
      return {
        ...channel,
        computedDisplayName: getChannelDisplayName(channel, usersState.profiles, currentUserId),
        otherUser,
        otherUserId,
      };
    });
  }
);

/**
 * Get group channels in current team with computed display names (Pattern 2)
 */
export const selectGroupChannelsInCurrentTeam = createSelector(
  [selectChannelsInCurrentTeam, selectUsersState, selectCurrentUserId],
  (teamChannels, usersState, currentUserId) => {
    const groupChannels = teamChannels.filter(channel => channel.type === 'G');
    
    return groupChannels.map(channel => {
      const userIds = channel.name.split('__').filter(id => id !== 'G' && id !== '');
      const users = userIds.map(id => usersState.profiles[id]).filter(Boolean);
      
      return {
        ...channel,
        computedDisplayName: getChannelDisplayName(channel, usersState.profiles, currentUserId),
        users,
        userIds,
      };
    });
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
 * Get current channel object (memoized)
 * Performance benefit: Avoids lookup on every render
 */
export const selectCurrentChannel = createSelector(
  [selectChannelsState, selectCurrentChannelId],
  (channelsState, currentChannelId) => {
    return currentChannelId ? channelsState.channels[currentChannelId] : null;
  }
);

/**
 * Get channel by ID selector factory (memoized)
 * Usage: const selectChannel = selectChannelById(channelId)
 */
export const selectChannelById = (channelId: string | null) => createSelector(
  [selectChannelsState],
  (channelsState) => channelId ? channelsState.channels[channelId] : null
);

// ============================================================================
// PATTERN 3: FACTORY SELECTORS (dynamic parameters) - Exact Mattermost pattern  
// Usage: const getChannels = useMemo(() => makeSelectChannelsInTeam(), []); const channels = useAppSelector(state => getChannels(state, teamId));
// ============================================================================

// ============================================================================
// CURRENT TEAM SELECTORS (no parameters, safe for useAppSelector)
// ============================================================================

/**
 * Get channels in current team (safe selector - no recreation issues)
 */
export const selectChannelsForCurrentTeam = createSelector(
  [selectChannelsData, selectCurrentTeamId, (state: RootState) => state.entities.channels.channelsInTeam],
  (allChannels, currentTeamId, channelsInTeam) => {
    if (!currentTeamId) return [];
    const channelIds = channelsInTeam[currentTeamId] || [];
    return channelIds.map(id => allChannels[id]).filter(Boolean);
  }
);

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
 * Get channels with unreads in current team
 */
export const selectChannelsWithUnreadsForCurrentTeam = createSelector(
  [
    selectChannelsForCurrentTeam,
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
 * Check if channel has unreads (considering muted status) - Mattermost pattern
 */
export const selectChannelHasUnreads = (channelId: string) => createSelector(
  [
    (state: RootState) => state.entities.channels.unreads,
    (state: RootState) => state.entities.channels.myMembers
  ],
  (channelUnreads, channelMembers) => {
    const unread = channelUnreads[channelId];
    if (!unread) return false;
    
    const membership = channelMembers[channelId];
    const isMuted = membership?.notify_props?.mark_unread === 'mention';
    const unreadCount = isMuted ? 0 : unread.msg_count;
    const mentionCount = unread.mention_count;
    
    return unreadCount > 0 || mentionCount > 0;
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