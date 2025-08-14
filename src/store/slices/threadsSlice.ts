import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { client } from "../../api/client";
import { PaginatedPostList, Post } from "../../api/types";

export interface ThreadData {
  posts: Post[];
  postIds: string[];
  loading: boolean;
  hasNext: boolean;
  error: string | null;
}

// State principal des threads
export interface ThreadsState {
  threads: Record<string, ThreadData>; // threadId -> ThreadData
}

const initialState: ThreadsState = {
  threads: {},
};

// Helper to initialize an empty thread
const createEmptyThread = (): ThreadData => ({
  posts: [],
  postIds: [],
  loading: false,
  hasNext: false,
  error: null,
});

/**
 * Charge un thread complet avec tous ses messages
 * Fetch in loop until all messages are retrieved (has_next = false)
 */
export const loadThread = createAsyncThunk(
  "threads/loadThread",
  async ({ rootPostId }: { rootPostId: string }, { rejectWithValue }) => {
    try {
      const allPosts: Post[] = [];
      const allPostIds: string[] = [];
      let hasNext = true;
      let fromCreateAt: number | undefined;
      let fromPost: string | undefined;

      const baseParams = {
        skipFetchThreads: false,
        collapsedThreads: true,
        collapsedThreadsExtended: false,
        direction: "down" as const,
        /*perPage: 60,*/
        fetchAll: true,
      };

      // Fetch initial
      let response = (await client.getPaginatedPostThread(
        rootPostId,
        baseParams,
      )) as PaginatedPostList;

      if (!response || !response.posts) {
        throw new Error("No thread data received");
      }

      const posts = Object.values(response.posts);
      allPosts.push(...posts);
      allPostIds.push(...response.order);
      /* if (response.order && response.order.length > 0) {
         allPostIds.push(...response.order);
         hasNext = response.has_next || false;

         // If there are more messages, continue fetching
         while (hasNext && response.order && response.order.length > 0) {
           const lastPostId = response.order[response.order.length - 1];
           const lastPost = response.posts[lastPostId];

           fromCreateAt = lastPost.create_at;
           fromPost = lastPostId;

           // Next fetch with pagination
           response = await client.getPaginatedPostThread(
             rootPostId,
             {
               ...baseParams,
               fromCreateAt,
               fromPost,
             }
           ) as PaginatedPostList;

           if (response && response.posts && response.order) {
             const newPosts = Object.values(response.posts);
             allPosts.push(...newPosts);
             allPostIds.push(...response.order);
             hasNext = response.has_next || false;
           } else {
             hasNext = false;
           }
         }
      }
       */

      return {
        rootPostId,
        posts: allPosts,
        postIds: allPostIds,
        hasNext: false,
      };
    } catch (error) {
      return rejectWithValue({
        rootPostId,
        error: error instanceof Error ? error.message : "Failed to load thread",
      });
    }
  },
);

/**
 * Slice to manage threads
 */
const threadsSlice = createSlice({
  name: "threads",
  initialState,
  reducers: {
    // Nettoyer un thread du store
    clearThread: (state, action: PayloadAction<string>) => {
      const rootPostId = action.payload;
      delete state.threads[rootPostId];
    },

    // Clear all threads
    clearAllThreads: (state) => {
      state.threads = {};
    },

    addPostToThread: (
      state,
      action: PayloadAction<{ rootPostId: string; post: Post }>,
    ) => {
      const { rootPostId, post } = action.payload;
      const thread = state.threads[rootPostId];

      if (thread && !thread.posts.find((p) => p.id === post.id)) {
        thread.posts.push(post);
        thread.postIds.push(post.id);

        thread.posts.sort((a, b) => a.create_at - b.create_at);
        thread.postIds.sort((a, b) => {
          const postA = thread.posts.find((p) => p.id === a);
          const postB = thread.posts.find((p) => p.id === b);
          return (postA?.create_at || 0) - (postB?.create_at || 0);
        });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadThread.pending, (state, action) => {
        const { rootPostId } = action.meta.arg;
        if (!state.threads[rootPostId]) {
          state.threads[rootPostId] = createEmptyThread();
        }
        state.threads[rootPostId].loading = true;
        state.threads[rootPostId].error = null;
      })
      .addCase(loadThread.fulfilled, (state, action) => {
        const { rootPostId, posts, postIds, hasNext } = action.payload;

        state.threads[rootPostId] = {
          posts: posts.sort((a, b) => a.create_at - b.create_at), // Trier chronologiquement
          postIds: postIds,
          loading: false,
          hasNext,
          error: null,
        };
      })
      .addCase(loadThread.rejected, (state, action) => {
        const rootPostId = (action.meta.arg as { rootPostId: string })
          .rootPostId;
        if (!state.threads[rootPostId]) {
          state.threads[rootPostId] = createEmptyThread();
        }
        state.threads[rootPostId].loading = false;
        state.threads[rootPostId].error =
          (action.payload as any)?.error || "Failed to load thread";
      });
      
    // Listen to post actions to propagate to threads (without circular imports)
    const postsActions = [
      'posts/createPost/fulfilled',
      'posts/addReaction/fulfilled', 
      'posts/removeReaction/fulfilled',
      'posts/addReactionFromWebSocket',
      'posts/removeReactionFromWebSocket'
    ];

    postsActions.forEach(actionType => {
      builder.addMatcher(
        (action) => action.type === actionType,
        (state, action: any) => {
          if (actionType === 'posts/createPost/fulfilled') {
            const { post } = action.payload;
            
            if (post.root_id && state.threads[post.root_id]) {
              const thread = state.threads[post.root_id];
              
              if (!thread.posts.find((p) => p.id === post.id)) {
                thread.posts.push(post);
                thread.postIds.push(post.id);
                
                        thread.posts.sort((a, b) => a.create_at - b.create_at);
                thread.postIds.sort((a, b) => {
                  const postA = thread.posts.find((p) => p.id === a);
                  const postB = thread.posts.find((p) => p.id === b);
                  return (postA?.create_at || 0) - (postB?.create_at || 0);
                });
              }
            }
          }
          
          else if (actionType === 'posts/addReaction/fulfilled') {
            const { postId, reaction } = action.payload;
            
            Object.values(state.threads).forEach(thread => {
              const post = thread.posts.find(p => p.id === postId);
              if (post) {
                if (!post.metadata) {
                  post.metadata = { embeds: [], emojis: [], files: [], images: {}, reactions: [] };
                }
                if (!post.metadata.reactions) {
                  post.metadata.reactions = [];
                }
                post.metadata.reactions.push(reaction);
              }
            });
          }
          
          else if (actionType === 'posts/removeReaction/fulfilled') {
            const { postId, emojiName, userId } = action.payload;
            
            Object.values(state.threads).forEach(thread => {
              const post = thread.posts.find(p => p.id === postId);
              if (post && post.metadata?.reactions) {
                post.metadata.reactions = post.metadata.reactions.filter(
                  (r: any) => !(r.emoji_name === emojiName && r.user_id === userId)
                );
              }
            });
          }
          
          else if (actionType === 'posts/addReactionFromWebSocket') {
            const { postId, emojiName, userId } = action.payload;
            
            Object.values(state.threads).forEach(thread => {
              const post = thread.posts.find(p => p.id === postId);
              if (post) {
                if (!post.metadata) {
                  post.metadata = { embeds: [], emojis: [], files: [], images: {}, reactions: [] };
                }
                if (!post.metadata.reactions) {
                  post.metadata.reactions = [];
                }
                
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
            });
          }
          
          else if (actionType === 'posts/removeReactionFromWebSocket') {
            const { postId, emojiName, userId } = action.payload;
            
            Object.values(state.threads).forEach(thread => {
              const post = thread.posts.find(p => p.id === postId);
              if (post && post.metadata?.reactions) {
                post.metadata.reactions = post.metadata.reactions.filter(
                  (r: any) => !(r.emoji_name === emojiName && r.user_id === userId)
                );
              }
            });
          }
        }
      );
    });
  },
});

export const { clearThread, clearAllThreads, addPostToThread } =
  threadsSlice.actions;

export default threadsSlice.reducer;
