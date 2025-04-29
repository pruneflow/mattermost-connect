// src/core/store/storeUtils.ts
/**
 * Store utilities for Zustand
 * Provides lightweight wrappers around standard Zustand middlewares
 */
import { StateCreator, StoreApi, create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, PersistOptions } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import { subscribeWithSelector } from "zustand/middleware";
import {
  LoadingState,
  ErrorState,
  StoreState,
  ErrorSource,
  ErrorSeverity,
} from "../../types";

/**
 * Basic state interface
 */
export interface BaseState extends LoadingState, ErrorState, StoreState {
  lastFetchTimes: Record<string, number>;
}

/**
 * Base state initial values
 */
export const initialBaseState: BaseState = {
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
  lastFetchTimes: {},
  lastUpdated: Date.now(),
};

/**
 * Type helper for creating middleware chains
 */
type ExtractState<S> = S extends { getState: () => infer T } ? T : never;

/**
 * Creates a store with standard middleware configuration
 * @param name Store name for DevTools
 * @param stateCreator State creator function
 * @returns Zustand store
 */
export function createStore<T>(
  name: string,
  stateCreator: StateCreator<T, [["zustand/immer", never]]>,
) {
  return create<T>()(
    subscribeWithSelector(devtools(immer(stateCreator), { name })),
  );
}

/**
 * Creates a persistent store with standard middleware
 * @param name Store name for DevTools
 * @param stateCreator State creator function
 * @param persistOptions Persistence options
 * @returns Zustand store with persistence
 */
export function createPersistStore<T>(
  name: string,
  stateCreator: StateCreator<T, [["zustand/immer", never]]>,
  persistOptions: Partial<PersistOptions<T>> = {},
) {
  const storeName = `mattermost-${name}`;

  return create<T>()(
    subscribeWithSelector(
      devtools(
        persist(immer(stateCreator), {
          name: storeName,
          ...persistOptions,
        }),
        { name },
      ),
    ),
  );
}

/**
 * Creates a selector that memoizes its result
 * Wrapper around zustand's standard selector pattern
 * @param selector Selector function
 * @returns Selector function
 */
export function createSelector<State, Result>(
  selector: (state: State) => Result,
) {
  return selector;
}

/**
 * Helper for creating asynchronous actions with loading state management
 * @param set Setter function from Zustand
 * @returns A function that wraps an async action with loading state management
 */
export function createAsyncActionCreator<
  State extends LoadingState & ErrorState,
>(
  set: (
    partial: State | Partial<State> | ((state: State) => void),
    replace?: boolean,
  ) => void,
) {
  return function wrapAction<Args extends any[], ReturnType>(
    action: (...args: Args) => Promise<ReturnType>,
  ) {
    return async (...args: Args): Promise<ReturnType> => {
      // Set loading state
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        // Execute the action
        const result = await action(...args);

        // Clear loading state on success
        set((state) => {
          state.isLoading = false;
        });

        return result;
      } catch (error) {
        // Set error state on failure
        set((state) => {
          state.isLoading = false;
          state.error = error as Error;
        });

        throw error;
      }
    };
  };
}

/**
 * Creates a slice of state with loading/error management
 * @param set Setter function from Zustand
 * @param initialState Optional initial state
 * @returns State and actions for loading/error management
 */
export function createLoadingSlice<S extends LoadingState & ErrorState>(
  set: (fn: (state: S) => void) => void,
  initialState?: Partial<LoadingState & ErrorState>,
) {
  return {
    isLoading: initialState?.isLoading || false,
    loadingIds: initialState?.loadingIds || [],
    error: initialState?.error || null,
    errors: initialState?.errors || [],
    lastError: initialState?.lastError || null,
    hasUnhandledError: initialState?.hasUnhandledError || false,
    errorsBySource: initialState?.errorsBySource || {
      [ErrorSource.API]: [],
      [ErrorSource.AUTH]: [],
      [ErrorSource.WEBSOCKET]: [],
      [ErrorSource.UI]: [],
      [ErrorSource.STORAGE]: [],
      [ErrorSource.UNKNOWN]: [],
    },
    errorsBySeverity: initialState?.errorsBySeverity || {
      [ErrorSeverity.INFO]: [],
      [ErrorSeverity.WARNING]: [],
      [ErrorSeverity.ERROR]: [],
      [ErrorSeverity.CRITICAL]: [],
    },

    setLoading: (isLoading: boolean) =>
      set((state) => {
        state.isLoading = isLoading;
        if (!isLoading) {
          state.loadingIds = [];
        }
      }),

    setLoadingId: (id: string, isLoading: boolean) =>
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
      }),

    setError: (error: Error | null) =>
      set((state) => {
        state.error = error;
      }),

    setErrorForId: (id: string, error: Error | null) =>
      set((state) => {
        // Create errorMap if it doesn't exist yet
        if (!state.errorMap) {
          state.errorMap = {};
        }

        // Handle error addition or removal
        if (error === null) {
          // Remove error for this ID
          if (state.errorMap[id]) {
            delete state.errorMap[id];
          }
        } else {
          // Store error in the map
          state.errorMap[id] = error;

          // Set global error if it's the first error
          if (state.error === null) {
            state.error = error;
          }
        }

        // Update loading state if needed
        // Remove ID from loading state if error is cleared
        const loadingIndex = state.loadingIds.indexOf(id);
        if (error === null && loadingIndex !== -1) {
          // If we're clearing the error, also remove from loading state
          state.loadingIds.splice(loadingIndex, 1);
          // Update global loading state
          state.isLoading = state.loadingIds.length > 0;
        }
      }),

    clearErrors: () =>
      set((state) => {
        state.error = null;
        state.errors = [];
        state.lastError = null;
        state.hasUnhandledError = false;

        // Réinitialiser les collections d'erreurs
        Object.keys(state.errorsBySource).forEach((source) => {
          state.errorsBySource[source as ErrorSource] = [];
        });

        Object.keys(state.errorsBySeverity).forEach((severity) => {
          state.errorsBySeverity[severity as ErrorSeverity] = [];
        });
      }),
  };
}
