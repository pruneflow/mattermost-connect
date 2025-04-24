// src/core/store/selector-utils.ts
/**
 * Utilities for creating memoized selectors
 * Inspired by the reselect library with TypeScript enhancements
 */

/**
 * A selector is a function that extracts specific data from state
 */
export type Selector<State, Result> = (state: State, ...args: any[]) => Result;

/**
 * Interface for options passed to the createSelector function
 */
export interface CreateSelectorOptions {
  /**
   * Custom equality function for comparing selector results
   */
  equalityFn?: <T>(a: T, b: T) => boolean;

  /**
   * Display name for the selector (useful for debugging)
   */
  displayName?: string;
}

/**
 * Default equality function (strict equality)
 */
export function defaultEqualityFn<T>(a: T, b: T): boolean {
  return a === b;
}

// Type definitions with overloads for different numbers of input selectors

// One input selector
export function createSelector<State, Param1, Result>(
  selector1: Selector<State, Param1>,
  resultFn: (param1: Param1) => Result,
  options?: CreateSelectorOptions,
): Selector<State, Result>;

// Two input selectors
export function createSelector<State, Param1, Param2, Result>(
  selector1: Selector<State, Param1>,
  selector2: Selector<State, Param2>,
  resultFn: (param1: Param1, param2: Param2) => Result,
  options?: CreateSelectorOptions,
): Selector<State, Result>;

// Three input selectors
export function createSelector<State, Param1, Param2, Param3, Result>(
  selector1: Selector<State, Param1>,
  selector2: Selector<State, Param2>,
  selector3: Selector<State, Param3>,
  resultFn: (param1: Param1, param2: Param2, param3: Param3) => Result,
  options?: CreateSelectorOptions,
): Selector<State, Result>;

// Four input selectors
export function createSelector<State, Param1, Param2, Param3, Param4, Result>(
  selector1: Selector<State, Param1>,
  selector2: Selector<State, Param2>,
  selector3: Selector<State, Param3>,
  selector4: Selector<State, Param4>,
  resultFn: (
    param1: Param1,
    param2: Param2,
    param3: Param3,
    param4: Param4,
  ) => Result,
  options?: CreateSelectorOptions,
): Selector<State, Result>;

// Five input selectors
export function createSelector<
  State,
  Param1,
  Param2,
  Param3,
  Param4,
  Param5,
  Result,
>(
  selector1: Selector<State, Param1>,
  selector2: Selector<State, Param2>,
  selector3: Selector<State, Param3>,
  selector4: Selector<State, Param4>,
  selector5: Selector<State, Param5>,
  resultFn: (
    param1: Param1,
    param2: Param2,
    param3: Param3,
    param4: Param4,
    param5: Param5,
  ) => Result,
  options?: CreateSelectorOptions,
): Selector<State, Result>;

// Six input selectors
export function createSelector<
  State,
  Param1,
  Param2,
  Param3,
  Param4,
  Param5,
  Param6,
  Result,
>(
  selector1: Selector<State, Param1>,
  selector2: Selector<State, Param2>,
  selector3: Selector<State, Param3>,
  selector4: Selector<State, Param4>,
  selector5: Selector<State, Param5>,
  selector6: Selector<State, Param6>,
  resultFn: (
    param1: Param1,
    param2: Param2,
    param3: Param3,
    param4: Param4,
    param5: Param5,
    param6: Param6,
  ) => Result,
  options?: CreateSelectorOptions,
): Selector<State, Result>;

// Implementation for all overloads
export function createSelector(...args: any[]): Selector<any, any> {
  let resultFn: Function;
  let selectors: Selector<any, any>[];
  let options: CreateSelectorOptions = {};

  // Parse arguments based on their types
  if (
    typeof args[args.length - 1] === "object" &&
    !(args[args.length - 1] instanceof Function) &&
    args.length > 2
  ) {
    options = args[args.length - 1] as CreateSelectorOptions;
    resultFn = args[args.length - 2] as Function;
    selectors = args.slice(0, args.length - 2) as Selector<any, any>[];
  } else {
    resultFn = args[args.length - 1] as Function;
    selectors = args.slice(0, args.length - 1) as Selector<any, any>[];
  }

  const { equalityFn = defaultEqualityFn, displayName } = options;

  // For debugging
  const selectorName = displayName || resultFn.name || "anonymous";

  // Memoization state
  let lastParams: any[] = [];
  let lastResults: any[] = [];
  let lastResult: any;
  let hasRun = false;

  // Return a function that:
  // 1. Accepts a state object and optional additional args
  // 2. Calls all selectors with the state and args
  // 3. Compares the results with the previous run
  // 4. If different, recalculates with resultFn
  // 5. Returns the memoized or new result
  const selector = function (state: any, ...args: any[]) {
    // Call each input selector with the state and args
    const params = selectors.map((selector) => selector(state, ...args));

    // Check if any params have changed
    const shouldRecalculate =
      !hasRun || params.some((param, i) => !equalityFn(param, lastParams[i]));

    if (shouldRecalculate) {
      // Store the new params
      lastParams = params;

      // Calculate new result
      lastResult = resultFn(...params);
      hasRun = true;
    }

    return lastResult;
  };

  // Add a displayName for debugging
  Object.defineProperty(selector, "name", { value: `select${selectorName}` });

  return selector;
}

/**
 * Creates a selector factory that accepts parameters.
 * This is useful for creating reusable selectors that need external parameters
 * beyond just the state.
 *
 * @example
 * const getUserById = createParameterizedSelector(
 *   (userId: string) => createSelector(
 *     selectUsers,
 *     users => users[userId]
 *   )
 * );
 *
 * // Usage:
 * const user = getUserById('user123')(state);
 */
export function createParameterizedSelector<Params extends any[], Result>(
  selectorFactory: (...args: Params) => Selector<any, Result>,
): (...args: Params) => Selector<any, Result> {
  return selectorFactory;
}

/**
 * Creates a memoized factory for selectors that need parameters.
 * Unlike createParameterizedSelector, this memoizes the factory itself
 * to avoid creating new selector functions on each render.
 *
 * @example
 * const makeSelectUserById = createMemoizedSelectorFactory();
 *
 * // In component:
 * const selectUserById = useMemo(
 *   () => makeSelectUserById(userId),
 *   [userId]
 * );
 * const user = useSelector(selectUserById);
 */
export function createMemoizedSelectorFactory<State, Result>() {
  // Map to cache selectors by their parameter values
  const cache = new Map<string, Selector<State, Result>>();

  return <Param>(
    param: Param,
    selectorFn: (state: State, param: Param) => Result,
  ): Selector<State, Result> => {
    const cacheKey =
      typeof param === "object" ? JSON.stringify(param) : String(param);

    if (!cache.has(cacheKey)) {
      cache.set(cacheKey, (state: State) => selectorFn(state, param));
    }

    return cache.get(cacheKey)!;
  };
}
