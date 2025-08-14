import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { client } from '../../api/client';
import { arraysEqual } from '../../utils/formatters';

/**
 * File information interface
 */
export interface FileInfo {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  extension: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  has_preview_image: boolean;
  width?: number;
  height?: number;
}

/**
 * Loading states for file operations
 */
export type FileLoadingState = 'idle' | 'loading' | 'succeeded' | 'failed';

/**
 * File state interface
 */
export interface FileState {
  id: string;
  info: FileInfo | null;
  previewUrl: string | null;
  publicLink: string | null;
  infoLoadingState: FileLoadingState;
  previewLoadingState: FileLoadingState;
  downloadLoadingState: FileLoadingState;
  error: string | null;
}

/**
 * Post files metadata for caching
 */
export interface PostFilesMetadata {
  postId: string;
  fileIds: string[];
}

/**
 * Files slice state
 */
export interface FilesState {
  files: Record<string, FileState>;
  postFiles: Record<string, PostFilesMetadata>; // postId -> metadata
}

const initialState: FilesState = {
  files: {},
  postFiles: {},
};

// Helper to get or create file state
const getOrCreateFileState = (state: FilesState, fileId: string): FileState => {
  if (!state.files[fileId]) {
    state.files[fileId] = {
      id: fileId,
      info: null,
      previewUrl: null,
      publicLink: null,
      infoLoadingState: 'idle',
      previewLoadingState: 'idle',
      downloadLoadingState: 'idle',
      error: null,
    };
  }
  return state.files[fileId];
};

// ================================================================================
// ASYNC THUNKS
// ================================================================================

/**
 * Fetch file infos for a post with smart caching
 */
export const fetchFileInfosForPost = createAsyncThunk(
  'files/fetchFileInfosForPost',
  async ({ postId, fileIds, force = false }: { postId: string; fileIds: string[]; force?: boolean }, { getState, rejectWithValue }) => {
    const state = getState() as { files: FilesState };
    const postFiles = state.files.postFiles[postId];
    // Check if we already have this exact set of files cached
    if (!force && postFiles && arraysEqual(postFiles.fileIds, fileIds)) {
      // Check if all files are loaded
      const allFilesLoaded = fileIds.every(fileId => {
        const fileState = state.files.files[fileId];
        return fileState && fileState.infoLoadingState === 'succeeded' && fileState.info;
      });
      
      if (allFilesLoaded) {
        return rejectWithValue('Files already loaded');
      }
    }
    
    try {
      const fileInfos = await client.getFileInfosForPost(postId);
      return { postId, fileIds, fileInfos };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch file infos for post');
    }
  }
);

/**
 * Fetch file preview with automatic deduplication
 */
export const fetchFilePreview = createAsyncThunk(
  'files/fetchFilePreview',
  async ({ fileId, force = false }: { fileId: string; force?: boolean }, { getState, rejectWithValue, dispatch }) => {
    const state = getState() as { files: FilesState };
    const fileState = state.files.files[fileId];
    
    // Skip if already loading or loaded (unless forced)
    if (!force && fileState) {
      if (fileState.previewLoadingState === 'loading') {
        return rejectWithValue('Already loading');
      }
      if (fileState.previewLoadingState === 'succeeded' && fileState.previewUrl) {
        return { fileId, previewUrl: fileState.previewUrl };
      }
    }
    
    // Set loading state immediately to prevent race conditions
    dispatch(filesSlice.actions.setPreviewLoadingState({ fileId, loadingState: 'loading' }));
    
    try {
      const filePreviewUrl = client.getFilePreviewUrl(fileId, Date.now());
      const response = await fetch(filePreviewUrl);
      const blob = await response.blob();
      const previewUrl = URL.createObjectURL(blob);
      return { fileId, previewUrl };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch file preview');
    }
  }
);

/**
 * Download file using official Mattermost client method
 */
export const downloadFile = createAsyncThunk(
  'files/downloadFile',
  async ({ fileId, fileName }: { fileId: string; fileName?: string }, { getState, rejectWithValue }) => {
    try {
      const downloadUrl = client.getFileUrl(fileId, Date.now());
      
      // Fetch with credentials for cookie authentication
      const response = await fetch(downloadUrl, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName || `file-${fileId}`;
      document.body.appendChild(a);
      a.click();
      
      // Nettoyer
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      return { fileId, success: true };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to download file');
    }
  }
);

/**
 * Generate public link for file sharing (simple URL generation)
 */
export const generatePublicLink = createAsyncThunk(
  'files/generatePublicLink',
  async ({ fileId }: { fileId: string }, { rejectWithValue }) => {
    try {
      const result = await client.getFilePublicLink(fileId);
      return { fileId, publicLink: result.link };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to generate public link');
    }
  }
);

// ================================================================================
// SLICE
// ================================================================================

const filesSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    // Clear preview URL for a file (for cleanup)
    clearPreviewUrl: (state, action: PayloadAction<string>) => {
      const fileId = action.payload;
      const fileState = state.files[fileId];
      if (fileState?.previewUrl) {
        URL.revokeObjectURL(fileState.previewUrl);
        fileState.previewUrl = null;
        fileState.previewLoadingState = 'idle';
      }
    },
    
    // Store FileInfos from post metadata
    storeFileInfos: (state, action: PayloadAction<{ postId: string; fileInfos: any[] }>) => {
      const { fileInfos } = action.payload;
      
      // Update each file state using the same pattern as fetchFileInfosForPost.fulfilled
      fileInfos.forEach(fileInfo => {
        const fileState = getOrCreateFileState(state, fileInfo.id);
        fileState.info = fileInfo;
        fileState.infoLoadingState = 'succeeded';
        fileState.error = null;
      });
    },
    
    // Clear all preview URLs (for cleanup on unmount)
    clearAllPreviewUrls: (state) => {
      Object.values(state.files).forEach(fileState => {
        if (fileState.previewUrl) {
          URL.revokeObjectURL(fileState.previewUrl);
          fileState.previewUrl = null;
          fileState.previewLoadingState = 'idle';
        }
      });
    },
    
    // Set preview loading state (for race condition prevention)
    setPreviewLoadingState: (state, action: PayloadAction<{ fileId: string; loadingState: FileLoadingState }>) => {
      const { fileId, loadingState } = action.payload;
      const fileState = getOrCreateFileState(state, fileId);
      fileState.previewLoadingState = loadingState;
    },
    
    // Reset file state
    resetFileState: (state, action: PayloadAction<string>) => {
      const fileId = action.payload;
      if (state.files[fileId]?.previewUrl) {
        URL.revokeObjectURL(state.files[fileId].previewUrl!);
      }
      delete state.files[fileId];
    },
  },
  extraReducers: (builder) => {
    // Fetch file infos for post
    builder
      .addCase(fetchFileInfosForPost.pending, (state, action) => {
        const { postId, fileIds } = action.meta.arg;
        
        // Mark all files as loading
        fileIds.forEach(fileId => {
          const fileState = getOrCreateFileState(state, fileId);
          fileState.infoLoadingState = 'loading';
          fileState.error = null;
        });
      })
      .addCase(fetchFileInfosForPost.fulfilled, (state, action) => {
        const { postId, fileIds, fileInfos } = action.payload;
        
        // Update post files metadata
        state.postFiles[postId] = { postId, fileIds };
        
        // Update each file state
        fileInfos.forEach(fileInfo => {
          const fileState = getOrCreateFileState(state, fileInfo.id);
          fileState.info = fileInfo;
          fileState.infoLoadingState = 'succeeded';
          fileState.error = null;
        });
      })
      .addCase(fetchFileInfosForPost.rejected, (state, action) => {
        const { postId, fileIds } = action.meta.arg;
        const error = action.payload as string;
        
        // Mark all files as failed
        fileIds.forEach(fileId => {
          const fileState = getOrCreateFileState(state, fileId);
          fileState.infoLoadingState = 'failed';
          fileState.error = error;
        });
      });

    // Fetch file preview
    builder
      .addCase(fetchFilePreview.pending, (state, action) => {
        const fileId = action.meta.arg.fileId;
        const fileState = getOrCreateFileState(state, fileId);
        fileState.previewLoadingState = 'loading';
        fileState.error = null;
      })
      .addCase(fetchFilePreview.fulfilled, (state, action) => {
        const { fileId, previewUrl } = action.payload;
        const fileState = getOrCreateFileState(state, fileId);
        
        // Clean up old preview URL if exists
        if (fileState.previewUrl) {
          URL.revokeObjectURL(fileState.previewUrl);
        }
        
        fileState.previewUrl = previewUrl;
        fileState.previewLoadingState = 'succeeded';
        fileState.error = null;
      })
      .addCase(fetchFilePreview.rejected, (state, action) => {
        const fileId = action.meta.arg.fileId;
        const fileState = getOrCreateFileState(state, fileId);
        fileState.previewLoadingState = 'failed';
        fileState.error = action.payload as string;
      });

    // Download file
    builder
      .addCase(downloadFile.pending, (state, action) => {
        const fileId = action.meta.arg.fileId;
        const fileState = getOrCreateFileState(state, fileId);
        fileState.downloadLoadingState = 'loading';
        fileState.error = null;
      })
      .addCase(downloadFile.fulfilled, (state, action) => {
        const { fileId } = action.payload;
        const fileState = getOrCreateFileState(state, fileId);
        fileState.downloadLoadingState = 'succeeded';
        fileState.error = null;
      })
      .addCase(downloadFile.rejected, (state, action) => {
        const fileId = action.meta.arg.fileId;
        const fileState = getOrCreateFileState(state, fileId);
        fileState.downloadLoadingState = 'failed';
        fileState.error = action.payload as string;
      });

    // Generate public link (simple)
    builder
      .addCase(generatePublicLink.fulfilled, (state, action) => {
        const { fileId, publicLink } = action.payload;
        const fileState = getOrCreateFileState(state, fileId);
        fileState.publicLink = publicLink;
      })
      .addCase(generatePublicLink.rejected, (state, action) => {
        const fileId = action.meta.arg.fileId;
        const fileState = getOrCreateFileState(state, fileId);
        fileState.error = action.payload as string;
      });

    // Listen to posts actions to automatically store FileInfos from metadata
    // Import posts actions dynamically to avoid circular dependencies
    const postsActions = [
      'posts/loadOlderPosts/fulfilled',
      'posts/loadNewerPosts/fulfilled', 
      'posts/loadUnreadPosts/fulfilled',
      'posts/syncPostsInChannel/fulfilled',
      'posts/addWebSocketPost/fulfilled',
      'posts/updatePost/fulfilled',
      'posts/createPost/fulfilled',
      'posts/storePostOnly',  // Pour les posts WebSocket de threads
      'threads/loadThread/fulfilled'  // Ajouter le chargement des threads
    ];

    postsActions.forEach(actionType => {
      builder.addMatcher(
        (action) => action.type === actionType,
        (state, action: any) => {
          let posts: any[] = [];
          
          // Extract posts from different action payload structures
          if (action.payload.posts) {
            // For loadOlder/Newer/Unread/sync actions and threads/loadThread
            if (Array.isArray(action.payload.posts)) {
              // For threads/loadThread/fulfilled - posts is an array
              posts = action.payload.posts;
            } else {
              // For posts actions - posts is an object
              posts = Object.values(action.payload.posts);
            }
          } else if (action.payload.post) {
            // For single post actions (update, create, websocket)
            posts = [action.payload.post];
          } else if (action.payload.channel_id) {
            // For direct post payload (websocket)
            posts = [action.payload];
          } else if (action.type === 'posts/storePostOnly') {
            // For storePostOnly action - payload is directly the post
            posts = [action.payload];
          }
          
          // Store FileInfos from posts metadata
          posts.forEach((post: any) => {
            if (post?.metadata?.files && post.metadata.files.length > 0) {
              post.metadata.files.forEach((fileInfo: any) => {
                const fileState = getOrCreateFileState(state, fileInfo.id);
                fileState.info = fileInfo;
                fileState.infoLoadingState = 'succeeded';
                fileState.error = null;
              });
            }
          });
        }
      );
    });
  },
});

export const { clearPreviewUrl, clearAllPreviewUrls, resetFileState, setPreviewLoadingState, storeFileInfos } = filesSlice.actions;

export default filesSlice.reducer;