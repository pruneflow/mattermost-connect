import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Views State for UI-specific state
export interface ViewsState {
  auth: {
    isLoggingIn: boolean;
    loginError: string | null;
  };
  channels: {
    isChannelSidebarOpen: boolean;
    isRightSidebarOpen: boolean;
    rightSidebarType: 'thread' | 'search' | 'files' | null;
    threadsInView: string[];
  };
  posts: {
    isLoadingPosts: boolean;
    hasMorePostsBefore: boolean;
    hasMorePostsAfter: boolean;
    loadingPostsChannelId: string | null;
  };
  ui: {
    isMobile: boolean;
    theme: 'light' | 'dark';
    sidebarWidth: number;
  };
  typing: {
    [channelId: string]: string[]; // userIds typing in channel
  };
}

const initialState: ViewsState = {
  auth: {
    isLoggingIn: false,
    loginError: null,
  },
  channels: {
    isChannelSidebarOpen: true,
    isRightSidebarOpen: false,
    rightSidebarType: null,
    threadsInView: [],
  },
  posts: {
    isLoadingPosts: false,
    hasMorePostsBefore: true,
    hasMorePostsAfter: false,
    loadingPostsChannelId: null,
  },
  ui: {
    isMobile: false,
    theme: 'light',
    sidebarWidth: 240,
  },
  typing: {},
};

const viewsSlice = createSlice({
  name: 'views',
  initialState,
  reducers: {
    // Auth views
    setLoggingIn: (state, action: PayloadAction<boolean>) => {
      state.auth.isLoggingIn = action.payload;
    },
    setLoginError: (state, action: PayloadAction<string | null>) => {
      state.auth.loginError = action.payload;
    },

    // Channel views
    setChannelSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.channels.isChannelSidebarOpen = action.payload;
    },
    setRightSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.channels.isRightSidebarOpen = action.payload;
    },
    setRightSidebarType: (state, action: PayloadAction<'thread' | 'search' | 'files' | null>) => {
      state.channels.rightSidebarType = action.payload;
    },
    addThreadInView: (state, action: PayloadAction<string>) => {
      if (!state.channels.threadsInView.includes(action.payload)) {
        state.channels.threadsInView.push(action.payload);
      }
    },
    removeThreadInView: (state, action: PayloadAction<string>) => {
      state.channels.threadsInView = state.channels.threadsInView.filter(id => id !== action.payload);
    },

    // Posts views
    setLoadingPosts: (state, action: PayloadAction<{ channelId: string; loading: boolean }>) => {
      state.posts.isLoadingPosts = action.payload.loading;
      state.posts.loadingPostsChannelId = action.payload.loading ? action.payload.channelId : null;
    },
    setHasMorePostsBefore: (state, action: PayloadAction<boolean>) => {
      state.posts.hasMorePostsBefore = action.payload;
    },
    setHasMorePostsAfter: (state, action: PayloadAction<boolean>) => {
      state.posts.hasMorePostsAfter = action.payload;
    },

    // UI views
    setIsMobile: (state, action: PayloadAction<boolean>) => {
      state.ui.isMobile = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.ui.theme = action.payload;
    },
    setSidebarWidth: (state, action: PayloadAction<number>) => {
      state.ui.sidebarWidth = action.payload;
    },

    // Typing
    setUsersTyping: (state, action: PayloadAction<{ channelId: string; userIds: string[] }>) => {
      state.typing[action.payload.channelId] = action.payload.userIds;
    },
    addUserTyping: (state, action: PayloadAction<{ channelId: string; userId: string }>) => {
      const { channelId, userId } = action.payload;
      if (!state.typing[channelId]) {
        state.typing[channelId] = [];
      }
      if (!state.typing[channelId].includes(userId)) {
        state.typing[channelId].push(userId);
      }
    },
    removeUserTyping: (state, action: PayloadAction<{ channelId: string; userId: string }>) => {
      const { channelId, userId } = action.payload;
      if (state.typing[channelId]) {
        state.typing[channelId] = state.typing[channelId].filter(id => id !== userId);
      }
    },

    // Clear views
    clearViews: () => initialState,
  },
});

export const {
  // Auth
  setLoggingIn,
  setLoginError,
  
  // Channels
  setChannelSidebarOpen,
  setRightSidebarOpen,
  setRightSidebarType,
  addThreadInView,
  removeThreadInView,
  
  // Posts
  setLoadingPosts,
  setHasMorePostsBefore,
  setHasMorePostsAfter,
  
  // UI
  setIsMobile,
  setTheme,
  setSidebarWidth,
  
  // Typing
  setUsersTyping,
  addUserTyping,
  removeUserTyping,
  
  // Clear
  clearViews,
} = viewsSlice.actions;

export default viewsSlice.reducer;