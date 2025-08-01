import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Post } from '@mattermost/types/posts';
import { client } from "../../api/client";
import { PostList } from "../../api/types";

// Loading states - only one operation at a time per channel
export type LoadingState = 'none' | 'older' | 'newer' | 'unreads' | 'syncing';

// Channel metadata interface
export interface ChannelPostsMetadata {
  oldestPostId: string | null;
  newestPostId: string | null;
  hasLoadedLatestPost: boolean; // Critical for WebSocket logic
  hasLoadedOldestPost: boolean;
  loadingState: LoadingState;
  lastViewedAt: number;
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
  lastViewedAt: 0,
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
  { getState, rejectWithValue }) => {
    try {
      const state = getState() as { posts: PostsState };
      const metadata = state.posts.channelMetadata[channelId];
      
      // Only proceed if not loading and not at oldest
      if (!metadata || (metadata.loadingState !== 'none' && metadata?.loadingState !== 'older') || metadata.hasLoadedOldestPost) {
        return rejectWithValue('Cannot load older posts');
      }

      const oldestPostId = metadata.oldestPostId;
      if (!oldestPostId) {
        return rejectWithValue('No oldest post ID available');
      }

      const response = await client.getPostsBefore(channelId, oldestPostId, 0, perPage);

      return {
        channelId,
        posts: response.posts,
        order: response.order,
        hasReachedOldest: !response.prev_post_id,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load older posts');
    }
  }
);

export const loadNewerPosts = createAsyncThunk(
  'posts/loadNewerPosts',
  async ({ channelId, perPage = 60 }: { channelId: string; perPage?: number }, 
  { getState, rejectWithValue }) => {
    try {
      const state = getState() as { posts: PostsState };
      const metadata = state.posts.channelMetadata[channelId];
      
      // Only proceed if not loading and not at latest
      if (!metadata || (metadata.loadingState !== 'none' && metadata.loadingState !== 'newer') || metadata.hasLoadedLatestPost) {
        return rejectWithValue('Cannot load newer posts');
      }

      const newestPostId = metadata.newestPostId;
      if (!newestPostId) {
        return rejectWithValue('No newest post ID available');
      }

      const response = await client.getPostsAfter(channelId, newestPostId, 0, perPage);

      return {
        channelId,
        posts: response.posts,
        order: response.order,
        hasReachedLatest: !response.next_post_id,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load newer posts');
    }
  }
);

export const loadUnreadPosts = createAsyncThunk(
  'posts/loadUnreadPosts',
  async ({ channelId, perPage = 60 }: { channelId: string; perPage?: number }, 
  { getState, rejectWithValue }) => {
    try {
      const state = getState() as { posts: PostsState, entities: { users: { currentUserId: string } } };
      const metadata = state.posts.channelMetadata[channelId];
      // Only proceed if not loading
      if (metadata?.loadingState !== 'none' && metadata?.loadingState !== 'unreads') {
        return rejectWithValue('Cannot load unread posts - already loading');
      }

      const userId = state.entities.users.currentUserId;
      if (!userId) {
        throw new Error("User not authenticated");
      }

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
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load unread posts');
    }
  }
);

export const syncPostsInChannel = createAsyncThunk(
  'posts/syncPostsInChannel',
  async ({ channelId, since }: { channelId: string; since: number }, 
  { getState, rejectWithValue }) => {
    try {
      const state = getState() as { posts: PostsState };
      const metadata = state.posts.channelMetadata[channelId];
      
      // Only proceed if not loading
      if (metadata?.loadingState !== 'none' && metadata?.loadingState !== 'syncing') {
        return rejectWithValue('Cannot sync posts - already loading');
      }

      const response = await client.getPostsSince(channelId, since);

      return {
        channelId,
        posts: response.posts,
        order: response.order,
      };
    } catch (error) {
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
    updateLastViewedAt: (state, action: PayloadAction<{ channelId: string; timestamp: number }>) => {
      const { channelId, timestamp } = action.payload;
      if (!state.channelMetadata[channelId]) {
        state.channelMetadata[channelId] = { ...initialChannelMetadata };
      }
      state.channelMetadata[channelId].lastViewedAt = timestamp;
    },
    
    updateNewMessagesSeparator: (state, action: PayloadAction<{ channelId: string; index: number }>) => {
      const { channelId, index } = action.payload;
      if (!state.channelMetadata[channelId]) {
        state.channelMetadata[channelId] = { ...initialChannelMetadata };
      }
      state.channelMetadata[channelId].newMessagesSeparatorIndex = index;
    },
    
    clearChannelPosts: (state, action: PayloadAction<{ channelId: string }>) => {
      const { channelId } = action.payload;
      delete state.postsInChannel[channelId];
      delete state.channelMetadata[channelId];
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
      .addCase(loadOlderPosts.pending, (state, action) => {
        const { channelId } = action.meta.arg;
        if (!state.channelMetadata[channelId]) {
          state.channelMetadata[channelId] = { ...initialChannelMetadata };
        }
        state.channelMetadata[channelId].loadingState = 'older';
      })
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
      .addCase(loadNewerPosts.pending, (state, action) => {
        const { channelId } = action.meta.arg;
        if (!state.channelMetadata[channelId]) {
          state.channelMetadata[channelId] = { ...initialChannelMetadata };
        }
        state.channelMetadata[channelId].loadingState = 'newer';
      })
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
      .addCase(loadUnreadPosts.pending, (state, action) => {
        const { channelId } = action.meta.arg;
        if (!state.channelMetadata[channelId]) {
          state.channelMetadata[channelId] = { ...initialChannelMetadata };
        }
        state.channelMetadata[channelId].loadingState = 'unreads';
      })
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
      .addCase(syncPostsInChannel.pending, (state, action) => {
        const { channelId } = action.meta.arg;
        if (!state.channelMetadata[channelId]) {
          state.channelMetadata[channelId] = { ...initialChannelMetadata };
        }
        state.channelMetadata[channelId].loadingState = 'syncing';
      })
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
        // Supprimer la réaction
        await dispatch(removeReaction({ postId, emojiName })).unwrap();
        return {
          postId,
          emojiName,
          userId: currentUserId,
          action: "removed" as const,
        };
      } else {
        // Ajouter la réaction
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
    { postId, message }: { postId: string; message: string },
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

export const {
  updateLastViewedAt,
  updateNewMessagesSeparator,
  clearChannelPosts,
  setPost,
  removePost,
  addReactionFromWebSocket,
  removeReactionFromWebSocket,
} = postsSlice.actions;

export default postsSlice.reducer;