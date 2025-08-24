/**
 * Redux slice for Mattermost server configuration
 * Manages client configuration with global state
 */
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ClientConfig } from "@mattermost/types/config";
import { client } from "../../api/client";

export interface ConfigState {
  config: ClientConfig | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  // Cache for 5 minutes
  cacheDuration: number;
}

const initialState: ConfigState = {
  config: null,
  isLoading: false,
  error: null,
  lastFetched: null,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

// Async thunk for fetching config
export const fetchServerConfig = createAsyncThunk(
  'config/fetchServerConfig',
  async (_, { rejectWithValue }) => {
    try {
      return await client.getClientConfigOld();
    } catch (error) {
      return rejectWithValue('Failed to fetch server configuration');
    }
  }
);

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateConfig: (state, action: PayloadAction<ClientConfig>) => {
      state.config = action.payload;
      state.lastFetched = Date.now();
      state.error = null;
    },
    resetConfig: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServerConfig.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchServerConfig.fulfilled, (state, action) => {
        state.isLoading = false;
        state.config = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchServerConfig.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, updateConfig, resetConfig } = configSlice.actions;

export default configSlice.reducer;