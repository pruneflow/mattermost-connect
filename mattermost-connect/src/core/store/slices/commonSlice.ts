// src/core/store/slices/commonSlice.ts
/**
 * Common slice for Zustand stores
 * Provides reusable state and actions using Zustand's native patterns
 */
import { LoadingState, ErrorState, StoreState } from "../../../types";

/**
 * Interface for common slice state
 */
export interface CommonSlice extends LoadingState, ErrorState, StoreState {
  lastFetchTimes: Record<string, number>;
}

/**
 * Interface for common slice actions
 */
export interface CommonSliceActions {
  setLoading: (isLoading: boolean) => void;
  setLoadingId: (id: string, isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  setErrorForId: (id: string, error: Error | null) => void;
  updateLastFetchTime: (id: string) => void;
  reset: () => void;
}

/**
 * Combined type for state and actions
 */
export type CommonState = CommonSlice & CommonSliceActions;

/**
 * Initial state for common slice
 */
export const initialCommonState: CommonSlice = {
  isLoading: false,
  loadingIds: [],
  error: null,
  errors: {},
  lastUpdated: Date.now(),
  lastFetchTimes: {},
};

/**
 * Creates a common slice with standard loading/error state management
 * Compatible with immer middleware in Zustand
 */
export const createCommonSlice = <
  T extends CommonState & {
    errors: Record<string, Error | null>;
    loadingIds: string[];
  },
>(
  set: (fn: (state: T) => void) => void,
): CommonState => ({
  ...initialCommonState,

  setLoading: (isLoading) => {
    set((state) => {
      state.isLoading = isLoading;
      state.lastUpdated = Date.now();

      if (!isLoading) {
        state.loadingIds = [];
      }
    });
  },

  setLoadingId: (id, isLoading) => {
    set((state) => {
      if (isLoading) {
        if (!state.loadingIds.includes(id)) {
          state.loadingIds.push(id);
        }
      } else {
        state.loadingIds = state.loadingIds.filter(
          (loadingId) => loadingId !== id,
        );
      }

      state.isLoading = state.loadingIds.length > 0;
      state.lastUpdated = Date.now();
    });
  },

  setError: (error) => {
    set((state) => {
      state.error = error;
      state.lastUpdated = Date.now();
    });
  },

  setErrorForId: (id, error) => {
    set((state) => {
      if (error) {
        state.errors[id] = error;
      } else if (state.errors[id]) {
        delete state.errors[id];
      }
      state.lastUpdated = Date.now();
    });
  },

  updateLastFetchTime: (id) => {
    set((state) => {
      state.lastFetchTimes[id] = Date.now();
      state.lastUpdated = Date.now();
    });
  },

  reset: () => {
    set((state) => {
      // Reset to initial state
      Object.assign(state, initialCommonState, {
        lastUpdated: Date.now(),
      });
    });
  },
});
