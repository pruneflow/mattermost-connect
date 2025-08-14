import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../index";

export const selectAllPosts = (state: RootState) => state.posts.posts;

// Empty array references to avoid rerenders - frozen for immutability
const EMPTY_STRING_ARRAY = Object.freeze([]) as readonly string[];

// Memoized selectors for posts with parameters
export const selectPostsInChannel = createSelector(
  [(state: RootState) => state.posts.postsInChannel, (state: RootState, channelId: string) => channelId],
  (postsInChannel, channelId) => postsInChannel[channelId] || EMPTY_STRING_ARRAY
);

export const selectChannelPostsMetadata = createSelector(
  [(state: RootState) => state.posts.channelMetadata, (state: RootState, channelId: string) => channelId],
  (channelMetadata, channelId) => channelMetadata[channelId] || null
);

export const selectPostById = createSelector(
  [(state: RootState) => state.posts.posts, (state: RootState, postId: string) => postId],
  (posts, postId) => posts[postId] || null
);

// Loading states - memoized selectors
export const selectChannelLoadingState = createSelector(
  [selectChannelPostsMetadata],
  (metadata) => metadata?.loadingState || 'none'
);

export const selectIsLoadingOlderPosts = createSelector(
  [selectChannelLoadingState],
  (loadingState) => loadingState === 'older'
);

export const selectIsLoadingNewerPosts = createSelector(
  [selectChannelLoadingState],
  (loadingState) => loadingState === 'newer'
);

export const selectIsLoadingUnreads = createSelector(
  [selectChannelLoadingState],
  (loadingState) => loadingState === 'unreads'
);

export const selectIsSyncing = createSelector(
  [selectChannelLoadingState],
  (loadingState) => loadingState === 'syncing'
);

export const selectIsChannelLoading = createSelector(
  [selectChannelLoadingState],
  (loadingState) => loadingState !== 'none'
);

// Boundary states - memoized selectors
export const selectHasLoadedLatestPost = createSelector(
  [selectChannelPostsMetadata],
  (metadata) => metadata?.hasLoadedLatestPost || false
);

export const selectHasLoadedOldestPost = createSelector(
  [selectChannelPostsMetadata],
  (metadata) => metadata?.hasLoadedOldestPost || false
);

export const selectOldestPostId = createSelector(
  [selectChannelPostsMetadata],
  (metadata) => metadata?.oldestPostId || null
);

export const selectNewestPostId = createSelector(
  [selectChannelPostsMetadata],
  (metadata) => metadata?.newestPostId || null
);


export const selectNewMessagesSeparatorIndex = createSelector(
  [selectChannelPostsMetadata],
  (metadata) => metadata?.newMessagesSeparatorIndex || -1
);

export const selectNewMessagesCount = createSelector(
  [selectNewMessagesSeparatorIndex],
  (separatorIndex) => separatorIndex >= 0 ? separatorIndex : 0
);

// Utility selectors - memoized functions
export const selectCanLoadOlderPosts = createSelector(
  [selectChannelLoadingState, selectHasLoadedOldestPost, selectOldestPostId],
  (loadingState, hasLoadedOldest, oldestPostId) => 
    loadingState === 'none' && !hasLoadedOldest && !!oldestPostId
);

export const selectCanLoadNewerPosts = createSelector(
  [selectChannelLoadingState, selectHasLoadedLatestPost, selectNewestPostId],
  (loadingState, hasLoadedLatest, newestPostId) => 
    loadingState === 'none' && !hasLoadedLatest && !!newestPostId
);

export const selectCanLoadUnreads = createSelector(
  [selectChannelLoadingState],
  (loadingState) => loadingState === 'none'
);

export const selectCanSyncPosts = createSelector(
  [selectChannelLoadingState],
  (loadingState) => loadingState === 'none'
);

// WebSocket safety check
export const selectCanReceiveWebSocketPosts = createSelector(
  [selectHasLoadedLatestPost],
  (hasLoadedLatest) => hasLoadedLatest
);

// Channel statistics - memoized selectors
export const selectChannelPostsCount = createSelector(
  [selectPostsInChannel],
  (postIds) => postIds.length
);

export const selectChannelHasPosts = createSelector(
  [selectChannelPostsCount],
  (count) => count > 0
);

// Debug selector - memoized function
export const selectChannelDebugInfo = createSelector(
  [selectPostsInChannel, selectChannelPostsMetadata],
  (postIds, metadata) => ({
    postCount: postIds.length,
    hasLatest: metadata?.hasLoadedLatestPost || false,
    hasOldest: metadata?.hasLoadedOldestPost || false,
    loading: metadata?.loadingState || 'none',
    oldestId: metadata?.oldestPostId,
    newestId: metadata?.newestPostId,
    firstPostId: postIds[0] || null,
    lastPostId: postIds[postIds.length - 1] || null,
  })
);