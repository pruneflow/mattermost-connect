import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { Post } from '@mattermost/types/posts';
import {
  selectPostsInChannel,
  selectAllPosts,
  selectHasLoadedLatestPost,
  selectHasLoadedOldestPost,
} from './postsSelectors';
import {
  selectCurrentUserId,
  selectChannelById,
} from '../selectors';

// Optimized selector for channel-specific posts with equality check
const selectChannelSpecificPosts = createSelector(
  [
    (state: RootState, channelId: string) => selectPostsInChannel(state, channelId),
    selectAllPosts,
  ],
  (postIds: string[] | null, allPosts: Record<string, Post>): Record<string, Post> => {
    const result: Record<string, Post> = {};
    if (postIds && Array.isArray(postIds)) {
      for (const postId of postIds) {
        if (allPosts[postId]) {
          result[postId] = allPosts[postId];
        }
      }
    }
    return result;
  },
  {
    memoizeOptions: {
      // Only recalculate if postIds array changes (by reference) or if any of the specific posts change
      resultEqualityCheck: (a: Record<string, Post>, b: Record<string, Post>) => {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        
        // Check if same number of posts
        if (aKeys.length !== bKeys.length) return false;
        
        // Check if same post IDs and same post references
        for (const key of aKeys) {
          if (!b[key] || a[key] !== b[key]) return false;
        }
        
        return true;
      }
    }
  }
);

// Default data structure for virtualized messages
export const DEFAULT_VIRTUALIZED_MESSAGES_DATA = Object.freeze({
  postIds: Object.freeze([]) as readonly string[],
  channelPosts: Object.freeze({}),
  atLatestPost: false,
  atOldestPost: false,
  currentUserId: null,
  channelType: 'O',
  unreadCount: 0,
  lastViewedAt: 0,
  channel: null,
  channelMember: null,
});

// Granular selectors to avoid unnecessary re-renders
const selectChannelType = createSelector(
  [(state: RootState, channelId: string) => selectChannelById(state, channelId)],
  (channel) => channel?.type || 'O'
);

const selectChannelUnreadCount = createSelector(
  [(state: RootState, channelId: string) => selectChannelById(state, channelId)],
  (channel) => channel?.unreadCount || 0
);

const selectChannelLastViewedAt = createSelector(
  [(state: RootState, channelId: string) => state.entities.channels.myMembers[channelId] || null],
  (channelMember) => channelMember?.last_viewed_at || 0
);

// Direct selector for virtualized messages data 
export const selectVirtualizedMessagesData = createSelector(
  [
    (state: RootState, channelId: string) => selectChannelSpecificPosts(state, channelId),
    (state: RootState, channelId: string) => selectHasLoadedLatestPost(state, channelId),
    (state: RootState, channelId: string) => selectHasLoadedOldestPost(state, channelId),
    selectCurrentUserId,
    (state: RootState, channelId: string) => selectChannelType(state, channelId),
    (state: RootState, channelId: string) => selectChannelUnreadCount(state, channelId),
    (state: RootState, channelId: string) => selectChannelLastViewedAt(state, channelId),
  ],
  (
    channelPosts,
    atLatestPost,
    atOldestPost,
    currentUserId,
    channelType,
    unreadCount,
    lastViewedAt
  ) => {
    const postIds = Object.keys(channelPosts);
    
    
    return {
      postIds,
      channelPosts,
      atLatestPost,
      atOldestPost,
      currentUserId,
      channelType,
      unreadCount,
      lastViewedAt
    };
  }
);