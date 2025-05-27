import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Requests State for loading states
export interface RequestsState {
  auth: {
    login: 'idle' | 'pending' | 'fulfilled' | 'rejected';
    logout: 'idle' | 'pending' | 'fulfilled' | 'rejected';
    getMe: 'idle' | 'pending' | 'fulfilled' | 'rejected';
  };
  teams: {
    getTeams: 'idle' | 'pending' | 'fulfilled' | 'rejected';
    getTeamsUnread: 'idle' | 'pending' | 'fulfilled' | 'rejected';
  };
  channels: {
    getChannels: 'idle' | 'pending' | 'fulfilled' | 'rejected';
    getChannelUnread: 'idle' | 'pending' | 'fulfilled' | 'rejected';
  };
  posts: {
    getPosts: 'idle' | 'pending' | 'fulfilled' | 'rejected';
    createPost: 'idle' | 'pending' | 'fulfilled' | 'rejected';
    getPostThread: 'idle' | 'pending' | 'fulfilled' | 'rejected';
  };
}

const initialState: RequestsState = {
  auth: {
    login: 'idle',
    logout: 'idle',
    getMe: 'idle',
  },
  teams: {
    getTeams: 'idle',
    getTeamsUnread: 'idle',
  },
  channels: {
    getChannels: 'idle',
    getChannelUnread: 'idle',
  },
  posts: {
    getPosts: 'idle',
    createPost: 'idle',
    getPostThread: 'idle',
  },
};

type RequestStatus = 'idle' | 'pending' | 'fulfilled' | 'rejected';

interface SetRequestStatusPayload {
  category: keyof RequestsState;
  action: string;
  status: RequestStatus;
}

const requestsSlice = createSlice({
  name: 'requests',
  initialState,
  reducers: {
    setRequestStatus: (state, action: PayloadAction<SetRequestStatusPayload>) => {
      const { category, action: actionName, status } = action.payload;
      if (state[category] && state[category][actionName as keyof typeof state[typeof category]]) {
        (state[category] as any)[actionName] = status;
      }
    },
    
    // Auth requests
    setLoginStatus: (state, action: PayloadAction<RequestStatus>) => {
      state.auth.login = action.payload;
    },
    setLogoutStatus: (state, action: PayloadAction<RequestStatus>) => {
      state.auth.logout = action.payload;
    },
    setGetMeStatus: (state, action: PayloadAction<RequestStatus>) => {
      state.auth.getMe = action.payload;
    },

    // Teams requests
    setGetTeamsStatus: (state, action: PayloadAction<RequestStatus>) => {
      state.teams.getTeams = action.payload;
    },
    setGetTeamsUnreadStatus: (state, action: PayloadAction<RequestStatus>) => {
      state.teams.getTeamsUnread = action.payload;
    },

    // Channels requests
    setGetChannelsStatus: (state, action: PayloadAction<RequestStatus>) => {
      state.channels.getChannels = action.payload;
    },
    setGetChannelUnreadStatus: (state, action: PayloadAction<RequestStatus>) => {
      state.channels.getChannelUnread = action.payload;
    },

    // Posts requests
    setGetPostsStatus: (state, action: PayloadAction<RequestStatus>) => {
      state.posts.getPosts = action.payload;
    },
    setCreatePostStatus: (state, action: PayloadAction<RequestStatus>) => {
      state.posts.createPost = action.payload;
    },
    setGetPostThreadStatus: (state, action: PayloadAction<RequestStatus>) => {
      state.posts.getPostThread = action.payload;
    },

    clearRequests: () => initialState,
  },
});

export const {
  setRequestStatus,
  
  // Auth
  setLoginStatus,
  setLogoutStatus,
  setGetMeStatus,
  
  // Teams
  setGetTeamsStatus,
  setGetTeamsUnreadStatus,
  
  // Channels
  setGetChannelsStatus,
  setGetChannelUnreadStatus,
  
  // Posts
  setGetPostsStatus,
  setCreatePostStatus,
  setGetPostThreadStatus,
  
  clearRequests,
} = requestsSlice.actions;

export default requestsSlice.reducer;