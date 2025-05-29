import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { LoadingKey, LoadingState, LoadingStateItem } from '../../types/loading.types';

// Initial state - empty loading states
const initialState: LoadingState = {};

// Loading slice following Mattermost patterns
const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    // Start loading for a specific key
    setLoading: (state, action: PayloadAction<{ key: LoadingKey; isLoading: boolean }>) => {
      const { key, isLoading } = action.payload;
      
      if (!state[key]) {
        state[key] = { isLoading: false, error: null };
      }
      
      state[key].isLoading = isLoading;
      
      // Clear error when starting new request
      if (isLoading) {
        state[key].error = null;
      }
    },

    // Set error for a specific key (also stops loading)
    setError: (state, action: PayloadAction<{ key: LoadingKey; error: string }>) => {
      const { key, error } = action.payload;
      
      if (!state[key]) {
        state[key] = { isLoading: false, error: null };
      }
      
      state[key].error = error;
      state[key].isLoading = false;
    },

    // Mark operation as successful (stops loading, clears error)
    setSuccess: (state, action: PayloadAction<{ key: LoadingKey }>) => {
      const { key } = action.payload;
      
      if (!state[key]) {
        state[key] = { isLoading: false, error: null };
      }
      
      state[key].isLoading = false;
      state[key].error = null;
    },

    // Clear loading state for a specific key
    clearLoading: (state, action: PayloadAction<{ key: LoadingKey }>) => {
      const { key } = action.payload;
      delete state[key];
    },

    // Reset all loading states (useful for logout)
    resetAllLoading: () => {
      return {};
    },
  },
});

// Export actions
export const {
  setLoading,
  setError,
  setSuccess,
  clearLoading,
  resetAllLoading,
} = loadingSlice.actions;

// Export reducer
export default loadingSlice.reducer;

// Selectors following Mattermost patterns
export const selectLoadingState = (state: { loading: LoadingState }, key: LoadingKey): LoadingStateItem => {
  return state.loading[key] || { isLoading: false, error: null };
};

export const selectIsLoading = (state: { loading: LoadingState }, key: LoadingKey): boolean => {
  return state.loading[key]?.isLoading || false;
};

export const selectError = (state: { loading: LoadingState }, key: LoadingKey): string | null => {
  return state.loading[key]?.error || null;
};

// Check if any loading operation is active (useful for global loading indicators)
export const selectAnyLoading = (state: { loading: LoadingState }): boolean => {
  return Object.values(state.loading).some(item => item.isLoading);
};

// Get all active loading keys (useful for debugging)
export const selectActiveLoadingKeys = (state: { loading: LoadingState }): LoadingKey[] => {
  return Object.keys(state.loading).filter(key => 
    state.loading[key].isLoading
  ) as LoadingKey[];
};