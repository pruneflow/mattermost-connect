/**
 * Message service for handling post operations
 * Provides loading, sending, updating, and deleting messages
 */
import { store } from '../store';
import { 
  updatePost, 
  deletePost,
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
  selectPostsInChannel
} from "../store/selectors/postsSelectors";

// Message loading actions
export const loadOlderPosts = async (channelId: string): Promise<void> => {
  if (!channelId) return;
  
  const state = store.getState();
  const isLoadingOlder = selectIsLoadingOlderPosts(state, channelId);
  
  if (isLoadingOlder) return;
  
  try {
    await store.dispatch(loadOlderPostsThunk({ channelId })).unwrap();
  } catch (error) {
    throw error;
  }
};

export const loadNewerPosts = async (channelId: string): Promise<void> => {
  if (!channelId) return;
  
  const state = store.getState();
  const isLoadingNewer = selectIsLoadingNewerPosts(state, channelId);
  const atLatestPost = selectHasLoadedLatestPost(state, channelId);
  const postIds = selectPostsInChannel(state, channelId);
  
  if (isLoadingNewer || atLatestPost || postIds.length === 0) return;

  try {
    await store.dispatch(loadNewerPostsThunk({ channelId })).unwrap();
  } catch (error) {
    throw error;
  }
};

export const loadUnreadPosts = async (channelId: string): Promise<void> => {
  if (!channelId) return;
  
  const state = store.getState();
  const isLoadingUnreads = selectIsLoadingUnreads(state, channelId);
  
  if (isLoadingUnreads) return;

  try {
    await store.dispatch(loadUnreadPostsThunk({ channelId })).unwrap();
  } catch (error) {
    throw error;
  }
};

export const syncPosts = async (channelId: string, since: number): Promise<void> => {
  if (!channelId) return;
  
  const state = store.getState();
  const isSyncing = selectIsSyncing(state, channelId);
  
  if (isSyncing) return;

  try {
    await store.dispatch(syncPostsInChannelThunk({
      channelId,
      since,
    })).unwrap();
  } catch (error) {
    throw error;
  }
};

// Message management actions
export const updateMessage = async (postId: string, message: string, fileIds?: string[]): Promise<boolean> => {
  try {
    await store.dispatch(updatePost({ postId, message, fileIds })).unwrap();
    return true;
  } catch (error) {
    throw error;
  }
};

export const deleteMessage = async (postId: string): Promise<boolean> => {
  try {
    await store.dispatch(deletePost({ postId })).unwrap();
    return true;
  } catch (error) {
    throw error;
  }
};

export const copyMessage = async (message: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(message);
    return true;
  } catch (error) {
    throw error;
  }
};

export const sendMessage = async (
  channelId: string, 
  message: string, 
  rootId?: string, 
  fileIds?: string[]
): Promise<any> => {
  if (!channelId) {
    throw new Error('No channel selected');
  }

  try {
    const result = await store.dispatch(createPostWithAutoLoad({
      channelId,
      message,
      rootId,
      fileIds,
    })).unwrap();
    return result.post;
  } catch (error) {
    throw error;
  }
};