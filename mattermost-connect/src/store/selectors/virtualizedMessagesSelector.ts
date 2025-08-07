import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
  selectPostsInChannel,
  selectAllPosts,
  selectHasLoadedLatestPost,
  selectHasLoadedOldestPost,
} from './postsSelectors';
import {
  selectCurrentUserId,
  selectChannelById,
  selectMyChannelMember,
} from '../selectors';

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

// Direct selector for virtualized messages data 
export const selectVirtualizedMessagesData = createSelector(
  [
    (state: RootState, channelId: string) => selectPostsInChannel(state, channelId),
    selectAllPosts,
    (state: RootState, channelId: string) => selectHasLoadedLatestPost(state, channelId),
    (state: RootState, channelId: string) => selectHasLoadedOldestPost(state, channelId),
    selectCurrentUserId,
    (state: RootState, channelId: string) => selectChannelById(state, channelId),
    (state: RootState, channelId: string) => selectMyChannelMember(channelId)(state),
  ],
  (
    postIds,
    allPosts,
    atLatestPost,
    atOldestPost,
    currentUserId,
    channel,
    channelMember
  ) => ({
    postIds,
    channelPosts: allPosts,
    atLatestPost,
    atOldestPost,
    currentUserId,
    channelType: channel?.type || 'O',
    unreadCount: channel?.unreadCount || 0,
    lastViewedAt: channelMember?.last_viewed_at || 0,
    channel,
    channelMember,
  })
);