// src/internal/utils/performanceUtils.ts
/**
 * Performance utilities for components
 * Provides optimization helpers to prevent unnecessary rerenders and improve UX
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  DependencyList,
  useMemo,
} from "react";
import { debounce, throttle } from "lodash-es";
import useDeepCompareEffect from "use-deep-compare-effect";

/**
 * Options for delayed loading hook
 */
export interface DelayedLoadingOptions {
  /** Delay before showing loading state (ms) */
  delay?: number;
  /** Minimum duration to show loading state (ms) */
  minDuration?: number;
}

/**
 * Creates a stable callback that doesn't change unless dependencies change
 *
 * @param callback - Function to stabilize
 * @param deps - Dependencies to watch for changes
 * @returns Stable callback function
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList = [],
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, deps);
}

/**
 * Creates a debounced version of a callback function
 *
 * @param callback - Function to debounce
 * @param wait - Debounce wait time in milliseconds
 * @param deps - Dependencies to watch for changes
 * @returns Debounced callback function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  wait: number = 300,
  deps: DependencyList = [],
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(debounce(callback, wait), deps) as unknown as T;
}

/**
 * Creates a throttled version of a callback function
 *
 * @param callback - Function to throttle
 * @param limit - Throttle limit in milliseconds
 * @param deps - Dependencies to watch for changes
 * @returns Throttled callback function
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number = 300,
  deps: DependencyList = [],
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(throttle(callback, limit), deps) as unknown as T;
}

/**
 * Provides access to previous value of a variable
 *
 * @param value - Current value
 * @returns The previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Creates a deeply memoized value that only changes if deep contents change
 *
 * @param value - Value to memoize
 * @param deps - Dependencies to watch for changes
 * @returns Memoized value
 */
export function useDeepMemo<T>(value: T, deps: DependencyList): T {
  const ref = useRef<T>(value);

  useDeepCompareEffect(() => {
    ref.current = value;
  }, [value, ...deps]);

  return ref.current;
}

/**
 * Creates an optimized state that only updates when the value actually changes
 *
 * @param initialValue - Initial state value
 * @returns [value, setValue] tuple like React.useState
 */
export function useOptimizedState<T>(initialValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(initialValue);

  const setOptimizedState = useCallback((value: T) => {
    setState((prevValue) => {
      // Simple equality check for primitives
      if (prevValue === value) {
        return prevValue;
      }

      // Deep equality check for objects and arrays
      if (
        typeof prevValue === "object" &&
        prevValue !== null &&
        typeof value === "object" &&
        value !== null
      ) {
        const prevKeys = Object.keys(prevValue);
        const nextKeys = Object.keys(value);

        if (
          prevKeys.length === nextKeys.length &&
          prevKeys.every(
            (key) =>
              // @ts-ignore - dynamic keys
              prevValue[key] === value[key],
          )
        ) {
          return prevValue;
        }
      }

      return value;
    });
  }, []);

  return [state, setOptimizedState];
}

/**
 * Delays showing loading state to prevent flickering for fast operations
 *
 * @param isLoading - Current loading state
 * @param options - Delay and minimum duration options
 * @returns Delayed loading state
 */
export function useDelayedLoading(
  isLoading: boolean,
  options: DelayedLoadingOptions = {},
): boolean {
  const { delay = 300, minDuration = 500 } = options;
  const [delayedLoading, setDelayedLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Clear any existing delay timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Set a timer to show loading after delay
      timerRef.current = setTimeout(() => {
        setDelayedLoading(true);
        loadingStartRef.current = Date.now();
      }, delay);
    } else {
      // If loading stops
      if (delayedLoading && loadingStartRef.current) {
        const timeElapsed = Date.now() - loadingStartRef.current;

        // If hasn't shown for minimum duration, keep showing for a bit longer
        if (timeElapsed < minDuration) {
          timerRef.current = setTimeout(() => {
            setDelayedLoading(false);
            loadingStartRef.current = null;
          }, minDuration - timeElapsed);
        } else {
          // Has already shown long enough, hide immediately
          setDelayedLoading(false);
          loadingStartRef.current = null;
        }
      }

      // Cancel any pending delay timer if loading stopped before it triggered
      if (!delayedLoading && timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    // Clean up timers
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoading, delayedLoading, delay, minDuration]);

  return delayedLoading;
}

/**
 * Memoizes complex props to prevent rerenders in child components
 *
 * @param props - Props object to memoize
 * @returns Memoized props object
 */
export function useMemoizedProps<T extends Record<string, any>>(props: T): T {
  return useMemo(() => props, Object.values(props));
}

/**
 * Tracks renders in development mode for debugging
 *
 * @param componentName - Name of the component to track
 */
export function useRenderTracker(componentName: string): void {
  const renderCount = useRef(0);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      renderCount.current += 1;
      console.log(
        `[RENDER] ${componentName} rendered ${renderCount.current} times`,
      );
    }
  });
}
