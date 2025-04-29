// src/core/store/slices/commonSlice.ts
/**
 * Common slice for Zustand stores
 * Provides reusable state and actions using Zustand's native patterns
 */
import {
  LoadingState,
  ErrorState,
  StoreState,
  ErrorSource,
  AppError,
  ErrorSeverity,
} from "../../../types";

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
  errors: [],
  lastUpdated: Date.now(),
  lastFetchTimes: {},
  lastError: null,
  hasUnhandledError: false,
  errorsBySource: {} as Record<ErrorSource, AppError[]>,
  errorsBySeverity: {} as Record<ErrorSeverity, AppError[]>,
};

/**
 * Creates a common slice with standard loading/error state management
 * Compatible with immer middleware in Zustand
 *
 * @param set Function to update the store state
 * @returns CommonState with both state and actions
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

  /**
   * Sets the global loading state
   * @param isLoading Whether loading is in progress
   */
  setLoading: (isLoading) => {
    set((state) => {
      state.isLoading = isLoading;
      state.lastUpdated = Date.now();

      if (!isLoading) {
        state.loadingIds = [];
      }
    });
  },

  /**
   * Sets loading state for a specific ID
   * @param id Element ID
   * @param isLoading Whether loading is in progress
   */
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

  /**
   * Sets the global error state
   * @param error Error object or null
   */
  setError: (error) => {
    set((state) => {
      state.error = error;
      state.lastUpdated = Date.now();
    });
  },

  /**
   * Sets an error for a specific ID
   * @param id Element ID
   * @param error Error object or null
   */
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

  /**
   * Updates the last fetch time for an entity
   * @param id Entity ID
   */
  updateLastFetchTime: (id) => {
    set((state) => {
      state.lastFetchTimes[id] = Date.now();
      state.lastUpdated = Date.now();
    });
  },

  /**
   * Resets the slice to initial state
   */
  reset: () => {
    set((state) => {
      // Reset to initial state
      Object.assign(state, initialCommonState, {
        lastUpdated: Date.now(),
      });
    });
  },
});
