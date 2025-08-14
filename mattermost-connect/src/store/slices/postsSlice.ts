import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Post } from '@mattermost/types/posts';
import { client } from "../../api/client";
import { PostList } from "../../api/types";
import { loadThread } from './threadsSlice';

// Loading states - only one operation at a time per channel
export type LoadingState = 'none' | 'older' | 'newer' | 'unreads' | 'syncing';

// Channel metadata interface
export interface ChannelPostsMetadata {
  oldestPostId: string | null;
  newestPostId: string | null;
  hasLoadedLatestPost: boolean; // Critical for WebSocket logic
  hasLoadedOldestPost: boolean;
  loadingState: LoadingState;
  newMessagesSeparatorIndex: number;
}

// Main state interface
export interface PostsState {
  posts: Record<string, Post>;
  postsInChannel: Record<string, string[]>; // channelId -> postIds (newest first)
  channelMetadata: Record<string, ChannelPostsMetadata>;
}

// Initial state
const initialChannelMetadata: ChannelPostsMetadata = {
  oldestPostId: null,
  newestPostId: null,
  hasLoadedLatestPost: false,
  hasLoadedOldestPost: false,
  loadingState: 'none',
  newMessagesSeparatorIndex: -1,
};

const initialState: PostsState = {
  posts: {},
  postsInChannel: {},
  channelMetadata: {},
};


// Async thunks
export const loadOlderPosts = createAsyncThunk(
  'posts/loadOlderPosts',
  async ({ channelId, perPage = 60 }: { channelId: string; perPage?: number }, 
  { getState, rejectWithValue, dispatch }) => {
    try {
      const state = getState() as { posts: PostsState };
      const metadata = state.posts.channelMetadata[channelId];
      
      // Only proceed if not loading and not at oldest
      if (metadata && (metadata.loadingState !== 'none' || metadata.hasLoadedOldestPost)) {
        return rejectWithValue('Cannot load older posts');
      }

      const oldestPostId = metadata.oldestPostId;
      if (!oldestPostId) {
        return rejectWithValue('No oldest post ID available');
      }

      // Set loading state immediately
      dispatch(postsSlice.actions.setLoadingState({ channelId, loadingState: 'older' }));

      const response = await client.getPostsBefore(channelId, oldestPostId, 0, perPage);

      return {
        channelId,
        posts: response.posts,
        order: response.order,
        hasReachedOldest: !response.prev_post_id,
      };
    } catch (error) {
      // Reset loading state on error
      dispatch(postsSlice.actions.setLoadingState({ channelId, loadingState: 'none' }));
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load older posts');
    }
  }
);

export const loadNewerPosts = createAsyncThunk(
  'posts/loadNewerPosts',
  async ({ channelId, perPage = 60 }: { channelId: string; perPage?: number }, 
  { getState, rejectWithValue, dispatch }) => {
    try {
      const state = getState() as { posts: PostsState };
      const metadata = state.posts.channelMetadata[channelId];
      
      // Only proceed if not loading and not at latest
      if (metadata && (metadata.loadingState !== 'none' || metadata.hasLoadedLatestPost)) {
        return rejectWithValue('Cannot load newer posts');
      }

      const newestPostId = metadata.newestPostId;
      if (!newestPostId) {
        return rejectWithValue('No newest post ID available');
      }

      // Set loading state immediately
      dispatch(postsSlice.actions.setLoadingState({ channelId, loadingState: 'newer' }));

      const response = await client.getPostsAfter(channelId, newestPostId, 0, perPage);

      return {
        channelId,
        posts: response.posts,
        order: response.order,
        hasReachedLatest: !response.next_post_id,
      };
    } catch (error) {
      // Reset loading state on error
      dispatch(postsSlice.actions.setLoadingState({ channelId, loadingState: 'none' }));
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load newer posts');
    }
  }
);

export const loadUnreadPosts = createAsyncThunk(
  'posts/loadUnreadPosts',
  async ({ channelId, perPage = 60 }: { channelId: string; perPage?: number }, 
  { getState, rejectWithValue, dispatch }) => {
    try {
      const state = getState() as { posts: PostsState, entities: { users: { currentUserId: string } } };
      const metadata = state.posts.channelMetadata[channelId];
      
      // Only proceed if not loading
      if (metadata && metadata.loadingState !== 'none') {
        return rejectWithValue('Cannot load unread posts - already loading');
      }

      const userId = state.entities.users.currentUserId;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Set loading state immediately
      dispatch(postsSlice.actions.setLoadingState({ channelId, loadingState: 'unreads' }));

      // EXACT Mattermost API call
      const response = await client.getPostsUnread(
        channelId,
        userId,
        perPage / 2,
        perPage / 2,
        true,
        true,
        true,
      );

      return {
        channelId,
        posts: response.posts,
        order: response.order,
        hasReachedLatest: !response.next_post_id,
        hasReachedOldest: !response.prev_post_id,
      };
    } catch (error) {
      // Reset loading state on error
      dispatch(postsSlice.actions.setLoadingState({ channelId, loadingState: 'none' }));
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load unread posts');
    }
  }
);

export const syncPostsInChannel = createAsyncThunk(
  'posts/syncPostsInChannel',
  async ({ channelId, since }: { channelId: string; since: number }, 
  { getState, rejectWithValue, dispatch }) => {
    try {
      const state = getState() as { posts: PostsState };
      const metadata = state.posts.channelMetadata[channelId];
      
      // Only proceed if not loading
      if (metadata && metadata.loadingState !== 'none') {
        return rejectWithValue('Cannot sync posts - already loading');
      }

      // Set loading state immediately
      dispatch(postsSlice.actions.setLoadingState({ channelId, loadingState: 'syncing' }));

      const response = await client.getPostsSince(channelId, since);

      return {
        channelId,
        posts: response.posts,
        order: response.order,
      };
    } catch (error) {
      // Reset loading state on error
      dispatch(postsSlice.actions.setLoadingState({ channelId, loadingState: 'none' }));
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to sync posts');
    }
  }
);

export const addWebSocketPost = createAsyncThunk(
  'posts/addWebSocketPost',
  async (post: Post, { getState, rejectWithValue }) => {
    const state = getState() as { posts: PostsState };
    const metadata = state.posts.channelMetadata[post.channel_id];
    
    // Critical: Only add if we have loaded the latest posts
    if (!metadata?.hasLoadedLatestPost) {
      return rejectWithValue('Cannot add WebSocket post: latest posts not loaded');
    }
    
    return post;
  }
);

// Slice
const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    // Set loading state for a channel
    setLoadingState: (state, action: PayloadAction<{ channelId: string; loadingState: LoadingState }>) => {
      const { channelId, loadingState } = action.payload;
      if (!state.channelMetadata[channelId]) {
        state.channelMetadata[channelId] = { ...initialChannelMetadata };
      }
      state.channelMetadata[channelId].loadingState = loadingState;
    },

    // Set/update a single post (used by WebSocket)
    setPost: (state, action: PayloadAction<Post>) => {
      const post = action.payload;
      const channelId = post.channel_id;
      
      // Add/update post in entities
      state.posts[post.id] = post;
      
      // Add to channel posts if not already present
      if (!state.postsInChannel[channelId]) {
        state.postsInChannel[channelId] = [];
      }
      
      if (!state.postsInChannel[channelId].includes(post.id)) {
        // Add at the beginning (newest first)
        state.postsInChannel[channelId].unshift(post.id);
        
        // Update metadata
        if (!state.channelMetadata[channelId]) {
          state.channelMetadata[channelId] = { ...initialChannelMetadata };
        }
        state.channelMetadata[channelId].newestPostId = post.id;
      }
    },

    // Store post in global posts without adding to channel (for thread replies)
    storePostOnly: (state, action: PayloadAction<Post>) => {
      const post = action.payload;
      // Only store in global posts, don't add to any channel
      state.posts[post.id] = post;
    },

    // Remove a single post (used by WebSocket)
    removePost: (state, action: PayloadAction<string>) => {
      const postId = action.payload;
      const post = state.posts[postId];
      
      if (post) {
        const channelId = post.channel_id;
        
        // Remove from posts entities
        delete state.posts[postId];
        
        // Remove from channel posts
        if (state.postsInChannel[channelId]) {
          state.postsInChannel[channelId] = state.postsInChannel[channelId].filter(
            id => id !== postId
          );
        }
      }
    },

    // WebSocket-only actions (no API calls)
    addReactionFromWebSocket: (state, action: PayloadAction<{ postId: string; emojiName: string; userId: string }>) => {
      const { postId, emojiName, userId } = action.payload;
      const post = state.posts[postId];
      if (post) {
        if (!post.metadata) {
          post.metadata = {
            embeds: [],
            emojis: [],
            files: [],
            images: {},
            reactions: []
          };
        }
        if (!post.metadata.reactions) {
          post.metadata.reactions = [];
        }
        
        // Check if reaction already exists
        const existingReaction = post.metadata.reactions.find(
          (r: any) => r.emoji_name === emojiName && r.user_id === userId
        );
        
        if (!existingReaction) {
          post.metadata.reactions.push({
            emoji_name: emojiName,
            user_id: userId,
            post_id: postId,
            create_at: Date.now()
          });
        }
      }
    },

    removeReactionFromWebSocket: (state, action: PayloadAction<{ postId: string; emojiName: string; userId: string }>) => {
      const { postId, emojiName, userId } = action.payload;
      const post = state.posts[postId];
      if (post && post.metadata?.reactions) {
        post.metadata.reactions = post.metadata.reactions.filter(
          (r: any) => !(r.emoji_name === emojiName && r.user_id === userId)
        );
      }
    },
  },
  extraReducers: (builder) => {
    // Load older posts
    builder
      .addCase(loadOlderPosts.fulfilled, (state, action) => {
        const { channelId, posts, order, hasReachedOldest } = action.payload;
        
        // Add posts to entities
        Object.values(posts).forEach(post => {
          state.posts[post.id] = post;
        });
        
        
        // Update posts in channel (add at the end = older)
        const existingPosts = state.postsInChannel[channelId] || [];
        state.postsInChannel[channelId] = [...existingPosts, ...order];
        
        // Update metadata
        const metadata = state.channelMetadata[channelId];
        metadata.hasLoadedOldestPost = hasReachedOldest;  
        metadata.oldestPostId = order[order.length - 1] || metadata.oldestPostId;
        metadata.loadingState = 'none';
      })
      .addCase(loadOlderPosts.rejected, (state, action) => {
        const { channelId } = action.meta.arg;
        if (state.channelMetadata[channelId]) {
          state.channelMetadata[channelId].loadingState = 'none';
        }
      });

    // Load newer posts  
    builder
      .addCase(loadNewerPosts.fulfilled, (state, action) => {
        const { channelId, posts, order, hasReachedLatest } = action.payload;
        
        // Add posts to entities
        Object.values(posts).forEach(post => {
          state.posts[post.id] = post;
        });
        
        
        // Update posts in channel (add at the beginning = newer)
        const existingPosts = state.postsInChannel[channelId] || [];
        state.postsInChannel[channelId] = [...order, ...existingPosts];
        
        // Update metadata
        const metadata = state.channelMetadata[channelId];
        metadata.hasLoadedLatestPost = hasReachedLatest;
        metadata.newestPostId = order[0] || metadata.newestPostId;
        metadata.loadingState = 'none';
      })
      .addCase(loadNewerPosts.rejected, (state, action) => {
        const { channelId } = action.meta.arg;
        if (state.channelMetadata[channelId]) {
          state.channelMetadata[channelId].loadingState = 'none';
        }
      });

    // Load unread posts
    builder
      .addCase(loadUnreadPosts.fulfilled, (state, action) => {
        const { channelId, posts, order, hasReachedLatest, hasReachedOldest } = action.payload;
        
        // Add posts to entities
        Object.values(posts).forEach(post => {
          state.posts[post.id] = post;
        });
        
        
        // Replace all posts in channel
        state.postsInChannel[channelId] = order;
        
        // Update metadata  
        if (!state.channelMetadata[channelId]) {
          state.channelMetadata[channelId] = { ...initialChannelMetadata };
        }
        const metadata = state.channelMetadata[channelId];
        metadata.hasLoadedLatestPost = hasReachedLatest;
        metadata.hasLoadedOldestPost = hasReachedOldest;
        metadata.newestPostId = order[0] || null;
        metadata.oldestPostId = order[order.length - 1] || null;
        metadata.loadingState = 'none';
      })
      .addCase(loadUnreadPosts.rejected, (state, action) => {
        const { channelId } = action.meta.arg;
        if (state.channelMetadata[channelId]) {
          state.channelMetadata[channelId].loadingState = 'none';
        }
      });

    // Sync posts
    builder
      .addCase(syncPostsInChannel.fulfilled, (state, action) => {
        const { channelId, posts, order } = action.payload;
        
        // Add/update posts to entities
        Object.values(posts).forEach(post => {
          state.posts[post.id] = post;
        });
        
        
        // Merge with existing posts (newest first)
        const existingPosts = state.postsInChannel[channelId] || [];
        const mergedPosts = [...order, ...existingPosts.filter(id => !order.includes(id))];
        state.postsInChannel[channelId] = mergedPosts;
        
        // Update metadata
        const metadata = state.channelMetadata[channelId];
        if (order.length > 0) {
          metadata.newestPostId = order[0];
        }
        metadata.loadingState = 'none';
      })
      .addCase(syncPostsInChannel.rejected, (state, action) => {
        const { channelId } = action.meta.arg;
        if (state.channelMetadata[channelId]) {
          state.channelMetadata[channelId].loadingState = 'none';
        }
      });
      
    // WebSocket post handling
    builder
      .addCase(addWebSocketPost.fulfilled, (state, action) => {
        const post = action.payload;
        const channelId = post.channel_id;
        
        // Add post to entities
        state.posts[post.id] = post;
        
        
        // Add to channel posts (at the beginning = newest)
        if (!state.postsInChannel[channelId]) {
          state.postsInChannel[channelId] = [];
        }
        state.postsInChannel[channelId].unshift(post.id);
        
        // Update newest post ID
        if (!state.channelMetadata[channelId]) {
          state.channelMetadata[channelId] = { ...initialChannelMetadata };
        }
        state.channelMetadata[channelId].newestPostId = post.id;
      });

    // Add reaction
    builder
      .addCase(addReaction.fulfilled, (state, action) => {
        const { postId, reaction } = action.payload;
        const post = state.posts[postId];
        if (post) {
          if (!post.metadata) {
            post.metadata = {
              embeds: [],
              emojis: [],
              files: [],
              images: {}
            };
          }
          if (!post.metadata.reactions) {
            post.metadata.reactions = [];
          }
          post.metadata.reactions.push(reaction);
        }
      });

    // Remove reaction
    builder
      .addCase(removeReaction.fulfilled, (state, action) => {
        const { postId, emojiName, userId } = action.payload;
        const post = state.posts[postId];
        if (post && post.metadata?.reactions) {
          post.metadata.reactions = post.metadata.reactions.filter(
            (r: any) => !(r.emoji_name === emojiName && r.user_id === userId)
          );
        }
      });

    // Update post
    builder
      .addCase(updatePost.fulfilled, (state, action) => {
        const { post } = action.payload;
        if (post) {
          state.posts[post.id] = post;
        }
      });

    // Delete post  
    builder
      .addCase(deletePost.fulfilled, (state, action) => {
        const { postId } = action.payload;
        const post = state.posts[postId];
        
        if (post) {
          // Remove from posts entities
          delete state.posts[postId];
          
          // Remove from channel posts
          const channelId = post.channel_id;
          if (state.postsInChannel[channelId]) {
            state.postsInChannel[channelId] = state.postsInChannel[channelId].filter(
              id => id !== postId
            );
          }
        }
      })
      .addCase(createPost.fulfilled, (state, action) => {
        const { post, channelId } = action.payload;
        
        state.posts[post.id] = post;
        
        if (post.root_id) {
          const rootPost = state.posts[post.root_id];
          if (rootPost) {
            rootPost.reply_count = (rootPost.reply_count || 0) + 1;
          }
          return;
        }
        
        if (!state.postsInChannel[channelId]) {
          state.postsInChannel[channelId] = [];
        }
        if (!state.channelMetadata[channelId]) {
          state.channelMetadata[channelId] = { ...initialChannelMetadata };
        }
        
        state.postsInChannel[channelId].unshift(post.id);
        state.channelMetadata[channelId].newestPostId = post.id;
      })
      // Listen to thread loading to add all posts to global store
      .addCase(loadThread.fulfilled, (state, action) => {
        const { posts } = action.payload;
        
        // Add all thread posts to global posts store
        posts.forEach(post => {
          state.posts[post.id] = post;
        });
      });
  },
});

// Add reaction to a post
export const addReaction = createAsyncThunk(
  'posts/addReaction',
  async (
    { postId, emojiName }: { postId: string; emojiName: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { 
        posts: PostsState;
        entities: { users: { currentUserId: string } }
      };
      const currentUserId = state.entities.users.currentUserId;
      
      if (!currentUserId) {
        return rejectWithValue({ postId, error: "No current user" });
      }

      const response = await client.addReaction(currentUserId, postId, emojiName);
      
      return {
        reaction: response,
        postId,
        emojiName,
        userId: currentUserId,
      };
    } catch (error) {
      return rejectWithValue({
        postId,
        emojiName,
        error: error instanceof Error ? error.message : "Failed to add reaction",
      });
    }
  },
);

// Remove reaction from a post
export const removeReaction = createAsyncThunk(
  'posts/removeReaction',
  async (
    { postId, emojiName }: { postId: string; emojiName: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { 
        posts: PostsState;
        entities: { users: { currentUserId: string } }
      };
      const currentUserId = state.entities.users.currentUserId;
      
      if (!currentUserId) {
        return rejectWithValue({ postId, error: "No current user" });
      }

      await client.removeReaction(currentUserId, postId, emojiName);
      
      return {
        postId,
        emojiName,
        userId: currentUserId,
      };
    } catch (error) {
      return rejectWithValue({
        postId,
        emojiName,
        error: error instanceof Error ? error.message : "Failed to remove reaction",
      });
    }
  },
);

export const toggleReaction = createAsyncThunk(
  "posts/toggleReaction",
  async (
    { postId, emojiName }: { postId: string; emojiName: string },
    { getState, dispatch, rejectWithValue },
  ) => {
    try {
      const state = getState() as { 
        posts: PostsState;
        entities: { users: { currentUserId: string } }
      };
      const currentUserId = state.entities.users.currentUserId;
      const post = state.posts.posts[postId];

      if (!currentUserId) {
        return rejectWithValue({ postId, error: "No current user" });
      }

      if (!post) {
        return rejectWithValue({ postId, error: "Post not found" });
      }

      const userHasReacted = !!post.metadata?.reactions?.find(
        (r: any) => r.emoji_name === emojiName && r.user_id === currentUserId,
      );

      if (userHasReacted) {
        await dispatch(removeReaction({ postId, emojiName })).unwrap();
        return {
          postId,
          emojiName,
          userId: currentUserId,
          action: "removed" as const,
        };
      } else {
        await dispatch(addReaction({ postId, emojiName })).unwrap();
        return {
          postId,
          emojiName,
          userId: currentUserId,
          action: "added" as const,
        };
      }
    } catch (error) {
      return rejectWithValue({
        postId,
        emojiName,
        error:
          error instanceof Error ? error.message : "Failed to toggle reaction",
      });
    }
  },
);

// Update an existing post (edit message)
export const updatePost = createAsyncThunk(
  'posts/updatePost',
  async (
    { postId, message, fileIds }: { postId: string; message: string; fileIds?: string[] },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { posts: PostsState };
      const existingPost = state.posts.posts[postId];
      
      if (!existingPost) {
        return rejectWithValue({ postId, error: "Post not found" });
      }

      const updatedPost = {
        ...existingPost,
        message,
        update_at: Date.now(),
        edit_at: Date.now(),
      };

      if(fileIds) {
        updatedPost.file_ids = fileIds
      }

      const response = await client.updatePost(updatedPost);
      
      return {
        post: response,
        postId,
      };
    } catch (error) {
      return rejectWithValue({
        postId,
        error: error instanceof Error ? error.message : "Failed to update post",
      });
    }
  },
);

// Delete a post
export const deletePost = createAsyncThunk(
  'posts/deletePost',
  async ({ postId }: { postId: string }, { rejectWithValue }) => {
    try {
      await client.deletePost(postId);
      return { postId };
    } catch (error) {
      return rejectWithValue({
        postId,
        error: error instanceof Error ? error.message : "Failed to delete post",
      });
    }
  },
);

export const createPost = createAsyncThunk(
  'posts/createPost',
  async ({
    channelId,
    message,
    rootId,
    fileIds,
  }: {
    channelId: string;
    message: string;
    rootId?: string;
    fileIds?: string[];
  }, { rejectWithValue }) => {
    try {
      const postData = {
        channel_id: channelId,
        message: message.trim(),
        root_id: rootId || '',
        file_ids: fileIds || [],
      };

      const response = await client.createPost(postData);
      return {
        post: response,
        channelId,
        isReply: !!rootId,
      };
    } catch (error) {
      return rejectWithValue({
        channelId,
        error: error instanceof Error ? error.message : "Failed to create post",
      });
    }
  },
);

export const createPostWithAutoLoad = createAsyncThunk(
  'posts/createPostWithAutoLoad',
  async (params: {
    channelId: string;
    message: string;
    rootId?: string;
    fileIds?: string[];
  }, { dispatch, getState, rejectWithValue }) => {
    try {
      const { channelId } = params;
      
      const createResult = await dispatch(createPost(params)).unwrap();
      
      let currentState = getState() as { posts: PostsState };
      let metadata = currentState.posts.channelMetadata[channelId];
      
      // 3. Automatically load all missing messages
      while (metadata && !metadata.hasLoadedLatestPost) {
        try {
          await dispatch(loadNewerPosts({ channelId })).unwrap();
          currentState = getState() as { posts: PostsState };
          metadata = currentState.posts.channelMetadata[channelId];
        } catch (loadError) {
          break;
        }
      }
      
      return createResult;
    } catch (error) {
      return rejectWithValue({
        channelId: params.channelId,
        error: error instanceof Error ? error.message : "Failed to create post with auto-load",
      });
    }
  },
);

export const {
  setLoadingState,
  setPost,
  storePostOnly,
  removePost,
  addReactionFromWebSocket,
  removeReactionFromWebSocket,
} = postsSlice.actions;

export default postsSlice.reducer;