import { createSelector } from "@reduxjs/toolkit";
import { getPreference, RootState } from "./index";
import type { Channel, PostOrderBlock, UserProfile, Post, PreferenceType, EnrichedChannel } from "../api/types";
import { getChannelDisplayName, processChannelData, shouldDisplayGroupChannel } from "../utils/channelUtils";
import { createIdsSelector } from "../utils/selectorsHelper";
import {
  COMBINED_USER_ACTIVITY,
  DATE_LINE,
  isCreateComment,
  isDateLine,
  isFromWebhook,
  isStartOfNewMessages,
  isUserActivityPost, MAX_COMBINED_SYSTEM_POSTS,
  shouldFilterJoinLeavePost,
  START_OF_NEW_MESSAGES
} from "../utils/postUtils";
import { getUserCurrentTimezone } from "../utils/dateUtils";

import moment from 'moment-timezone';



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
export const selectChannelsInCurrentTeam = createIdsSelector('selectChannelsInCurrentTeam',
  [
    selectChannelsData,
    selectCurrentTeamId,
    (state: RootState) => state.entities.channels.channelsInTeam,
  ],
  (allChannels: Record<string, Channel>, currentTeamId: string | null, channelsInTeam: Record<string, string[]>) => {
    if (!currentTeamId) return EMPTY_CHANNELS_ARRAY;
    const channelIds = channelsInTeam[currentTeamId] || EMPTY_CHANNEL_IDS;
    return channelIds.map((id: string) => allChannels[id]).filter(Boolean);
  },
);

/**
 * Get channels in current team with ALL data: unreads, user names, display names, etc.
 * This is the single source of truth for complete channel data
 */
export const selectChannelsForCurrentTeam = createIdsSelector('selectChannelsForCurrentTeam',
  [
    selectChannelsInCurrentTeam,
    (state: RootState) => state.entities.channels.unreads,
    (state: RootState) => state.entities.channels.myMembers,
    selectCurrentChannelId,
    (state: RootState) => state.entities.users.profiles,
    (state: RootState) => state.entities.users.profilesInChannel,
    selectCurrentUserId,
    (state: RootState) => state.preferences.preferences,
  ],
  (
    teamChannels: Channel[],
    channelUnreads: Record<string, any>,
    channelMembers: Record<string, any>,
    currentChannelId: string | null,
    userProfiles: Record<string, UserProfile>,
    profilesInChannel: Record<string, any>,
    currentUserId: string | null,
    preferences: PreferenceType[],
  ): EnrichedChannel[] => {
    return teamChannels
      .map((channel: Channel) => {
      // Unread data from single source of truth: channels.unreads
      const membership = channelMembers[channel.id];
      const isMuted = membership?.notify_props?.mark_unread === "mention";
      const unread = channelUnreads[channel.id];

      let unreadCount: number;
      let mentionCount: number;

      if (channel.type === "D") {
        // Direct Messages: all unreads are considered mentions (Mattermost pattern)
        unreadCount = 0;
        mentionCount = unread?.msg_count || 0; // DMs: always show mentions even if muted
      } else {
        // Team channels: separate unreads and mentions
        unreadCount = isMuted ? 0 : unread?.msg_count || 0;
        mentionCount = unread?.mention_count || 0;
      }

      const hasUnreads = unreadCount > 0 || mentionCount > 0;

      // Use unified channel processing logic
      const {
        computedDisplayName,
        otherUser,
        otherUserId,
      } = processChannelData(channel, userProfiles, currentUserId);

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
      } as EnrichedChannel;
    })
    .filter((channel: EnrichedChannel) => {
      // Filter group channels based on preferences
      return shouldDisplayGroupChannel(channel, preferences, channel.hasUnreads);
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
export const selectUsersArray = createIdsSelector('selectUsersArray',
  [(state: RootState) => state.entities.users.profiles],
  (userProfiles: Record<string, UserProfile>) => Object.values(userProfiles),
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
  (channels: EnrichedChannel[], currentChannelId: string | null): EnrichedChannel | null => {
    if (!currentChannelId) return null;
    return channels.find((channel: EnrichedChannel) => channel.id === currentChannelId) || null;
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
      return channelIds.map((id: string) => channelsById[id]).filter(Boolean);
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
export const selectChannelsViews = (state: RootState) =>
  state.views.channels;

// UI layout selectors
export const selectIsMobile = (state: RootState) => state.views.ui.isMobile;
export const selectSidebarWidth = (state: RootState) =>
  state.views.ui.sidebarWidth;

// ============================================================================
// POSTS/MESSAGES SELECTORS
// ============================================================================

// Base posts selectors
export const selectAllPosts = (state: RootState) => state.entities.posts.posts;
export const selectPostsInChannel = (state: RootState) => state.entities.posts.postsInChannel;
export const selectPostsInThread = (state: RootState) => state.entities.posts.postsInThread;
export const selectChannelPagination = (state: RootState) => state.entities.posts.channelPagination;

// Individual post selector (normalized, no user included)
export const selectPostById = createSelector(
  [
    (state: RootState, postId: string) => state.entities.posts.posts[postId],
  ],
  (post) => post || null
);

// Posts for a specific channel (normalized, no user included) - EXACT Mattermost pattern
export const selectPostsForChannel = createSelector(
  [
    (state: RootState, channelId: string) => state.entities.posts.postsInChannel[channelId],
    (state: RootState) => state.entities.posts.posts,
  ],
  (chunks, allPosts) => {
    if (!chunks?.length) return [];
    
    // Flatten all chunks in order (recent chunks first, then older chunks)
    const allPostIds = chunks.flatMap(chunk => chunk.order);
    
    return allPostIds
      .map(postId => allPosts[postId])
      .filter(Boolean); // Already sorted in chunks (newest first)
  }
);

// Posts for a specific thread (normalized, no user included)
export const selectPostsForThread = createSelector(
  [
    (state: RootState, threadId: string) => state.entities.posts.postsInThread[threadId] || [],
    (state: RootState) => state.entities.posts.posts,
  ],
  (postIds, allPosts) => {
    return postIds
      .map(postId => allPosts[postId])
      .filter(Boolean) // Remove null/undefined entries
      .sort((a, b) => a.create_at - b.create_at); // Sort chronologically
  }
);

// Get pagination metadata for a channel
export const selectChannelPaginationMeta = createSelector(
  [
    (state: RootState, channelId: string) => state.entities.posts.channelPagination[channelId],
  ],
  (pagination) => pagination || {
    hasOlderPosts: false,
    hasNewerPosts: false,
    oldestPostId: null,
    newestPostId: null,
    isLoading: false,
    lastLoadedAt: 0,
    newMessageLineIndex: null,
    focusedPostId: null,
    atBottom: true,
    isScrolling: false,
    scrollToIndex: null,
  }
);

// Posts with pagination metadata for a channel
export const selectChannelPostsWithPagination = createSelector(
  [
    (state: RootState, channelId: string) => selectPostsForChannel(state, channelId),
    (state: RootState, channelId: string) => selectChannelPaginationMeta(state, channelId),
  ],
  (posts, pagination) => ({
    posts,
    hasOlderPosts: pagination.hasOlderPosts,
    hasNewerPosts: pagination.hasNewerPosts,
    isLoading: pagination.isLoading,
    isEmpty: posts.length === 0,
    oldestPostId: pagination.oldestPostId,
    newestPostId: pagination.newestPostId,
    lastLoadedAt: pagination.lastLoadedAt,
  })
);

// Get the latest post in a channel
export const selectLatestPostInChannel = createSelector(
  [
    (state: RootState, channelId: string) => selectPostsForChannel(state, channelId),
  ],
  (posts) => {
    if (!posts || posts.length === 0) return null;
    return posts[posts.length - 1]; // Last post (most recent)
  }
);

// Get thread replies count for a post
export const selectThreadRepliesCount = createSelector(
  [
    (state: RootState, postId: string) => state.entities.posts.postsInThread[postId] || [],
  ],
  (replyIds) => replyIds.length
);

// ============================================================================
// ADDITIONAL MATTERMOST CHUNK SELECTORS - EXACT Mattermost pattern
// ============================================================================

// Get recent posts chunk for channel (contains .order, .recent, .oldest, etc.)
export const selectPostsChunkForChannel = createSelector(
  [
    (state: RootState, channelId: string) => state.entities.posts.postsInChannel[channelId],
  ],
  (chunks) => {
    if (!chunks?.length) {
      return {
        order: [],
        recent: false,
        oldest: false,
      };
    }
    
    // Return the recent chunk or first chunk
    return chunks.find(chunk => chunk.recent) || chunks[0];
  }
);

// Check if channel is at latest posts - EXACT Mattermost pattern
export const selectIsChannelAtLatestPosts = createSelector(
  [
    (state: RootState, channelId: string) => state.entities.posts.postsInChannel[channelId],
  ],
  (chunks) => {
    if (!chunks?.length) return false;
    // Check if any chunk is marked as recent
    return chunks.some(chunk => chunk.recent);
  }
);

// Check if channel is at oldest posts - EXACT Mattermost pattern
export const selectIsChannelAtOldestPosts = createSelector(
  [
    (state: RootState, channelId: string) => state.entities.posts.postsInChannel[channelId],
  ],
  (chunks) => {
    if (!chunks?.length) return false;
    // Check if any chunk is marked as oldest
    return chunks.some(chunk => chunk.oldest);
  }
);

// Get focused post ID for channel (permalinks) - EXACT Mattermost pattern
export const selectFocusedPostId = createSelector(
  [
    (state: RootState, channelId: string) => state.entities.posts.channelPagination[channelId],
  ],
  (pagination) => pagination?.focusedPostId || null
);

// Get posts that are root posts (not replies) in a channel
export const selectRootPostsInChannel = createSelector(
  [
    (state: RootState, channelId: string) => selectPostsForChannel(state, channelId),
  ],
  (posts) => {
    return posts.filter(post => !post.root_id);
  }
);

// Check if a channel has posts - EXACT Mattermost pattern
export const selectChannelHasPosts = createSelector(
  [
    (state: RootState, channelId: string) => state.entities.posts.postsInChannel[channelId],
  ],
  (chunks) => {
    if (!chunks?.length) return false;
    // Check if any chunk has posts
    return chunks.some(chunk => chunk.order.length > 0);
  }
);

// Get post reactions with user info (composed/processed)
export const selectPostReactions = createSelector(
  [
    (state: RootState, postId: string) => state.entities.posts.posts[postId]?.metadata?.reactions || [],
    (state: RootState) => state.entities.users.profiles,
  ],
  (reactions, userProfiles) => {
    const processedReactions: Record<string, { users: Array<{ id: string; username: string }>, count: number }> = {};
    
    reactions.forEach(reaction => {
      const emojiName = reaction.emoji_name;
      if (!processedReactions[emojiName]) {
        processedReactions[emojiName] = { users: [], count: 0 };
      }
      processedReactions[emojiName].users.push({
        id: reaction.user_id,
        username: userProfiles[reaction.user_id]?.username || 'Unknown',
      });
      processedReactions[emojiName].count++;
    });
    
    return processedReactions;
  }
);

// Check if current user has reacted to a post with specific emoji
export const selectHasUserReacted = createSelector(
  [
    (state: RootState, postId: string, emojiName: string) => 
      state.entities.posts.posts[postId]?.metadata?.reactions?.filter(r => r.emoji_name === emojiName) || [],
    (state: RootState) => state.entities.users.currentUserId,
  ],
  (reactions, currentUserId) => {
    return currentUserId ? !!reactions.find(r => r.user_id === currentUserId) : false;
  }
);

// Helper selector to get user info for a post (compose at component level)
export const selectUserForPost = createSelector(
  [
    (state: RootState, postId: string) => state.entities.posts.posts[postId]?.user_id,
    (state: RootState) => state.entities.users.profiles,
  ],
  (userId, profiles) => {
    return userId ? profiles[userId] || null : null;
  }
);

// ============================================================================
// MATTERMOST-LIKE UNREAD DIVIDER & SCROLL SELECTORS
// ============================================================================

// Calculate unread divider position (Mattermost pattern)
export const selectUnreadDividerPosition = createSelector(
  [
    (state: RootState, channelId: string) => selectPostsForChannel(state, channelId),
    (state: RootState, channelId: string) => state.entities.channels.myMembers[channelId]?.last_viewed_at,
  ],
  (posts, lastViewedAt) => {
    if (!lastViewedAt || posts.length === 0) return -1;
    
    // Find the first post after last viewed timestamp
    const unreadIndex = posts.findIndex(post => post.create_at > lastViewedAt);
    
    // If no unread posts found, return -1
    return unreadIndex === -1 ? -1 : unreadIndex;
  }
);

// Get unread posts count for a channel
export const selectUnreadPostsCount = createSelector(
  [
    (state: RootState, channelId: string) => selectPostsForChannel(state, channelId),
    (state: RootState, channelId: string) => state.entities.channels.myMembers[channelId]?.last_viewed_at,
  ],
  (posts, lastViewedAt) => {
    if (!lastViewedAt || posts.length === 0) return 0;
    
    return posts.filter(post => post.create_at > lastViewedAt).length;
  }
);

// Check if channel should start from bottom when unread exists (Mattermost pattern)
export const selectShouldStartFromBottomWhenUnread = createSelector(
  [
    (state: RootState, channelId: string) => selectUnreadDividerPosition(state, channelId),
    (state: RootState, channelId: string) => selectUnreadPostsCount(state, channelId),
  ],
  (unreadDividerPosition, unreadCount) => {
    // If there are unread messages, start from unread divider
    // Otherwise, start from bottom
    return unreadDividerPosition === -1 || unreadCount === 0;
  }
);

// Get scroll position and state for a channel
export const selectChannelScrollState = createSelector(
  [
    (state: RootState, channelId: string) => selectChannelPaginationMeta(state, channelId),
  ],
  (pagination) => ({
    atBottom: pagination.atBottom,
    isScrolling: pagination.isScrolling,
    scrollToIndex: pagination.scrollToIndex,
    focusedPostId: pagination.focusedPostId,
    newMessageLineIndex: pagination.newMessageLineIndex,
  })
);

// Get initial scroll position for a channel (Mattermost pattern)
export const selectInitialScrollPosition = createSelector(
  [
    (state: RootState, channelId: string) => selectUnreadDividerPosition(state, channelId),
    (state: RootState, channelId: string) => selectPostsForChannel(state, channelId),
    (state: RootState, channelId: string) => selectChannelScrollState(state, channelId),
  ],
  (unreadDividerPosition, posts, scrollState) => {
    // If there's a focused post, scroll to it
    if (scrollState.focusedPostId) {
      const focusedIndex = posts.findIndex(post => post.id === scrollState.focusedPostId);
      return focusedIndex !== -1 ? focusedIndex : null;
    }
    
    // If there's an explicit scroll index, use it
    if (scrollState.scrollToIndex !== null) {
      return scrollState.scrollToIndex;
    }
    
    // If there are unread messages, scroll to unread divider
    if (unreadDividerPosition !== -1) {
      return unreadDividerPosition;
    }
    
    // Default: scroll to bottom
    return posts.length - 1;
  }
);

// Check if "scroll to bottom" button should be shown (Mattermost pattern)
export const selectShouldShowScrollToBottom = createSelector(
  [
    (state: RootState, channelId: string) => selectChannelScrollState(state, channelId),
    (state: RootState, channelId: string) => selectPostsForChannel(state, channelId),
  ],
  (scrollState, posts) => {
    // Show if not at bottom and there are posts
    return !scrollState.atBottom && posts.length > 0;
  }
);

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
    (state: RootState) => state.preferences.preferences,
  ],
  (
    channel,
    unread,
    myMember,
    currentUserId,
    userProfiles,
    preferences,
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
        mentionCount = unread.msg_count || 0; // DMs: always show mentions even if muted
      } else {
        // Team channels: separate unreads and mentions
        unreadCount = isMuted ? 0 : unread.msg_count || 0;
        mentionCount = unread.mention_count || 0;
      }
    }

    const hasUnreads = unreadCount > 0 || mentionCount > 0;

    // Use unified channel processing logic
    const {
      computedDisplayName,
      otherUser,
      otherUserId,
    } = processChannelData(channel, userProfiles, currentUserId);

    const enrichedChannel = {
      ...channel,
      hasUnreads,
      unreadCount,
      mentionCount,
      isMuted,
      computedDisplayName,
      otherUser,
      otherUserId,
    };

    // Apply group channel visibility filter
    if (!shouldDisplayGroupChannel(enrichedChannel, preferences, hasUnreads)) {
      return null;
    }

    return enrichedChannel;
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

// Group Channel Selectors
export const selectChannelMemberCount = (channelId: string) =>
  createSelector(
    [(state: RootState) => state.entities.channels.memberCounts],
    (memberCounts) => memberCounts[channelId] || 0
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

// ============================================================================
// MATTERMOST POSTLIST SELECTORS (Exact patterns from webapp/mobile)
// ============================================================================

// Get post IDs in channel - exact Mattermost pattern
export const getPostIdsInChannel = (state: RootState, channelId: string): string[] | null => {
  const chunks = state.entities.posts.postsInChannel[channelId];
  if (!chunks || chunks.length === 0) {
    return null;
  }
  
  // Flatten all chunks to get all post IDs
  const postIds = chunks.flatMap(chunk => chunk.order);
  return postIds.length > 0 ? postIds : null;
};

// Get recent posts chunk (first chunk marked as recent) - EXACT Mattermost pattern
export const getRecentPostsChunkInChannel = (state: RootState, channelId: string) => {
  const postsForChannel = state.entities.posts.postsInChannel[channelId];

  if (!postsForChannel) {
    return null;
  }

  return postsForChannel.find((block) => block.recent);
};

// Get oldest posts chunk (first chunk marked as oldest) - EXACT Mattermost pattern
export const getOldestPostsChunkInChannel = (state: RootState, channelId: string) => {
  const chunks = state.entities.posts.postsInChannel[channelId];
  if (!chunks || chunks.length === 0) {
    return {
      order: [],
      recent: false,
      oldest: true,
    };
  }
  
  // Find oldest chunk or return last chunk
  return chunks.find(chunk => chunk.oldest) || chunks[chunks.length - 1] || {
    order: [],
    recent: false,
    oldest: true,
  };
};

// Get posts chunk around specific post - EXACT Mattermost pattern
export const makeGetPostsChunkAroundPost = () => {
  return createIdsSelector(
    'makeGetPostsChunkAroundPost',
    (state: RootState, postId: string, channelId: string) => state.entities.posts.postsInChannel[channelId],
    (state: RootState, postId: string) => postId,
    (postsForChannel: PostOrderBlock[], postId: string) => {
      if (!postsForChannel) {
        return null;
      }

      let postChunk;

      for (const block of postsForChannel) {
        const index = block.order.indexOf(postId as string);

        if (index === -1) {
          continue;
        }

        postChunk = block;
      }

      return postChunk;
    },
  );
}

export const getPostsChunkInChannelAroundTime = (state: RootState, channelId: Channel['id'], timeStamp: number): PostOrderBlock | undefined | null => {
  const postsEntity = state.entities.posts;
  const postsForChannel = postsEntity.postsInChannel[channelId];
  const posts = postsEntity.posts;
  if (!postsForChannel) {
    return null;
  }

  return postsForChannel.find((block) => {
    const { order } = block;
    const recentPostInBlock = posts[order[0]];
    const oldestPostInBlock = posts[order[order.length - 1]];
    if (recentPostInBlock && oldestPostInBlock) {
      return (recentPostInBlock.create_at >= timeStamp && oldestPostInBlock.create_at <= timeStamp);
    }
    return false;
  });
}


export function getAllPosts(state: RootState) {
  return state.entities.posts.posts;
}

export const getPost = (state: RootState, postId: Post['id']): Post => {
  return getAllPosts(state)[postId];
}


export const isPostsChunkIncludingUnreadsPosts = (state: RootState, chunk: PostOrderBlock, timeStamp: number): boolean => {
  const postsEntity = state.entities.posts;
  const posts = postsEntity.posts;

  if (!chunk || !chunk.order.length) {
    return false;
  }

  const {order} = chunk;
  const oldestPostInBlock = posts[order[order.length - 1]];

  return oldestPostInBlock.create_at <= timeStamp;
};



export function makeGetPostsForIds(): (state: RootState, postIds: Array<Post['id']>) => Post[] {
  return createIdsSelector(
    'makeGetPostsForIds',
    getAllPosts,
    (state: RootState, postIds: Array<Post['id']>) => postIds,
    (allPosts: Record<string, Post[]>, postIds: string[]) => {
      if (!postIds) {
        return [];
      }

      return postIds.map((id: string) => allPosts[id]);
    },
  );
}


interface PostFilterOptions {
  postIds: string[];
  lastViewedAt: number;
  indicateNewMessages?: boolean;
}

// Returns a selector that, given the state and an object containing an array of postIds and an optional
// timestamp of when the channel was last read, returns a memoized array of postIds interspersed with
// day indicators and an optional new message indicator.
export function makeFilterPostsAndAddSeparators() {
  const getPostsForIds = makeGetPostsForIds();

  return createIdsSelector(
    'makeFilterPostsAndAddSeparators',
    (state: RootState, {postIds}: PostFilterOptions) => getPostsForIds(state, postIds),
    (state: RootState, {lastViewedAt}: PostFilterOptions) => lastViewedAt,
    (state: RootState, {indicateNewMessages}: PostFilterOptions) => indicateNewMessages,
    selectCurrentUser,
    selectPreferences,
    (posts: Post[], lastViewedAt: number, indicateNewMessages: boolean, currentUser: UserProfile, preferences: PreferenceType[]) => {

      if (posts.length === 0 || !currentUser) {
        return [];
      }

      const out: string[] = [];
      let lastDate;
      let addedNewMessagesIndicator = false;
      const showJoinLeave = getPreference(preferences, 'advanced_settings', 'join_leave', true);

      // Iterating through the posts from oldest to newest
      for (let i = posts.length - 1; i >= 0; i--) {
        const post = posts[i];

        // Filter out join/leave messages if necessary
        if (shouldFilterJoinLeavePost(post, showJoinLeave, currentUser.username)) {
          continue;
        }

        // Push on a date header if the last post was on a different day than the current one
        const postDate = new Date(post.create_at);
        const currentOffset = postDate.getTimezoneOffset() * 60 * 1000;
        const timezone = getUserCurrentTimezone(currentUser.timezone);
        if (timezone && moment && moment.tz && moment.tz.zone) {
          try {
            const zone = moment.tz.zone(timezone);
            if (zone && typeof zone.utcOffset === 'function') {
              const timezoneOffset = zone.utcOffset(postDate.getTime()) * 60 * 1000;
              postDate.setTime(postDate.getTime() + (currentOffset - timezoneOffset));
            }
          } catch (error) {
            // Silently fail timezone conversion if moment-timezone fails
            console.warn('Timezone conversion failed:', error);
          }
        }

        if (!lastDate || lastDate.toDateString() !== postDate.toDateString()) {
          out.push(DATE_LINE + postDate.getTime());

          lastDate = postDate;
        }

        if (
          lastViewedAt &&
          post.create_at > lastViewedAt &&
          (post.user_id !== currentUser.id || isFromWebhook(post)) &&
          !addedNewMessagesIndicator &&
          indicateNewMessages
        ) {
          out.push(START_OF_NEW_MESSAGES + lastViewedAt);
          addedNewMessagesIndicator = true;
        }

        out.push(post.id);
      }

      // Flip it back to newest to oldest
      return out.reverse();
    },
  );
}

export function makeCombineUserActivityPosts() {
  const getPostsForIds = makeGetPostsForIds();

  return createIdsSelector(
    'makeCombineUserActivityPosts',
    (state: RootState, postIds: string[]) => postIds,
    (state: RootState, postIds: string[]) => getPostsForIds(state, postIds),
    (postIds: string[], posts: Post[]) => {
      let lastPostIsUserActivity = false;
      let combinedCount = 0;
      const out: string[] = [];
      let changed = false;

      for (let i = 0; i < postIds.length; i++) {
        const postId = postIds[i];
        if (isStartOfNewMessages(postId) || isDateLine(postId) || isCreateComment(postId)) {
          // Not a post, so it won't be combined
          out.push(postId);

          lastPostIsUserActivity = false;
          combinedCount = 0;

          continue;
        }
        const post = posts[i];
        const postIsUserActivity = isUserActivityPost(post.type);
        if (postIsUserActivity && lastPostIsUserActivity && combinedCount < MAX_COMBINED_SYSTEM_POSTS) {
          // Add the ID to the previous combined post
          out[out.length - 1] += '_' + postId;

          combinedCount += 1;

          changed = true;
        } else if (postIsUserActivity) {
          // Start a new combined post, even if the "combined" post is only a single post
          out.push(COMBINED_USER_ACTIVITY + postId);

          combinedCount = 1;

          changed = true;
        } else {
          out.push(postId);

          combinedCount = 0;
        }

        lastPostIsUserActivity = postIsUserActivity;
      }

      if (!changed) {
        // Nothing was combined, so return the original array
        return postIds;
      }

      return out;
    },
  );
}

export function makePreparePostIdsForPostList() {
  const filterPostsAndAddSeparators = makeFilterPostsAndAddSeparators();
  const combineUserActivityPosts = makeCombineUserActivityPosts();
  return (state: RootState, options: PostFilterOptions) => {
    let postIds = filterPostsAndAddSeparators(state, options);
    postIds = combineUserActivityPosts(state, postIds);
    return postIds;
  };
}



export const getUnreadPostsChunk = (state: RootState, channelId: Channel['id'], timeStamp: number): PostOrderBlock | undefined | null => {
  const postsEntity = state.entities.posts;
  const posts = postsEntity.posts;
  const recentChunk = getRecentPostsChunkInChannel(state, channelId);

  /* 1. lastViewedAt can be greater than the most recent chunk in case of edited posts etc.
        * return if recent block exists and oldest post is created after the last lastViewedAt timestamp
        i.e all posts are read and the lastViewedAt is greater than the last post

     2. lastViewedAt can be less than the first post in a channel if all the last viewed posts are deleted
        * return if oldest block exist and oldest post created_at is greater than the last viewed post
        i.e all posts are unread so the lastViewedAt is lessthan the first post

    The above two exceptions are added because we cannot select the chunk based on timestamp alone as these cases are out of bounds

    3. Normal cases where there are few unreads and few reads in a chunk as that is how unread API returns data
        * return getPostsChunkInChannelAroundTime
  */

  if (recentChunk) {
    // This would happen if there are no posts in channel.
    // If the system messages are deleted by sys admin.
    // Experimental changes like hiding Join/Leave still will have recent chunk so it follows the default path based on timestamp
    if (!recentChunk.order.length) {
      return recentChunk;
    }

    const {order} = recentChunk;
    const oldestPostInBlock = posts[order[order.length - 1]];

    // check for only oldest posts because this can be higher than the latest post if the last post is edited
    if (oldestPostInBlock.create_at <= timeStamp) {
      return recentChunk;
    }
  }

  const oldestPostsChunk = getOldestPostsChunkInChannel(state, channelId);

  if (oldestPostsChunk && oldestPostsChunk.order.length) {
    const {order} = oldestPostsChunk;
    const oldestPostInBlock = posts[order[order.length - 1]];

    if (oldestPostInBlock.create_at >= timeStamp) {
      return oldestPostsChunk;
    }
  }

  return getPostsChunkInChannelAroundTime(state, channelId, timeStamp);
}

// Get posts around post (for permalinks) - EXACT Mattermost pattern
export const makeGetPostsAroundPost = () =>
  createSelector(
    [
      (state: RootState, channelId: string, postId: string) => {
        const selector = makeGetPostsChunkAroundPost();
        return selector(state, channelId, postId);
      },
      (state: RootState) => state.entities.posts.posts,
    ],
    (chunk, allPosts) => {
      if (!chunk.order.length) {
        return [];
      }
      
      return chunk.order
        .map((postId: string) => allPosts[postId])
        .filter(Boolean);
    }
  );

// Sélecteur pour l'état de chargement des unreads
export const selectIsLoadingUnreads = (state: RootState, channelId: string): boolean => {
  return state.entities.posts.channelPagination[channelId]?.isLoading || false;
};

// Factory pour créer un sélecteur memoized par channel
export const makeGetPostsAndMetadata = () => 
  createSelector(
    [
      (state: RootState, channelId: string) => getPostIdsInChannel(state, channelId),
      (state: RootState) => state.entities.posts.posts,
      (state: RootState, channelId: string) => state.entities.posts.channelPagination[channelId],
    ],
    (postIds, allPosts, pagination) => {
      const posts = postIds ? postIds.map(postId => allPosts[postId]).filter(Boolean) : [];
      
      return {
        posts,
        hasOlderPosts: pagination?.hasOlderPosts || false,
        hasNewerPosts: pagination?.hasNewerPosts || false,
        oldestPostId: pagination?.oldestPostId || null,
        newestPostId: pagination?.newestPostId || null,
        isLoading: pagination?.isLoading || false,
        error: pagination?.error || null,
      };
    }
  );

// Get posts and metadata for channel - EXACT Mattermost pattern (deprecated, use makeGetPostsAndMetadata)
export const getPostsAndMetadata = makeGetPostsAndMetadata();

// Check if should show more messages indicator - EXACT Mattermost pattern
export const getShouldShowMoreMessagesIndicator = createSelector(
  [
    (state: RootState, channelId: string) => state.entities.posts.channelPagination[channelId],
    (state: RootState, channelId: string) => getPostIdsInChannel(state, channelId),
  ],
  (pagination, postIds) => {
    if (!pagination) return false;
    
    const hasOlderPosts = pagination.hasOlderPosts;
    const hasNoPostsLoaded = !postIds || postIds.length === 0;
    
    return hasOlderPosts && !hasNoPostsLoaded;
  }
);

// Get first post ID in channel - EXACT Mattermost pattern
export const getFirstPostId = (state: RootState, channelId: string): string | null => {
  const postIds = getPostIdsInChannel(state, channelId);
  return postIds && postIds.length > 0 ? postIds[0] : null;
};

// Get last post ID in channel - EXACT Mattermost pattern
export const getLastPostId = (state: RootState, channelId: string): string | null => {
  const postIds = getPostIdsInChannel(state, channelId);
  return postIds && postIds.length > 0 ? postIds[postIds.length - 1] : null;
};

// Get post index in channel - EXACT Mattermost pattern
export const getPostIndex = (state: RootState, channelId: string, postId: string): number => {
  const postIds = getPostIdsInChannel(state, channelId);
  if (!postIds) return -1;
  
  return postIds.indexOf(postId);
};

// Check if post is first in channel - EXACT Mattermost pattern
export const isFirstPost = (state: RootState, channelId: string, postId: string): boolean => {
  const firstPostId = getFirstPostId(state, channelId);
  return firstPostId === postId;
};

// Check if post is last in channel - EXACT Mattermost pattern
export const isLastPost = (state: RootState, channelId: string, postId: string): boolean => {
  const lastPostId = getLastPostId(state, channelId);
  return lastPostId === postId;
};

// Get posts before specific post - EXACT Mattermost pattern
export const getPostsBefore = createSelector(
  [
    (state: RootState, channelId: string, postId: string) => getPostIdsInChannel(state, channelId),
    (state: RootState) => state.entities.posts.posts,
    (state: RootState, channelId: string, postId: string) => postId,
  ],
  (postIds, allPosts, targetPostId) => {
    if (!postIds || postIds.length === 0) return [];
    
    const targetIndex = postIds.indexOf(targetPostId);
    if (targetIndex === -1) return [];
    
    return postIds
      .slice(0, targetIndex)
      .map(postId => allPosts[postId])
      .filter(Boolean);
  }
);

// Get posts after specific post - EXACT Mattermost pattern
export const getPostsAfter = createSelector(
  [
    (state: RootState, channelId: string, postId: string) => getPostIdsInChannel(state, channelId),
    (state: RootState) => state.entities.posts.posts,
    (state: RootState, channelId: string, postId: string) => postId,
  ],
  (postIds, allPosts, targetPostId) => {
    if (!postIds || postIds.length === 0) return [];
    
    const targetIndex = postIds.indexOf(targetPostId);
    if (targetIndex === -1) return [];
    
    return postIds
      .slice(targetIndex + 1)
      .map(postId => allPosts[postId])
      .filter(Boolean);
  }
);

// Get posts since timestamp - EXACT Mattermost pattern
export const getPostsSince = createSelector(
  [
    (state: RootState, channelId: string, timestamp: number) => {
      const postIds = getPostIdsInChannel(state, channelId);
      return postIds ? postIds.map(postId => state.entities.posts.posts[postId]).filter(Boolean) : [];
    },
    (state: RootState, channelId: string, timestamp: number) => timestamp,
  ],
  (posts, sinceTimestamp) => {
    return posts.filter((post: any) => post.create_at > sinceTimestamp);
  }
);

// Get next post in channel - EXACT Mattermost pattern
export const getNextPostId = (state: RootState, channelId: string, postId: string): string | null => {
  const postIds = getPostIdsInChannel(state, channelId);
  if (!postIds) return null;
  
  const currentIndex = postIds.indexOf(postId);
  if (currentIndex === -1 || currentIndex >= postIds.length - 1) return null;
  
  return postIds[currentIndex + 1];
};

// Get previous post in channel - EXACT Mattermost pattern
export const getPreviousPostId = (state: RootState, channelId: string, postId: string): string | null => {
  const postIds = getPostIdsInChannel(state, channelId);
  if (!postIds) return null;
  
  const currentIndex = postIds.indexOf(postId);
  if (currentIndex <= 0) return null;
  
  return postIds[currentIndex - 1];
};

// Get posts in date range - EXACT Mattermost pattern
export const getPostsInDateRange = createSelector(
  [
    (state: RootState, channelId: string, startTime: number, endTime: number) => {
      const postIds = getPostIdsInChannel(state, channelId);
      return postIds ? postIds.map(postId => state.entities.posts.posts[postId]).filter(Boolean) : [];
    },
    (state: RootState, channelId: string, startTime: number, endTime: number) => startTime,
    (state: RootState, channelId: string, startTime: number, endTime: number) => endTime,
  ],
  (posts, startTime, endTime) => {
    return posts.filter((post: any) => 
      post.create_at >= startTime && post.create_at <= endTime
    );
  }
);

// Make selector for posts in thread - EXACT Mattermost pattern
export const makeGetPostsInThread = () =>
  createSelector(
    [
      (state: RootState, threadId: string) => state.entities.posts.postsInThread[threadId] || [],
      (state: RootState) => state.entities.posts.posts,
    ],
    (postIds, allPosts) => {
      return postIds
        .map(postId => allPosts[postId])
        .filter(Boolean)
        .sort((a, b) => a.create_at - b.create_at);
    }
  );

// Loading state for posts in channel - Direct selector to avoid identity warning
export const selectPostsLoading = (state: RootState, channelId: string) => 
  state.entities.posts.channelPagination[channelId]?.isLoading || false;

// Loading older posts - Direct selector to avoid identity warning
export const selectLoadingOlderPosts = (state: RootState, channelId: string) => 
  state.entities.posts.channelPagination[channelId]?.isLoadingOlder || false;

// Loading newer posts - Direct selector to avoid identity warning
export const selectLoadingNewerPosts = (state: RootState, channelId: string) => 
  state.entities.posts.channelPagination[channelId]?.isLoadingNewer || false;

// Get oldest post ID for pagination - Direct selector to avoid identity warning
export const selectOldestPostId = (state: RootState, channelId: string) => 
  state.entities.posts.channelPagination[channelId]?.oldestPostId;

// Get latest post ID for pagination - Direct selector to avoid identity warning
export const selectLatestPostId = (state: RootState, channelId: string) => 
  state.entities.posts.channelPagination[channelId]?.newestPostId;

// Check if at oldest post (no more older posts available) - Direct selector to avoid identity warning
export const selectAtOldestPost = (state: RootState, channelId: string) => 
  !state.entities.posts.channelPagination[channelId]?.hasOlderPosts;

// Check if at latest post (no more newer posts available) - Direct selector to avoid identity warning
export const selectAtLatestPost = (state: RootState, channelId: string) => 
  !state.entities.posts.channelPagination[channelId]?.hasNewerPosts;

// Get posts error for channel - Direct selector to avoid identity warning
export const selectPostsError = (state: RootState, channelId: string) => 
  state.entities.posts.channelPagination[channelId]?.error || null;

// Get more posts availability flags
export const selectHasMorePosts = createSelector(
  [
    (state: RootState, channelId: string) => state.entities.posts.channelPagination[channelId]?.hasOlderPosts || false,
    (state: RootState, channelId: string) => state.entities.posts.channelPagination[channelId]?.hasNewerPosts || false,
  ],
  (hasOlderPosts, hasNewerPosts) => hasOlderPosts || hasNewerPosts
);

// Get unread posts chunk info (Mattermost pattern)
export const selectUnreadPostsChunk = createSelector(
  [
    (state: RootState, channelId: string) => {
      const postIds = getPostIdsInChannel(state, channelId) || [];
      return postIds.map(postId => state.entities.posts.posts[postId]).filter(Boolean);
    },
    (state: RootState, channelId: string) => state.entities.channels.myMembers[channelId]?.last_viewed_at,
  ],
  (posts, lastViewedAt) => {
    if (!lastViewedAt || posts.length === 0) {
      return { unreadIndex: -1, hasUnread: false, lastViewedAt: 0 };
    }
    
    // Find first unread post
    const unreadIndex = posts.findIndex((post: any) => post.create_at > lastViewedAt);
    
    return {
      unreadIndex: unreadIndex === -1 ? -1 : unreadIndex,
      hasUnread: unreadIndex !== -1,
      lastViewedAt
    };
  }
);

// Get unread divider info (for display)
export const selectUnreadDividerInfo = createSelector(
  [
    (state: RootState, channelId: string) => selectUnreadPostsChunk(state, channelId),
    (state: RootState, channelId: string) => {
      const postIds = getPostIdsInChannel(state, channelId) || [];
      return postIds.map(postId => state.entities.posts.posts[postId]).filter(Boolean);
    },
  ],
  (unreadChunk, posts) => {
    if (!unreadChunk.hasUnread || unreadChunk.unreadIndex === -1) {
      return { shouldShow: false, unreadCount: 0, postId: null };
    }
    
    const unreadCount = posts.length - unreadChunk.unreadIndex;
    const postId = posts[unreadChunk.unreadIndex]?.id || null;
    
    return {
      shouldShow: true,
      unreadCount,
      postId
    };
  }
);

/**
 * Simple direct selector for channel by ID (Simplified stable approach)
 * Avoids factory pattern to prevent selector instability warnings
 */
export const selectPreferedChannelScrollPosition = createSelector(
  [
    (state: RootState) => state.preferences.preferences,
  ],
  (
    preferences,
  ): any => {
    const preference = getPreference(preferences, 'advanced_settings', 'unread_scroll_position', "start_from_left_off")

    return preference;
  },
);

// ============================================================================
// COMBINED MESSAGE SELECTORS (pour éviter les warnings de re-renders)
// ============================================================================

/**
 * Créer un sélecteur mémorisé pour les posts combinés
 * Évite les nouveaux objets à chaque rendu
 */
export const createSelectCombinedMessagePosts = () =>
  createSelector(
    [
      (state: RootState, postIds: string[]) => postIds.map(id => getPost(state, id)).filter(Boolean),
      (state: RootState, postIds: string[], previousPostId?: string) => 
        previousPostId ? getPost(state, previousPostId) : null,
    ],
    (posts, previousPost) => ({
      posts,
      previousPost,
    })
  );

