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
import { LoadingState, ErrorState, StoreState } from "../../types";

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
  errors: {},
  lastFetchTimes: {},
  lastUpdated: Date.now(),
};

/**
 * Creates a store with standard middleware configuration
 * @param name Store name for DevTools
 * @param initialState Initial state
 * @param stateCreator State creator function
 * @returns Zustand store
 */
export function createStore<T extends object>(
  name: string,
  initialState: T,
  stateCreator: StateCreator<
    T,
    [
      ["zustand/immer", never],
      ["zustand/devtools", never],
      ["zustand/subscribeWithSelector", never],
    ]
  >,
) {
  return create<T>()(
    subscribeWithSelector(devtools(immer(stateCreator), { name })),
  );
}

/**
 * Creates a persistent store with standard middleware
 * @param name Store name for DevTools
 * @param initialState Initial state
 * @param stateCreator State creator function
 * @param persistOptions Persistence options
 * @returns Zustand store with persistence
 */
export function createPersistStore<T extends object>(
  name: string,
  initialState: T,
  stateCreator: StateCreator<
    T,
    [
      ["zustand/persist", unknown],
      ["zustand/immer", never],
      ["zustand/devtools", never],
      ["zustand/subscribeWithSelector", never],
    ]
  >,
  persistOptions: Partial<PersistOptions<T>> = {},
) {
  return create<T>()(
    subscribeWithSelector(
      devtools(
        persist(immer(stateCreator), {
          name: `mattermost-${name}`,
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
 * Helper function for creating actions with loading state management
 * @param set Setter function
 * @param defaultState Default state
 * @returns Wrapped action creator
 */
export function createAsyncAction<State extends LoadingState & ErrorState>(
  set: (
    partial:
      | State
      | Partial<State>
      | ((state: State) => State | Partial<State>),
    replace?: boolean,
  ) => void,
) {
  return function wrapAction<Args extends any[], ReturnType>(
    action: (...args: Args) => Promise<ReturnType>,
  ) {
    return async (...args: Args): Promise<ReturnType> => {
      set({ isLoading: true, error: null } as Partial<State>);

      try {
        const result = await action(...args);
        set({ isLoading: false } as Partial<State>);
        return result;
      } catch (error) {
        set({
          isLoading: false,
          error: error as Error,
        } as Partial<State>);
        throw error;
      }
    };
  };
}
