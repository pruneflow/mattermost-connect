// src/core/store/slices/commonSlice.ts
/**
 * Common slice for Zustand stores
 * Provides reusable state and actions using Zustand's native patterns
 */
import { CommonState, ErrorSource, ErrorSeverity } from "../../../types";

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
 * Initial state for common slice
 */
export const initialCommonState: CommonState = {
  isLoading: false,
  loadingIds: [],
  error: null,
  errors: [],
  lastError: null,
  hasUnhandledError: false,
  errorsBySource: {
    [ErrorSource.API]: [],
    [ErrorSource.AUTH]: [],
    [ErrorSource.WEBSOCKET]: [],
    [ErrorSource.UI]: [],
    [ErrorSource.STORAGE]: [],
    [ErrorSource.UNKNOWN]: [],
  },
  errorsBySeverity: {
    [ErrorSeverity.INFO]: [],
    [ErrorSeverity.WARNING]: [],
    [ErrorSeverity.ERROR]: [],
    [ErrorSeverity.CRITICAL]: [],
  },
  lastUpdated: Date.now(),
  lastFetchTimes: {},
};

/**
 * Creates a common slice with standard loading/error state management
 * Compatible with immer middleware in Zustand
 *
 * @param set Function to update the store state
 * @returns CommonState with both state and actions
 */
export const createCommonSlice = <T extends CommonState>(
  set: (fn: (state: T) => void) => void,
): CommonState & CommonSliceActions => ({
  ...initialCommonState,

  /**
   * Sets the global loading state
   * @param isLoading Whether loading is in progress
   */
  setLoading: (isLoading: boolean) => {
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
  setLoadingId: (id: string, isLoading: boolean) => {
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
  setError: (error: Error | null) => {
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
  setErrorForId: (id: string, error: Error | null) => {
    set((state) => {
      // Create errorMap if it doesn't exist yet
      if (!state.errorMap) {
        state.errorMap = {};
      }

      if (error) {
        state.errorMap[id] = error;
      } else if (state.errorMap[id]) {
        delete state.errorMap[id];
      }

      state.lastUpdated = Date.now();
    });
  },

  /**
   * Updates the last fetch time for an entity
   * @param id Entity ID
   */
  updateLastFetchTime: (id: string) => {
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
