import { useCallback, useEffect, useRef, useMemo } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { RootState } from '../store';
import { 
  updatePost, 
  deletePost, 
  toggleReaction,
  createPostWithAutoLoad,
  loadOlderPosts as loadOlderPostsThunk, 
  loadNewerPosts as loadNewerPostsThunk, 
  loadUnreadPosts as loadUnreadPostsThunk, 
  syncPostsInChannel as syncPostsInChannelThunk
} from '../store/slices/postsSlice';
import {
  selectIsLoadingNewerPosts,
  selectIsLoadingOlderPosts,
  selectIsLoadingUnreads, 
  selectIsSyncing,
  selectHasLoadedLatestPost,
  selectHasLoadedOldestPost,
  selectPostsInChannel,
  selectChannelHasPosts,
  selectIsChannelLoading
} from "../store/selectors/postsSelectors";

interface UseMessagesProps {
  channelId: string;
}

export const useMessages = (props?: UseMessagesProps) => {
  const dispatch = useAppDispatch();
  const loadedChannelsRef = useRef<Set<string>>(new Set());
  
  const channelId = props?.channelId;
  
  // Create stable selectors with useMemo to avoid inline functions
  const EMPTY_ARRAY = useMemo(() => [], []);
  
  const stableSelectors = useMemo(() => {
    if (!channelId) {
      return {
        selectIsLoadingOlder: () => false,
        selectIsLoadingNewer: () => false,
        selectIsLoadingUnreads: () => false,
        selectIsSyncing: () => false,
        selectAtOldestPost: () => false,
        selectAtLatestPost: () => false,
        selectPostIds: () => EMPTY_ARRAY,
        selectHasPosts: () => false,
        selectIsChannelLoading: () => false
      };
    }
    
    return {
      selectIsLoadingOlder: (state: RootState) => selectIsLoadingOlderPosts(state, channelId),
      selectIsLoadingNewer: (state: RootState) => selectIsLoadingNewerPosts(state, channelId),
      selectIsLoadingUnreads: (state: RootState) => selectIsLoadingUnreads(state, channelId),
      selectIsSyncing: (state: RootState) => selectIsSyncing(state, channelId),
      selectAtOldestPost: (state: RootState) => selectHasLoadedOldestPost(state, channelId),
      selectAtLatestPost: (state: RootState) => selectHasLoadedLatestPost(state, channelId),
      selectPostIds: (state: RootState) => selectPostsInChannel(state, channelId),
      selectHasPosts: (state: RootState) => selectChannelHasPosts(state, channelId),
      selectIsChannelLoading: (state: RootState) => selectIsChannelLoading(state, channelId)
    };
  }, [channelId]);
  
  const isLoadingOlder = useAppSelector(stableSelectors.selectIsLoadingOlder);
  const isLoadingNewer = useAppSelector(stableSelectors.selectIsLoadingNewer);
  const isLoadingUnreads = useAppSelector(stableSelectors.selectIsLoadingUnreads);
  const isSyncing = useAppSelector(stableSelectors.selectIsSyncing);
  const atOldestPost = useAppSelector(stableSelectors.selectAtOldestPost);
  const atLatestPost = useAppSelector(stableSelectors.selectAtLatestPost);
  const postIds = useAppSelector(stableSelectors.selectPostIds);
  const hasPosts = useAppSelector(stableSelectors.selectHasPosts);

  // Initial load effect for channel
  useEffect(() => {
    if (
      channelId && 
      !loadedChannelsRef.current.has(channelId) && 
      !hasPosts && 
      !isLoadingUnreads
    ) {
      console.log('Loading initial posts for channel:', channelId);
      loadedChannelsRef.current.add(channelId);
      dispatch(loadUnreadPostsThunk({ channelId }));
    }
  }, [channelId, hasPosts, isLoadingUnreads, dispatch]);

  // Message management actions
  const loadOlderPosts = useCallback(async () => {
    if (!channelId || isLoadingOlder) return;
    try {
      await dispatch(loadOlderPostsThunk({ channelId })).unwrap();
    } catch (error) {
      console.error('Failed to load older posts:', error);
    }
  }, [dispatch, channelId, isLoadingOlder, atOldestPost, postIds]);

  const loadNewerPosts = useCallback(async () => {
    if (!channelId || isLoadingNewer || atLatestPost || postIds.length === 0) return;

    const newestPostId = postIds[0]; // First in array = newest
    if (!newestPostId) return;

    try {
      await dispatch(loadNewerPostsThunk({
        channelId,
      })).unwrap();
    } catch (error) {
      console.error('Failed to load newer posts:', error);
    }
  }, [dispatch, channelId, isLoadingNewer, atLatestPost, postIds]);

  const loadUnreadPosts = useCallback(async () => {
    if (!channelId || isLoadingUnreads) return;

    try {
      await dispatch(loadUnreadPostsThunk({ channelId })).unwrap();
    } catch (error) {
      console.error('Failed to load unread posts:', error);
    }
  }, [dispatch, channelId, isLoadingUnreads]);

  const syncPosts = useCallback(async (since: number) => {
    if (!channelId || isSyncing) return;

    try {
      await dispatch(syncPostsInChannelThunk({
        channelId,
        since,
      })).unwrap();
    } catch (error) {
      console.error('Failed to sync posts:', error);
    }
  }, [dispatch, channelId, isSyncing]);

  const updateMessage = useCallback(async (postId: string, message: string) => {
    try {
      await dispatch(updatePost({ postId, message })).unwrap();
      return true;
    } catch (error) {
      console.error('Failed to update message:', error);
      throw error;
    }
  }, [dispatch]);

  const deleteMessage = useCallback(async (postId: string) => {
    try {
      await dispatch(deletePost({ postId })).unwrap();
      return true;
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  }, [dispatch]);

  const copyMessage = useCallback(async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      return true;
    } catch (error) {
      console.error('Failed to copy message:', error);
      throw error;
    }
  }, []);

  const sendMessage = useCallback(async (message: string, rootId?: string, fileIds?: string[]) => {
    if (!channelId) {
      throw new Error('No channel selected');
    }

    try {
      const result = await dispatch(createPostWithAutoLoad({
        channelId,
        message,
        rootId,
        fileIds,
      })).unwrap();
      return result.post;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [dispatch, channelId]);

  return {
    sendMessage,
    updateMessage,
    deleteMessage,
    copyMessage,
    loadOlderPosts,
    loadNewerPosts,
    loadUnreadPosts,
    syncPosts,
    isLoadingOlder,
    isLoadingNewer,
    isLoadingUnreads,
    isSyncing,
    atOldestPost,
    atLatestPost,
  };
};

// Hook spécifique pour les réactions
export const useReactionToggle = (postId: string) => {
  const dispatch = useAppDispatch();

  const toggleReactionHandler = useCallback(async (emojiName: string) => {
    try {
      await dispatch(toggleReaction({ postId, emojiName })).unwrap();
      return true;
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
      throw error;
    }
  }, [dispatch, postId]);

  return {
    toggleReaction: toggleReactionHandler,
  };
};