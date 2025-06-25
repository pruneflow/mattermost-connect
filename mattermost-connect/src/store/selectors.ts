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

export const selectTeamsState = (state: RootState) => state.entities.teams;
export const selectUsersState = (state: RootState) => state.entities.users;
export const selectCurrentTeamId = (state: RootState) =>
  state.entities.teams.currentTeamId;
export const selectCurrentUserId = (state: RootState) =>
  state.entities.users.currentUserId;

// Channels state selectors (Pattern 1)
export const selectChannelsState = (state: RootState) =>
  state.entities.channels;
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
export const selectTeams = createSelector([selectTeamsState], (teamsState) =>
  Object.values(teamsState.teams),
);

/**
 * Get teams as an object/dictionary (memoized)
 * Performance benefit: Avoids creating new object reference on every render
 */
export const selectTeamsById = createSelector(
  [selectTeamsState],
  (teamsState) => teamsState.teams,
);

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
    if (!currentTeamId) return [];
    const channelIds = channelsInTeam[currentTeamId] || [];
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
    selectUsersState,
    selectCurrentUserId,
  ],
  (
    teamChannels,
    channelUnreads,
    channelMembers,
    currentChannelId,
    usersState,
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
        otherUser = otherUserId ? usersState.profiles[otherUserId] : null;
        computedDisplayName = getChannelDisplayName(
          channel,
          usersState.profiles,
          currentUserId,
        );
      } else if (channel.type === "G" && currentUserId) {
        // Group channel - extract all users except current
        userIds = channel.name
          .split("__")
          .filter((id) => id !== "G" && id !== "" && id !== currentUserId);
        users = userIds.map((id) => usersState.profiles[id]).filter(Boolean);
        computedDisplayName = getChannelDisplayName(
          channel,
          usersState.profiles,
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
  [selectTeamsState, selectCurrentTeamId],
  (teamsState, currentTeamId) => {
    return currentTeamId ? teamsState.teams[currentTeamId] : null;
  },
);

/**
 * Get team by ID selector factory (memoized)
 * Usage: const selectTeam = selectTeamById(teamId)
 */
export const selectTeamById = (teamId: string | null) =>
  createSelector([selectTeamsState], (teamsState) =>
    teamId ? teamsState.teams[teamId] : null,
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
    (teamUnreads) => teamUnreads[teamId] || { msg_count: 0, mention_count: 0 },
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
  },
);

/**
 * Get users as array (memoized)
 * Performance benefit: Avoids Object.values() recalculation
 */
export const selectUsersArray = createSelector(
  [selectUsersState],
  (usersState) => Object.values(usersState.profiles),
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
    [selectChannelsState, (state: RootState, teamId: string) => teamId],
    (channelsState, teamId) => {
      const channelIds = channelsState.channelsInTeam[teamId] || [];
      return channelIds.map((id) => channelsState.channels[id]).filter(Boolean);
    },
  );

/**
 * Get my channel member by ID (memoized)
 */
export const selectMyChannelMember = (channelId: string) =>
  createSelector(
    [selectChannelsState],
    (channelsState) => channelsState.myMembers[channelId] || null,
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
    const events = allTypingEvents[channelId] || [];
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

// Team members selector
export const selectTeamMembers = (state: RootState) =>
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
    (state: RootState) => state.entities.users,
  ],
  (
    channel,
    unread,
    myMember,
    currentUserId,
    usersState,
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
      usersState.profiles,
      currentUserId,
    );

    // Get other user info for DMs
    let otherUser: any = null;
    let otherUserId: string | undefined;
    if (channel.type === "D" && currentUserId) {
      const userIds = channel.name.split("__");
      otherUserId = userIds.find((id) => id !== currentUserId);
      if (otherUserId) {
        otherUser = usersState.profiles[otherUserId];
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
    if (!currentTeamId) return [];
    
    const categoryIds = categoriesInTeam[currentTeamId] || [];
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
      (state: RootState) => state.entities.users,
    ],
    (allChannelIds, searchQuery, channels, usersState) => {
      if (!searchQuery) return allChannelIds;

      return allChannelIds.filter((channelId) => {
        const channel = channels[channelId];
        if (!channel) return false;

        // Get display name using utility function
        const displayName = getChannelDisplayName(
          channel,
          usersState.profiles,
          usersState.currentUserId,
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
export const selectCurrentUserTeamRoles = (teamId: string) =>
  createSelector([selectTeamsState], (teamsState) => {
    const member = teamsState.myMembers[teamId];
    if (!member?.roles) return ["team_user"];
    return member.roles.split(" ").filter(Boolean);
  });
