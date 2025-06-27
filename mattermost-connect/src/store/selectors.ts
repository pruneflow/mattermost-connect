import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "./index";
import type { Channel, UserProfile } from "../api/types";
import { getChannelDisplayName } from "../utils/channelUtils";

// Extended channel type with enriched data
export interface EnrichedChannel extends Channel {
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
// non-memoized, simple accessors - Mattermost pattern
// Usage: const data = useAppSelector(selectChannelsData);
// ============================================================================

// Individual property selectors instead of broad state objects
export const selectCurrentTeamId = (state: RootState) =>
  state.entities.teams.currentTeamId;
export const selectCurrentUserId = (state: RootState) =>
  state.entities.users.currentUserId;

// Channels state selectors (Pattern 1)
export const selectCurrentChannelId = (state: RootState) =>
  state.entities.channels.currentChannelId;
export const selectChannelsData = (state: RootState) =>
  state.entities.channels.channels;

// ============================================================================
// MEMOIZED TEAM SELECTORS
// ============================================================================

/**
 * Get teams as an array (memoized) - Following Mattermost pattern
 */
export const selectTeams = createSelector(
  [(state: RootState) => state.entities.teams.teams], 
  (teamsById) => Object.values(teamsById),
);

/**
 * Get teams as an object/dictionary (direct selector)
 * Since this returns the state property directly, no memoization needed
 */
export const selectTeamsById = (state: RootState) => state.entities.teams.teams;

// Create stable empty arrays to avoid unnecessary re-renders
const EMPTY_CHANNELS_ARRAY = [] as const;
const EMPTY_CHANNEL_IDS = [] as const;

// Create stable empty objects to avoid unnecessary re-renders
const EMPTY_UNREAD_DATA = { msg_count: 0, mention_count: 0 } as const;

/**
 * Get channels in current team - Exact Mattermost pattern
 * Like getChannelsInCurrentTeam but for any current context
 */
export const selectChannelsInCurrentTeam = createSelector(
  [
    selectChannelsData,
    selectCurrentTeamId,
    (state: RootState) => state.entities.channels.channelsInTeam,
  ],
  (allChannels, currentTeamId, channelsInTeam) => {
    if (!currentTeamId) return EMPTY_CHANNELS_ARRAY;
    const channelIds = channelsInTeam[currentTeamId] || EMPTY_CHANNEL_IDS;
    return channelIds.map((id) => allChannels[id]).filter(Boolean);
  },
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
    (state: RootState) => state.entities.users.profiles,
    selectCurrentUserId,
  ],
  (
    teamChannels,
    channelUnreads,
    channelMembers,
    currentChannelId,
    userProfiles,
    currentUserId,
  ): EnrichedChannel[] => {
    return teamChannels.map((channel) => {
      // Unread data from single source of truth: channels.unreads
      const membership = channelMembers[channel.id];
      const isMuted = membership?.notify_props?.mark_unread === "mention";
      const unread = channelUnreads[channel.id];

      let unreadCount: number;
      let mentionCount: number;

      if (channel.type === "D") {
        // Direct Messages: all unreads are considered mentions (Mattermost pattern)
        unreadCount = 0;
        mentionCount = isMuted ? 0 : unread?.msg_count || 0;
      } else {
        // Team channels: separate unreads and mentions
        unreadCount = isMuted ? 0 : unread?.msg_count || 0;
        mentionCount = unread?.mention_count || 0;
      }

      const hasUnreads = unreadCount > 0 || mentionCount > 0;

      // Compute display name and user data for direct/group channels
      let computedDisplayName = channel.display_name;
      let otherUser: UserProfile | null = null;
      let otherUserId: string | undefined = undefined;
      let users: UserProfile[] = [];
      let userIds: string[] = [];

      if (channel.type === "D" && currentUserId) {
        // Direct channel - extract other user
        const channelUserIds = channel.name.split("__");
        otherUserId = channelUserIds.find((id) => id !== currentUserId);
        otherUser = otherUserId ? userProfiles[otherUserId] : null;
        computedDisplayName = getChannelDisplayName(
          channel,
          userProfiles,
          currentUserId,
        );
      } else if (channel.type === "G" && currentUserId) {
        // Group channel - extract all users except current
        userIds = channel.name
          .split("__")
          .filter((id) => id !== "G" && id !== "" && id !== currentUserId);
        users = userIds.map((id) => userProfiles[id]).filter(Boolean);
        computedDisplayName = getChannelDisplayName(
          channel,
          userProfiles,
          currentUserId,
        );
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
  },
);


/**
 * Get current team object (memoized)
 * Performance benefit: Avoids lookup on every render
 */
export const selectCurrentTeam = createSelector(
  [(state: RootState) => state.entities.teams.teams, selectCurrentTeamId],
  (teamsById, currentTeamId) => {
    return currentTeamId ? teamsById[currentTeamId] : null;
  },
);

/**
 * Get team by ID selector factory (memoized)
 * Usage: const selectTeam = selectTeamById(teamId)
 */
export const selectTeamById = (teamId: string | null) =>
  createSelector(
    [(state: RootState) => state.entities.teams.teams], 
    (teamsById) => teamId ? teamsById[teamId] : null,
  );

/**
 * Get team unreads data directly from state - no processing needed
 */
export const selectTeamUnreads = (state: RootState) =>
  state.entities.teams.unreads;

/**
 * Get unread data for specific team (memoized)
 */
export const selectTeamUnreadData = (teamId: string) =>
  createSelector(
    [selectTeamUnreads],
    (teamUnreads) => teamUnreads[teamId] || EMPTY_UNREAD_DATA,
  );

// ============================================================================
// MEMOIZED USER SELECTORS
// ============================================================================

/**
 * Get current user profile (memoized)
 * Performance benefit: Avoids lookup on every render
 */
export const selectCurrentUser = createSelector(
  [(state: RootState) => state.entities.users.profiles, selectCurrentUserId],
  (userProfiles, currentUserId) => {
    return currentUserId ? userProfiles[currentUserId] : null;
  },
);

/**
 * Get users as array (memoized)
 * Performance benefit: Avoids Object.values() recalculation
 */
export const selectUsersArray = createSelector(
  [(state: RootState) => state.entities.users.profiles],
  (userProfiles) => Object.values(userProfiles),
);

// ============================================================================
// CHANNELS SELECTORS (continued from Pattern 1)
// ============================================================================

/**
 * Get current channel with all enriched data (memoized)
 * Performance benefit: Avoids lookup on every render
 */
export const selectCurrentChannel = createSelector(
  [selectChannelsForCurrentTeam, selectCurrentChannelId],
  (channels, currentChannelId): EnrichedChannel | null => {
    if (!currentChannelId) return null;
    return channels.find((channel) => channel.id === currentChannelId) || null;
  },
);

// ============================================================================
// CURRENT TEAM SELECTORS (no parameters, safe for useAppSelector)
// ============================================================================

/**
 * Get channels for team (factory pattern) - Exact Mattermost pattern
 * Usage: const getChannelsInTeam = makeSelectChannelsInTeam(); const channels = useSelector(state => getChannelsInTeam(state, teamId));
 */
export const makeSelectChannelsInTeam = () =>
  createSelector(
    [
      (state: RootState) => state.entities.channels.channelsInTeam,
      (state: RootState) => state.entities.channels.channels,
      (state: RootState, teamId: string) => teamId
    ],
    (channelsInTeam, channelsById, teamId) => {
      const channelIds = channelsInTeam[teamId] || EMPTY_CHANNEL_IDS;
      return channelIds.map((id) => channelsById[id]).filter(Boolean);
    },
  );

/**
 * Get my channel member by ID (memoized)
 */
export const selectMyChannelMember = (channelId: string) =>
  createSelector(
    [(state: RootState) => state.entities.channels.myMembers],
    (myMembers) => myMembers[channelId] || null,
  );

// ============================================================================
// UNREAD COUNTS SELECTORS
// ============================================================================

/**
 * Get channel by ID with all data (factory pattern) - Following Mattermost pattern
 * Usage: const getChannelById = useMemo(() => selectChannelByIdFactory(), []); const channel = useSelector(state => getChannelById(state, channelId));
 */
export const selectChannelByIdFactory = () =>
  createSelector(
    [
      selectChannelsForCurrentTeam,
      (state: RootState, channelId: string) => channelId,
    ],
    (
      channels: EnrichedChannel[],
      channelId: string,
    ): EnrichedChannel | null => {
      return channels.find((channel) => channel.id === channelId) || null;
    },
  );

// ============================================================================
// WEBSOCKET & TYPING EVENTS SELECTORS
// ============================================================================

export const selectWebSocketState = (state: RootState) => state.websocket;
export const selectWebSocketStatus = (state: RootState) =>
  state.websocket?.status || "disconnected";

// ============================================================================
// AUTH & VIEWS SELECTORS
// ============================================================================

/**
 * Get auth state fields (individual selectors)
 */
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;
export const selectAuthToken = (state: RootState) => state.auth.token;
export const selectServerUrl = (state: RootState) => state.auth.serverUrl;

/**
 * Get auth views state fields (individual selectors)
 */
export const selectIsLoggingIn = (state: RootState) =>
  state.views.auth.isLoggingIn;
export const selectLoginError = (state: RootState) =>
  state.views.auth.loginError;

/**
 * Simple direct selectors for typing events (Mattermost approach without factories)
 * These selectors avoid the instability warnings by directly accessing state
 */
export const selectTypingEventsForChannel = createSelector(
  [
    (state: RootState) => state.websocket.typingEventsByChannel,
    (state: RootState) => state.entities.users.currentUserId,
    (state: RootState, channelId: string) => channelId,
  ],
  (allTypingEvents, currentUserId, channelId) => {
    const events = allTypingEvents[channelId] || EMPTY_CHANNELS_ARRAY;
    const otherUserEvents = events.filter(
      (event) => event.user_id !== currentUserId,
    );

    const uniqueUsernames = Array.from(
      new Set(otherUserEvents.map((event) => event.username)),
    ).filter((username) => username !== "Someone");

    const typingMessage = (() => {
      if (uniqueUsernames.length === 0) return "";
      if (uniqueUsernames.length === 1)
        return `${uniqueUsernames[0]} is typing...`;
      if (uniqueUsernames.length === 2)
        return `${uniqueUsernames[0]} and ${uniqueUsernames[1]} are typing...`;
      return "Several people are typing...";
    })();

    return {
      events: otherUserEvents,
      isAnyoneTyping: otherUserEvents.length > 0,
      typingUsers: uniqueUsernames,
      typingMessage,
    };
  },
);

// ============================================================================
// ADDITIONAL SELECTORS FOR HOOKS (to avoid inline selectors)
// ============================================================================

// Users state selectors
export const selectUserStatuses = (state: RootState) =>
  state.entities.users.statuses;
export const selectUserProfiles = (state: RootState) =>
  state.entities.users.profiles;

// Additional specific selectors
export const selectChannelUnreads = (state: RootState) =>
  state.entities.channels.unreads;
export const selectChannelMyMembers = (state: RootState) =>
  state.entities.channels.myMembers;
export const selectTeamStats = (state: RootState) =>
  state.entities.teams.stats;

// Select user by ID
export const selectUserById = (userId: string) =>
  createSelector([selectUserProfiles], (profiles) => profiles[userId]);

// Select all user IDs (for status polling)
export const selectAllUserIds = createSelector(
  [selectUserProfiles],
  (profiles): string[] => Object.keys(profiles)
);

// WebSocket status selector
export const selectWebSocketConnectionStatus = (state: RootState) =>
  state.websocket.status;

// Loading state selector
export const selectLoadingState = (state: RootState) => state.loading;

// (Moved to Pattern 1 section above)

// My team memberships selector
export const selectMyTeamMembers = (state: RootState) =>
  state.entities.teams.myMembers;

// Navigation state selectors
export const selectCurrentUrl = (state: RootState) =>
  state.views.navigation.currentUrl;
export const selectPreviousUrl = (state: RootState) =>
  state.views.navigation.previousUrl;
export const selectLastVisitedChannels = (state: RootState) =>
  state.views.navigation.lastVisitedChannels;
export const selectLastVisited = (state: RootState) =>
  state.views.navigation.lastVisited;
export const selectIsNavigating = (state: RootState) =>
  state.views.navigation.isNavigating;

// UI layout selectors
export const selectIsMobile = (state: RootState) => state.views.ui.isMobile;
export const selectSidebarWidth = (state: RootState) =>
  state.views.ui.sidebarWidth;

// ============================================================================
// INDIVIDUAL CHANNEL SELECTORS (One selector per channelId)
// ============================================================================


/**
 * Simple direct selector for channel by ID (Simplified stable approach)
 * Avoids factory pattern to prevent selector instability warnings
 */
export const selectChannelById = createSelector(
  [
    (state: RootState, channelId: string) =>
      state.entities.channels.channels[channelId],
    (state: RootState, channelId: string) =>
      state.entities.channels.unreads[channelId],
    (state: RootState, channelId: string) =>
      state.entities.channels.myMembers[channelId],
    (state: RootState) => state.entities.users.currentUserId,
    (state: RootState) => state.entities.users.profiles,
  ],
  (
    channel,
    unread,
    myMember,
    currentUserId,
    userProfiles,
  ): EnrichedChannel | null => {
    if (!channel) return null;

    // Build enriched channel data (isolated per channel)
    const isMuted = myMember?.notify_props?.mark_unread === "mention";

    let unreadCount = 0;
    let mentionCount = 0;

    if (unread) {
      if (channel.type === "D") {
        // Direct Messages: all unreads are mentions
        unreadCount = 0;
        mentionCount = isMuted ? 0 : unread.msg_count || 0;
      } else {
        // Team channels: separate unreads and mentions
        unreadCount = isMuted ? 0 : unread.msg_count || 0;
        mentionCount = unread.mention_count || 0;
      }
    }

    const hasUnreads = unreadCount > 0 || mentionCount > 0;

    // Use utility function for display name
    const computedDisplayName = getChannelDisplayName(
      channel,
      userProfiles,
      currentUserId,
    );

    // Get other user info for DMs
    let otherUser: any = null;
    let otherUserId: string | undefined;
    if (channel.type === "D" && currentUserId) {
      const userIds = channel.name.split("__");
      otherUserId = userIds.find((id) => id !== currentUserId);
      if (otherUserId) {
        otherUser = userProfiles[otherUserId];
      }
    }

    return {
      ...channel,
      hasUnreads,
      unreadCount,
      mentionCount,
      isMuted,
      computedDisplayName,
      otherUser,
      otherUserId,
    };
  },
);

// ============================================================================
// CATEGORIES-BASED SELECTORS (New Mattermost approach)
// ============================================================================

/**
 * Get categories for current team (ordered)
 */
export const selectCategoriesForCurrentTeam = createSelector(
  [
    selectCurrentTeamId,
    (state: RootState) => state.entities.channels.categories,
    (state: RootState) => state.entities.channels.categoriesInTeam,
    (state: RootState) => state.entities.channels.categoryOrder,
  ],
  (currentTeamId, categories, categoriesInTeam, categoryOrder) => {
    if (!currentTeamId) return EMPTY_CHANNELS_ARRAY;
    
    const categoryIds = categoriesInTeam[currentTeamId] || EMPTY_CHANNEL_IDS;
    const orderedIds = categoryOrder[currentTeamId] || categoryIds;
    
    return orderedIds
      .map(id => categories[id])
      .filter(Boolean);
  }
);

/**
 * Get all channel IDs from categories
 */
export const selectChannelIdsForCurrentTeam = createSelector(
  [selectCategoriesForCurrentTeam],
  (categories) => {
    const allChannelIds = categories.flatMap(cat => cat.channel_ids);
    return [...new Set(allChannelIds)]; // Remove duplicates
  }
);

/**
 * Get favorites category for current team
 */
export const selectFavoritesCategory = createSelector(
  [selectCategoriesForCurrentTeam],
  (categories) => categories.find(cat => cat.type === 'favorites') || null
);

/**
 * Check if channel is favorite
 */
export const selectIsChannelFavorite = createSelector(
  [
    selectFavoritesCategory,
    (state: RootState, channelId: string) => channelId,
  ],
  (favoritesCategory, channelId) => {
    return favoritesCategory?.channel_ids.includes(channelId) || false;
  }
);

/**
 * Search channels by query using categories
 */
export const createSelectFilteredChannelIds = () =>
  createSelector(
    [
      selectChannelIdsForCurrentTeam,
      (state: RootState, searchQuery: string) => searchQuery.toLowerCase().trim(),
      (state: RootState) => state.entities.channels.channels,
      (state: RootState) => state.entities.users.profiles,
      (state: RootState) => state.entities.users.currentUserId,
    ],
    (allChannelIds, searchQuery, channels, userProfiles, currentUserId) => {
      if (!searchQuery) return allChannelIds;

      return allChannelIds.filter((channelId) => {
        const channel = channels[channelId];
        if (!channel) return false;

        // Get display name using utility function
        const displayName = getChannelDisplayName(
          channel,
          userProfiles,
          currentUserId,
        );

        // Search in multiple fields
        return (
          displayName.toLowerCase().includes(searchQuery) ||
          channel.display_name?.toLowerCase().includes(searchQuery) ||
          channel.name?.toLowerCase().includes(searchQuery) ||
          channel.purpose?.toLowerCase().includes(searchQuery)
        );
      });
    },
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
    return currentUser.roles.split(" ").filter(Boolean);
  },
);

/**
 * Check if current user is system admin (memoized)
 * Performance benefit: Avoids role checking on every render
 */
export const selectIsSystemAdmin = createSelector(
  [selectCurrentUserRoles],
  (roles) => roles.includes("system_admin"),
);

/**
 * Get team member roles for current user (memoized)
 * Performance benefit: Avoids team member lookup on every permission check
 */
// Create a stable array for default team user role
const DEFAULT_TEAM_USER_ROLES = ["team_user"] as const;

export const selectCurrentUserTeamRoles = (teamId: string) =>
  createSelector(
    [(state: RootState) => state.entities.teams.myMembers],
    (myMembers) => {
      const member = myMembers[teamId];
      if (!member?.roles) return DEFAULT_TEAM_USER_ROLES;
      return member.roles.split(" ").filter(Boolean);
    }
  );

// User Search Selectors
export const selectUserSearchState = (state: RootState) => state.views.userSearch;

export const selectUserSearchResults = createSelector(
  [selectUserSearchState],
  (userSearch) => userSearch.searchResults
);

export const selectIsUserSearching = createSelector(
  [selectUserSearchState],
  (userSearch) => userSearch.isSearching
);

export const selectUserSearchTerm = createSelector(
  [selectUserSearchState],
  (userSearch) => userSearch.searchTerm
);

export const selectLastUserSearchTerm = createSelector(
  [selectUserSearchState],
  (userSearch) => userSearch.lastSearchTerm
);

// Channel Members Selectors
// Create a stable empty object to avoid unnecessary re-renders
const EMPTY_CHANNEL_MEMBERS = {};

export const selectChannelMembers = createSelector(
  [
    (state: RootState) => state.entities.channels.membersInChannel,
    (state: RootState, channelId: string) => channelId,
  ],
  (membersInChannel, channelId) => membersInChannel[channelId] || EMPTY_CHANNEL_MEMBERS
);

export const selectIsUserInChannel = createSelector(
  [
    (state: RootState, userId: string, channelId: string) => 
      selectChannelMembers(state, channelId),
    (state: RootState, userId: string, channelId: string) => userId,
  ],
  (channelMembers, userId) => {
    return !!channelMembers[userId];
  }
);

// Team membership selectors
// Create a stable empty object to avoid unnecessary re-renders
const EMPTY_TEAM_MEMBERS = {};

export const selectTeamMembers = createSelector(
  [
    (state: RootState) => state.entities.teams.membersInTeam,
    (state: RootState, teamId: string) => teamId,
  ],
  (membersInTeam, teamId) => membersInTeam[teamId] || EMPTY_TEAM_MEMBERS
);

export const selectIsUserInTeam = createSelector(
  [
    (state: RootState, teamId: string, userId: string) => 
      selectTeamMembers(state, teamId),
    (state: RootState, teamId: string, userId: string) => userId,
  ],
  (teamMembers, userId) => {
    return !!teamMembers[userId];
  }
);

// Team stats selector
// Create a stable empty stats object to avoid unnecessary re-renders
const EMPTY_TEAM_STATS = { total_member_count: 0, active_member_count: 0 };

export const selectTeamStatsById = (teamId: string) =>
  createSelector([selectTeamStats], (teamStats) => {
    return teamStats[teamId] || EMPTY_TEAM_STATS;
  });

// Preferences selector
export const selectPreferences = (state: RootState) =>
  state.preferences.preferences;

// Typing events selector
export const selectTypingEventsByChannel = (state: RootState) =>
  state.websocket.typingEventsByChannel;
