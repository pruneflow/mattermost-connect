import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { saveLastVisited, saveLastVisitedChannels } from '../../services/storageService';

// Views State for UI-specific state
// Navigation state following Mattermost pattern
export interface NavigationState {
  currentUrl: string;
  previousUrl: string;
  lastVisitedChannels: Record<string, string>; // teamId -> channelId
  lastVisited: { teamId: string; channelId: string } | null; // Last visited team/channel globally
  isNavigating: boolean;
}

export interface ViewsState {
  auth: {
    isLoggingIn: boolean;
    loginError: string | null;
  };
  navigation: NavigationState;
  channels: {
    isChannelSidebarOpen: boolean;
    isRightSidebarOpen: boolean;
    rightSidebarType: 'thread' | 'search' | 'files' | null;
    threadsInView: string[];
    lastViewedAtByChannel: Record<string, number>;
  };
  posts: {
    isLoadingPosts: boolean;
    hasMorePostsBefore: boolean;
    hasMorePostsAfter: boolean;
    loadingPostsChannelId: string | null;
  };
  ui: {
    isMobile: boolean;
    sidebarWidth: number;
  };
  typing: {
    [channelId: string]: string[]; // userIds typing in channel
  };
  userSearch: {
    searchTerm: string;
    searchResults: string[]; // user IDs
    isSearching: boolean;
    lastSearchTerm: string;
  };
}

const initialState: ViewsState = {
  auth: {
    isLoggingIn: false,
    loginError: null,
  },
  navigation: {
    currentUrl: '/',
    previousUrl: '/',
    lastVisitedChannels: {},
    lastVisited: null,
    isNavigating: false,
  },
  channels: {
    isChannelSidebarOpen: true,
    isRightSidebarOpen: false,
    rightSidebarType: null,
    threadsInView: [],
    lastViewedAtByChannel: {}
  },
  posts: {
    isLoadingPosts: false,
    hasMorePostsBefore: true,
    hasMorePostsAfter: false,
    loadingPostsChannelId: null,
  },
  ui: {
    isMobile: false,
    sidebarWidth: 240,
  },
  typing: {},
  userSearch: {
    searchTerm: '',
    searchResults: [],
    isSearching: false,
    lastSearchTerm: '',
  },
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

    // Navigation
    setCurrentUrl: (state, action: PayloadAction<string>) => {
      state.navigation.previousUrl = state.navigation.currentUrl;
      state.navigation.currentUrl = action.payload;
    },
    setNavigating: (state, action: PayloadAction<boolean>) => {
      state.navigation.isNavigating = action.payload;
    },
    setLastVisitedChannel: (state, action: PayloadAction<{ teamId: string; channelId: string }>) => {
      const { teamId, channelId } = action.payload;
      state.navigation.lastVisitedChannels[teamId] = channelId;
      state.navigation.lastVisited = { teamId, channelId };
      
      // Save to localStorage automatically
      saveLastVisitedChannels(state.navigation.lastVisitedChannels);
      saveLastVisited(state.navigation.lastVisited);
    },
    restoreLastVisitedChannels: (state, action: PayloadAction<Record<string, string>>) => {
      state.navigation.lastVisitedChannels = action.payload;
    },
    setLastVisited: (state, action: PayloadAction<{ teamId: string; channelId: string } | null>) => {
      state.navigation.lastVisited = action.payload;
      
      // Save to localStorage automatically
      saveLastVisited(action.payload);
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

    // User Search
    setUserSearching: (state, action: PayloadAction<boolean>) => {
      state.userSearch.isSearching = action.payload;
    },
    setUserSearchTerm: (state, action: PayloadAction<string>) => {
      state.userSearch.searchTerm = action.payload;
    },
    setUserSearchResults: (state, action: PayloadAction<{ term: string; results: string[] }>) => {
      state.userSearch.searchResults = action.payload.results;
      state.userSearch.lastSearchTerm = action.payload.term;
      state.userSearch.isSearching = false;
    },
    clearUserSearch: (state) => {
      state.userSearch.searchTerm = '';
      state.userSearch.searchResults = [];
      state.userSearch.isSearching = false;
      state.userSearch.lastSearchTerm = '';
    },

    // Clear views (but preserve navigation state across logouts)
    clearViews: (state) => ({
      ...initialState,
      navigation: {
        ...initialState.navigation,
        lastVisitedChannels: state.navigation.lastVisitedChannels,
        lastVisited: state.navigation.lastVisited,
      }
    }),
    updateNewMessagesAtInChannel(
      state,
      action: PayloadAction<{ channelId: string; lastViewedAt: number }>
    ) {
      const { channelId, lastViewedAt } = action.payload;
      state.channels.lastViewedAtByChannel[channelId] = lastViewedAt;
    },
  },
});

export const {
  // Auth
  setLoggingIn,
  setLoginError,
  
  // Navigation
  setCurrentUrl,
  setNavigating,
  setLastVisitedChannel,
  restoreLastVisitedChannels,
  setLastVisited,
  
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
  setSidebarWidth,
  
  // Typing
  setUsersTyping,
  addUserTyping,
  removeUserTyping,
  
  // User Search
  setUserSearching,
  setUserSearchTerm,
  setUserSearchResults,
  clearUserSearch,
  
  // Clear
  clearViews,
  updateNewMessagesAtInChannel
} = viewsSlice.actions;

export default viewsSlice.reducer;