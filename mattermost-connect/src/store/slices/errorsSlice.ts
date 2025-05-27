import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { APIError } from '../../api/types';

// Errors State for centralized error handling
export interface ErrorsState {
  auth: APIError | null;
  teams: APIError | null;
  channels: APIError | null;
  posts: APIError | null;
  websocket: string | null;
  general: APIError | null;
}

const initialState: ErrorsState = {
  auth: null,
  teams: null,
  channels: null,
  posts: null,
  websocket: null,
  general: null,
};

const errorsSlice = createSlice({
  name: 'errors',
  initialState,
  reducers: {
    setAuthError: (state, action: PayloadAction<APIError | null>) => {
      state.auth = action.payload;
    },
    setTeamsError: (state, action: PayloadAction<APIError | null>) => {
      state.teams = action.payload;
    },
    setChannelsError: (state, action: PayloadAction<APIError | null>) => {
      state.channels = action.payload;
    },
    setPostsError: (state, action: PayloadAction<APIError | null>) => {
      state.posts = action.payload;
    },
    setWebSocketError: (state, action: PayloadAction<string | null>) => {
      state.websocket = action.payload;
    },
    setGeneralError: (state, action: PayloadAction<APIError | null>) => {
      state.general = action.payload;
    },
    clearError: (state, action: PayloadAction<keyof ErrorsState>) => {
      state[action.payload] = null;
    },
    clearAllErrors: () => initialState,
  },
});

export const {
  setAuthError,
  setTeamsError,
  setChannelsError,
  setPostsError,
  setWebSocketError,
  setGeneralError,
  clearError,
  clearAllErrors,
} = errorsSlice.actions;

export default errorsSlice.reducer;