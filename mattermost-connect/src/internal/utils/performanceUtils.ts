// src/internal/utils/performanceUtils.ts
/**
 * Performance optimization utilities for containers
 */
import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { debounce, throttle } from "lodash-es";

// Define basic interfaces for debounced and throttled functions
interface CancellableFunction {
  cancel(): void;
  flush(): void;
}

// Custom type definitions for lodash functions to avoid dependency on @types/lodash
interface DebouncedFunction<T extends (...args: any[]) => any>
  extends CancellableFunction {
  (...args: Parameters<T>): ReturnType<T> | undefined;
}

interface ThrottledFunction<T extends (...args: any[]) => any>
  extends CancellableFunction {
  (...args: Parameters<T>): ReturnType<T>;
}

/**
 * Creates a stable callback that keeps the same reference
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
): T {
  const callbackRef = useRef<T>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);

  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    [],
  );
}

/**
 * Creates a debounced version of a function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  func: T,
  wait = 300,
  options = {},
): DebouncedFunction<T> {
  const debouncedFunc = useRef(
    debounce(func, wait, options) as unknown as DebouncedFunction<T>,
  );

  useEffect(() => {
    const newDebouncedFunc = debounce(
      func,
      wait,
      options,
    ) as unknown as DebouncedFunction<T>;
    debouncedFunc.current = newDebouncedFunc;

    return () => {
      debouncedFunc.current.cancel();
    };
  }, [func, wait]);

  return debouncedFunc.current;
}

/**
 * Creates a throttled version of a function
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  func: T,
  wait = 300,
  options = {},
): ThrottledFunction<T> {
  const throttledFunc = useRef(
    throttle(func, wait, options) as unknown as ThrottledFunction<T>,
  );

  useEffect(() => {
    const newThrottledFunc = throttle(
      func,
      wait,
      options,
    ) as unknown as ThrottledFunction<T>;
    throttledFunc.current = newThrottledFunc;

    return () => {
      throttledFunc.current.cancel();
    };
  }, [func, wait]);

  return throttledFunc.current;
}

/**
 * Creates a memoized object by deeply comparing dependencies
 */
export function useDeepMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
): T {
  const ref = useRef<{ deps: React.DependencyList; value: T }>({
    deps: [],
    value: {} as T,
  });

  const depsChanged = !deps.every((dep, i) => {
    try {
      return JSON.stringify(dep) === JSON.stringify(ref.current.deps[i]);
    } catch (e) {
      return dep === ref.current.deps[i];
    }
  });

  if (depsChanged || ref.current.deps.length !== deps.length) {
    ref.current = {
      deps,
      value: factory(),
    };
  }

  return ref.current.value;
}

/**
 * Creates a stable handler function for component events
 */
export function useEventHandler<
  E extends React.SyntheticEvent<any>,
  T extends (event: E, ...args: any[]) => void,
>(handler: T, deps: React.DependencyList): T {
  return useStableCallback(handler, deps);
}

/**
 * Tracks previous value of a variable across renders
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Creates an optimized state that only updates when value actually changes
 */
export function useOptimizedState<T>(initialValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(initialValue);
  const prevValueRef = useRef<T>(initialValue);

  const setOptimizedState = useCallback((newValue: T) => {
    try {
      if (JSON.stringify(newValue) !== JSON.stringify(prevValueRef.current)) {
        prevValueRef.current = newValue;
        setState(newValue);
      }
    } catch (e) {
      prevValueRef.current = newValue;
      setState(newValue);
    }
  }, []);

  return [state, setOptimizedState];
}

/**
 * Memoizes UI props to prevent unnecessary re-renders
 */
export function useMemoizedProps<T extends Record<string, any>>(
  propsFactory: () => T,
  deps: React.DependencyList,
): T {
  return useMemo(propsFactory, deps);
}

/**
 * Tracks render count and time for performance debugging
 */
export function useRenderTracker(componentName: string): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    const newTime = performance.now();
    const timeSinceLastRender = newTime - lastRenderTime.current;
    renderCount.current += 1;

    console.log(
      `%c[${componentName}] render #${renderCount.current} (${timeSinceLastRender.toFixed(2)}ms)`,
      "color: #6495ED",
    );

    lastRenderTime.current = newTime;
  });
}

/**
 * Delays the loading state to prevent flicker for fast operations
 */
export function useDelayedLoading(isLoading: boolean, delayMs = 300): boolean {
  const [delayedLoading, setDelayedLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      timerRef.current = setTimeout(() => {
        setDelayedLoading(true);
      }, delayMs);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setDelayedLoading(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading, delayMs]);

  return delayedLoading;
}
