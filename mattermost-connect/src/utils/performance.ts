// src/utils/performance.ts
/**
 * Performance utilities
 * Using established libraries for performance-critical operations
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { debounce, throttle, memoize } from "lodash-es";
import useDeepCompareEffect from "use-deep-compare-effect";

// Re-export lodash functions for use throughout the app
export { debounce, throttle, memoize };

/**
 * Hook that debounces a value
 */
export function useDebouncedValue<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that creates a debounced version of a function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay = 300,
  options = {},
): T {
  // Use useCallback to prevent unnecessary re-creation of the debounced function
  return useCallback(debounce(callback, delay, options), [
    callback,
    delay,
  ]) as unknown as T;
}

/**
 * Hook that creates a throttled version of a function
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit = 300,
  options = {},
): T {
  // Use useCallback to prevent unnecessary re-creation of the throttled function
  return useCallback(throttle(callback, limit, options), [
    callback,
    limit,
  ]) as unknown as T;
}

/**
 * Hook that compares previous and current values
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Re-export useDeepCompareEffect hook from use-deep-compare-effect
 */
export { useDeepCompareEffect };

/**
 * Hook that memoizes a callback with deep comparisons
 */
export function useDeepCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
): T {
  const ref = useRef<T>(callback);

  useDeepCompareEffect(() => {
    ref.current = callback;
  }, [callback, ...deps]);

  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T;
}

/**
 * Hook to track render performance in development
 */
export function useRenderTimer(componentName: string): void {
  // Only in development
  if (process.env.NODE_ENV === "development") {
    const renderCount = useRef(0);
    const startTime = useRef(performance.now());

    useEffect(() => {
      const endTime = performance.now();
      const timeElapsed = endTime - startTime.current;
      renderCount.current += 1;

      console.log(
        `[${componentName}] render #${renderCount.current} in ${timeElapsed.toFixed(2)}ms`,
      );

      startTime.current = performance.now();
    });
  }
}
