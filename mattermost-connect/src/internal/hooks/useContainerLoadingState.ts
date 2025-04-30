// src/internal/hooks/useContainerLoadingState.ts
/**
 * Container loading state hook
 * Provides standardized loading state management for container components
 */
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { LoadingProps, ErrorStateProps } from "../types/componentTypes";
import { useDelayedLoading } from "../utils/performanceUtils";
import {
  mergeLoadingStates,
  createLoadingStateProps,
  createErrorStateProps,
} from "../utils/containerUtils";

/**
 * Loading state configuration options
 */
export interface LoadingStateOptions {
  /** Initial loading state */
  initialLoading?: boolean;
  /** Initial error state */
  initialError?: Error | null;
  /** Minimum loading time in milliseconds for UX (default: 300) */
  minLoadingTime?: number;
  /** Loading delay time in milliseconds to prevent flash of loading state (default: 150) */
  loadingDelay?: number;
  /** Whether to run cleanup on unmount (default: true) */
  cleanupOnUnmount?: boolean;
  /** Callback on loading state change */
  onLoadingChange?: (isLoading: boolean) => void;
  /** Callback on error state change */
  onError?: (error: Error | null) => void;
}

/**
 * Loading state returned by the hook
 */
export interface LoadingState {
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Whether initial load has completed */
  isInitialLoading: boolean;
  /** Whether a refresh or subsequent load is in progress */
  isRefreshing: boolean;
  /** Whether any operation is loading (initial, refresh, or specific ID) */
  isAnyLoading: boolean;
  /** Specific items being loaded by ID */
  loadingIds: Set<string>;
  /** Current error if any */
  error: Error | null;
  /** Whether there is an error */
  hasError: boolean;
  /** Timestamp of when loading started */
  loadingStartedAt: number | null;
  /** Timestamp of last successful load */
  lastLoadedAt: number | null;
}

/**
 * Loading actions returned by the hook
 */
export interface LoadingActions {
  /** Set loading state */
  setLoading: (isLoading: boolean) => void;
  /** Set loading state for a specific ID */
  setLoadingId: (id: string, isLoading: boolean) => void;
  /** Set error state */
  setError: (error: Error | null) => void;
  /** Reset loading state */
  resetLoading: () => void;
  /** Reset error state */
  resetError: () => void;
  /** Reset both loading and error states */
  reset: () => void;
  /** Mark an operation as started with tracking */
  startLoading: () => void;
  /** Mark an operation as completed with tracking */
  completeLoading: (error?: Error | null) => void;
  /** Start a tracked loading operation and return a completion function */
  trackLoadingOperation: () => (error?: Error | null) => void;
}

/**
 * Return type for the useContainerLoadingState hook
 */
export interface UseLoadingStateResult {
  /** Loading state */
  loadingState: LoadingState;
  /** Loading actions */
  loadingActions: LoadingActions;
  /** Standardized UI props for loading components */
  loadingProps: LoadingProps;
  /** Standardized UI props for error components */
  errorProps: ErrorStateProps;
  /** Execute a function with loading state tracking */
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
  /** Create an abortion controller that will be cleaned up automatically */
  createAbortController: () => AbortController;
}

/**
 * Container loading state hook
 * Provides standardized loading state management for container components
 *
 * @param options - Loading state configuration options
 * @returns Loading state, actions, and UI props
 *
 * @example
 * ```tsx
 * const { loadingProps, errorProps, loadingState, loadingActions, withLoading } = useContainerLoadingState({
 *   initialLoading: true,
 *   minLoadingTime: 500,
 * });
 *
 * // Use withLoading to automatically track loading state
 * const fetchData = useCallback(() => {
 *   withLoading(async () => {
 *     try {
 *       const data = await api.getData();
 *       setData(data);
 *     } catch (error) {
 *       // Error is automatically set in the loading state
 *       console.error(error);
 *     }
 *   });
 * }, [withLoading]);
 * ```
 */
export function useContainerLoadingState(
  options: LoadingStateOptions = {},
): UseLoadingStateResult {
  const {
    initialLoading = false,
    initialError = null,
    minLoadingTime = 300,
    loadingDelay = 150,
    cleanupOnUnmount = true,
    onLoadingChange,
    onError,
  } = options;

  // Internal state
  const [isLoadingInternal, setIsLoadingInternal] =
    useState<boolean>(initialLoading);
  const [isInitialLoadingInternal, setIsInitialLoadingInternal] =
    useState<boolean>(initialLoading);
  const [isRefreshingInternal, setIsRefreshingInternal] =
    useState<boolean>(false);
  const [loadingIdsInternal, setLoadingIdsInternal] = useState<Set<string>>(
    new Set(),
  );
  const [errorInternal, setErrorInternal] = useState<Error | null>(
    initialError,
  );
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(
    initialLoading ? Date.now() : null,
  );
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);

  // Track loading operations to prevent race conditions
  const operationCounter = useRef<number>(0);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Delay showing loading indicator to prevent flicker for fast operations
  const isLoading = useDelayedLoading(isLoadingInternal, {
    delay: loadingDelay,
    minDuration: minLoadingTime,
  });

  // Set loading with minimum time enforcement
  const setLoading = useCallback(
    (loading: boolean) => {
      const now = Date.now();
      setIsLoadingInternal(loading);

      // If transitioning to loading, update loading start time
      if (loading && !isLoadingInternal) {
        setLoadingStartedAt(now);

        // If we have never loaded before, this is initial loading
        if (lastLoadedAt === null) {
          setIsInitialLoadingInternal(true);
          setIsRefreshingInternal(false);
        } else {
          // Otherwise it's a refresh
          setIsInitialLoadingInternal(false);
          setIsRefreshingInternal(true);
        }
      }
      // If transitioning from loading to not loading
      else if (!loading && isLoadingInternal) {
        setLastLoadedAt(now);
        setIsInitialLoadingInternal(false);
        setIsRefreshingInternal(false);
      }

      // Call the change callback if provided
      if (onLoadingChange && loading !== isLoadingInternal) {
        onLoadingChange(loading);
      }
    },
    [isLoadingInternal, lastLoadedAt, onLoadingChange],
  );

  // Set loading for a specific ID
  const setLoadingId = useCallback((id: string, loading: boolean) => {
    setLoadingIdsInternal((currentIds) => {
      const newIds = new Set(currentIds);
      if (loading) {
        newIds.add(id);
      } else {
        newIds.delete(id);
      }
      return newIds;
    });
  }, []);

  // Set error state
  const setError = useCallback(
    (error: Error | null) => {
      setErrorInternal(error);

      if (onError && error !== errorInternal) {
        onError(error);
      }
    },
    [errorInternal, onError],
  );

  // Reset states
  const resetLoading = useCallback(() => {
    setIsLoadingInternal(false);
    setIsInitialLoadingInternal(false);
    setIsRefreshingInternal(false);
    setLoadingIdsInternal(new Set());
    setLoadingStartedAt(null);
  }, []);

  const resetError = useCallback(() => {
    setErrorInternal(null);
  }, []);

  const reset = useCallback(() => {
    resetLoading();
    resetError();
  }, [resetLoading, resetError]);

  // Mark an operation as started with tracking
  const startLoading = useCallback(() => {
    operationCounter.current += 1;
    setLoading(true);
  }, [setLoading]);

  // Mark an operation as completed with tracking
  const completeLoading = useCallback(
    (error?: Error | null) => {
      operationCounter.current = Math.max(0, operationCounter.current - 1);

      // Only update error if provided
      if (error !== undefined) {
        setError(error);
      }

      // Only mark as done if no more operations are running
      if (operationCounter.current === 0) {
        setLoading(false);
      }
    },
    [setLoading, setError],
  );

  // Start a tracked loading operation and return a completion function
  const trackLoadingOperation = useCallback(() => {
    startLoading();
    return (error?: Error | null) => completeLoading(error);
  }, [startLoading, completeLoading]);

  // Execute a function with loading state tracking
  const withLoading = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      const complete = trackLoadingOperation();
      try {
        const result = await fn();
        complete(null);
        return result;
      } catch (error) {
        complete(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    },
    [trackLoadingOperation],
  );

  // Create an abortion controller that will be cleaned up automatically
  const createAbortController = useCallback(() => {
    const controller = new AbortController();
    const id =
      Date.now().toString() + Math.random().toString(36).substring(2, 9);
    abortControllers.current.set(id, controller);

    return controller;
  }, []);

  // Calculate isAnyLoading state
  const isAnyLoading = isLoading || loadingIdsInternal.size > 0;
  const hasError = errorInternal !== null;

  // Create loading state object
  const loadingState: LoadingState = useMemo(
    () => ({
      isLoading,
      isInitialLoading: isInitialLoadingInternal,
      isRefreshing: isRefreshingInternal,
      isAnyLoading,
      loadingIds: loadingIdsInternal,
      error: errorInternal,
      hasError,
      loadingStartedAt,
      lastLoadedAt,
    }),
    [
      isLoading,
      isInitialLoadingInternal,
      isRefreshingInternal,
      isAnyLoading,
      loadingIdsInternal,
      errorInternal,
      hasError,
      loadingStartedAt,
      lastLoadedAt,
    ],
  );

  // Create loading actions object
  const loadingActions: LoadingActions = useMemo(
    () => ({
      setLoading,
      setLoadingId,
      setError,
      resetLoading,
      resetError,
      reset,
      startLoading,
      completeLoading,
      trackLoadingOperation,
    }),
    [
      setLoading,
      setLoadingId,
      setError,
      resetLoading,
      resetError,
      reset,
      startLoading,
      completeLoading,
      trackLoadingOperation,
    ],
  );

  // Create standardized UI props for loading components
  const loadingProps: LoadingProps = useMemo(
    () => createLoadingStateProps(isLoading),
    [isLoading],
  );

  // Create standardized UI props for error components
  const errorProps: ErrorStateProps = useMemo(
    () =>
      createErrorStateProps(errorInternal, {
        onRetry: reset,
      }),
    [errorInternal, reset],
  );

  // Clean up abort controllers on unmount
  useEffect(() => {
    return () => {
      if (cleanupOnUnmount) {
        // Abort any in-progress requests
        abortControllers.current.forEach((controller) => {
          try {
            controller.abort();
          } catch (error) {
            console.error("Error aborting request:", error);
          }
        });

        // Clear controllers map
        abortControllers.current.clear();

        // Reset state if configured to do so
        resetLoading();
        resetError();
      }
    };
  }, [cleanupOnUnmount, resetLoading, resetError]);

  return {
    loadingState,
    loadingActions,
    loadingProps,
    errorProps,
    withLoading,
    createAbortController,
  };
}

export default useContainerLoadingState;
