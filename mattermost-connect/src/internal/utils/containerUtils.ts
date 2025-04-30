/**
 * Container utilities
 * Provides helper functions for container components
 */
import {
  LoadingProps,
  ErrorStateProps,
  SortOption,
  PaginationProps,
  EmptyStateProps,
  ItemState,
} from "../types/componentTypes";

/**
 * Options for identifying items
 */
export interface ItemIdentifierOptions<T> {
  /** Field to use as ID */
  idField: keyof T;
}

/**
 * Options for search filtering
 */
export interface SearchFilterOptions {
  /** Whether search is case sensitive */
  caseSensitive?: boolean;
  /** Search mode */
  mode?: "contains" | "startsWith" | "exact";
}

/**
 * Item state mapping options
 */
export interface ItemStateMapOptions<T> {
  /** Function to determine if item is selected */
  isSelected?: (item: T) => boolean;
  /** Function to determine if item is disabled */
  isDisabled?: (item: T) => boolean;
  /** Function to determine if item is loading */
  isLoading?: (item: T) => boolean;
  /** Function to determine if item has error */
  hasError?: (item: T) => boolean;
}

/**
 * Empty state options
 */
export interface EmptyStateOptions {
  /** Empty message */
  message?: string;
  /** Action text */
  actionText?: string;
  /** Icon type */
  icon?: "search" | "add" | "info" | "error" | "none";
  /** Action callback */
  onAction?: () => void;
}

/**
 * UI props generation options
 */
export interface UiPropsOptions {
  /** Base props */
  baseProps?: Record<string, any>;
  /** Whether to include common props */
  includeCommonProps?: boolean;
  /** Whether component is disabled */
  disabled?: boolean;
}

/**
 * Merges base props with additional props
 *
 * @param baseProps - Base props
 * @param additionalProps - Additional props to merge
 * @returns Merged props
 */
export function mergeBaseProps(
  baseProps: Record<string, any>,
  additionalProps: Record<string, any>,
): Record<string, any> {
  const {
    className: baseClassName,
    sx: baseSx,
    id: baseId,
    ...baseRest
  } = baseProps;
  const {
    className: addClassName,
    sx: addSx,
    id: addId,
    ...addRest
  } = additionalProps;

  return {
    className:
      [baseClassName, addClassName].filter(Boolean).join(" ") || undefined,
    sx: { ...baseSx, ...addSx },
    id: addId || baseId,
    ...baseRest,
    ...addRest,
  };
}

/**
 * Creates an element ID from a base and suffix
 *
 * @param base - Base ID
 * @param suffix - Suffix to append
 * @returns Generated ID
 */
export function createElementId(base: string, suffix?: string): string {
  return suffix ? `${base}-${suffix}` : base;
}

/**
 * Maps item data to UI item state
 *
 * @param item - Item data
 * @param options - Mapping options
 * @returns Item state
 */
export function mapItemState<T>(
  item: T,
  options: ItemStateMapOptions<T> = {},
): ItemState {
  const { isSelected, isDisabled, isLoading, hasError } = options;

  if (isLoading && isLoading(item)) return "loading";
  if (hasError && hasError(item)) return "error";
  if (isDisabled && isDisabled(item)) return "disabled";
  if (isSelected && isSelected(item)) return "selected";

  return "default";
}

/**
 * Creates a map of items by ID for quick lookup
 *
 * @param items - Array of items
 * @param options - Item identifier options
 * @returns Map of items by ID
 */
export function createItemsById<T extends Record<string, any>>(
  items: T[],
  options: ItemIdentifierOptions<T>,
): Record<string, T> {
  const { idField } = options;
  const result: Record<string, T> = {};

  for (const item of items) {
    const id = String(item[idField]);
    result[id] = item;
  }

  return result;
}

/**
 * Creates a memoized version of items by ID
 *
 * @param items - Items array
 * @param prevItemsById - Previous items by ID map
 * @param options - Item identifier options
 * @returns Memoized items by ID map
 */
export function memoizeItemsById<T extends Record<string, any>>(
  items: T[],
  prevItemsById: Record<string, T> | null,
  options: ItemIdentifierOptions<T>,
): Record<string, T> {
  const { idField } = options;

  // If no previous map or no items, create from scratch
  if (!prevItemsById || items.length === 0) {
    return createItemsById(items, options);
  }

  // Check if the items array has changed significantly
  const itemsCount = items.length;
  const prevItemsCount = Object.keys(prevItemsById).length;

  // If the count is very different, recreate from scratch
  if (
    Math.abs(itemsCount - prevItemsCount) >
    Math.min(itemsCount, prevItemsCount) * 0.2
  ) {
    return createItemsById(items, options);
  }

  // Update incrementally for better performance
  const result = { ...prevItemsById };
  const seenIds = new Set<string>();

  // Update or add items
  for (const item of items) {
    const id = String(item[idField]);
    seenIds.add(id);

    // Only update if the item has changed
    if (!prevItemsById[id] || !areItemsEqual(prevItemsById[id], item)) {
      result[id] = item;
    }
  }

  // Remove items that no longer exist
  for (const id in result) {
    if (!seenIds.has(id)) {
      delete result[id];
    }
  }

  return result;
}

/**
 * Simple equality check for objects
 *
 * @param a - First object
 * @param b - Second object
 * @returns Whether objects are equal
 */
function areItemsEqual<T extends Record<string, any>>(a: T, b: T): boolean {
  // Simple reference equality check
  if (a === b) return true;

  // Compare serialized values for deep equality
  // This is a simplification - in a real app, use a more efficient deep equality check
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Creates a search filter function for filtering items
 *
 * @param fields - Fields to search in
 * @param options - Search filter options
 * @returns Filter function
 */
export function createSearchFilter<T extends Record<string, any>>(
  fields: string[],
  options: SearchFilterOptions = {},
): (item: T, searchTerm: string) => boolean {
  const { caseSensitive = false, mode = "contains" } = options;

  return (item: T, searchTerm: string): boolean => {
    if (!searchTerm) return true;

    const term = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    for (const field of fields) {
      const value = item[field];

      if (value == null) continue;

      const stringValue = caseSensitive
        ? String(value)
        : String(value).toLowerCase();

      if (mode === "contains" && stringValue.includes(term)) {
        return true;
      }

      if (mode === "startsWith" && stringValue.startsWith(term)) {
        return true;
      }

      if (mode === "exact" && stringValue === term) {
        return true;
      }
    }

    return false;
  };
}

/**
 * Merges multiple loading states
 *
 * @param loadingStates - Array of loading states
 * @returns Combined loading state
 */
export function mergeLoadingStates(loadingStates: boolean[]): boolean {
  return loadingStates.some((state) => state);
}

/**
 * Creates standardized loading props
 *
 * @param isLoading - Loading state
 * @param options - Additional options
 * @returns Loading props
 */
export function createLoadingStateProps(
  isLoading: boolean,
  options: Record<string, any> = {},
): LoadingProps {
  return {
    show: isLoading,
    variant: options.variant || "circular",
    text: options.text || "Loading...",
  };
}

/**
 * Creates standardized error props
 *
 * @param error - Error object
 * @param options - Additional options
 * @returns Error props
 */
export function createErrorStateProps(
  error: Error | null,
  options: Record<string, any> = {},
): ErrorStateProps {
  if (!error) {
    return {
      message: undefined,
      showRetry: false,
    };
  }

  return {
    message: error.message || "An error occurred",
    showRetry: options.onRetry !== undefined,
    retryText: options.retryText || "Retry",
    onRetry: options.onRetry,
  };
}

/**
 * Creates standardized empty state props
 *
 * @param options - Empty state options
 * @returns Empty state props
 */
export function createEmptyStateProps(
  options: EmptyStateOptions = {},
): EmptyStateProps {
  return {
    message: options.message || "No items to display",
    showAction: !!options.onAction,
    actionText: options.actionText || "Add Item",
    onAction: options.onAction,
    icon: options.icon || "info",
  };
}

/**
 * Creates default pagination configuration
 *
 * @returns Default pagination props
 */
export function createDefaultPagination(): PaginationProps {
  return {
    page: 1,
    perPage: 20,
    perPageOptions: [10, 20, 50, 100],
    showFirstLastButtons: true,
    siblingCount: 1,
  };
}

/**
 * Creates UI props from data and options
 *
 * @param data - Data object
 * @param options - UI props options
 * @returns UI props
 */
export function createUiProps<T extends Record<string, any>>(
  data: T,
  options: UiPropsOptions = {},
): Record<string, any> {
  const {
    baseProps = {},
    includeCommonProps = true,
    disabled = false,
  } = options;

  const props: Record<string, any> = { ...data };

  // Add common props if requested
  if (includeCommonProps) {
    props.disabled = disabled;
  }

  // Merge with base props
  return mergeBaseProps(baseProps, props);
}

/**
 * Creates item action handlers map
 *
 * @param handlers - Base handlers
 * @param itemId - Item ID
 * @returns Bound handlers
 */
export function createItemActionHandlers<
  T extends Record<string, (...args: any[]) => void>,
>(handlers: T, itemId: string): T {
  const result = {} as T;

  for (const [key, handler] of Object.entries(handlers)) {
    result[key as keyof T] = ((...args: any[]) =>
      handler(itemId, ...args)) as any;
  }

  return result;
}

/**
 * Formats a count with K/M suffixes for large numbers
 *
 * @param count - Number to format
 * @param digits - Number of decimal digits
 * @returns Formatted count
 */
export function formatCompactCount(count: number, digits: number = 1): string {
  if (count < 1000) {
    return count.toString();
  }

  if (count < 1000000) {
    return (count / 1000).toFixed(digits) + "K";
  }

  return (count / 1000000).toFixed(digits) + "M";
}

/**
 * Generates random ID for temporary elements
 *
 * @returns Random ID string
 */
export function generateTempId(): string {
  return "temp-" + Math.random().toString(36).substring(2, 11);
}

/**
 * Safely accesses a nested object property by path
 *
 * @param obj - Object to access
 * @param path - Property path (e.g., 'user.profile.name')
 * @param defaultValue - Default value if path doesn't exist
 * @returns Property value or default
 */
export function getNestedProperty<T, D = undefined>(
  obj: Record<string, any>,
  path: string,
  defaultValue?: D,
): T | D {
  const keys = path.split(".");
  let current: any = obj;

  for (const key of keys) {
    if (current === undefined || current === null) {
      return defaultValue as D;
    }
    current = current[key];
  }

  return current === undefined ? (defaultValue as D) : (current as T);
}

/**
 * Delays execution for specified time
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safely calls a function with error handling
 *
 * @param fn - Function to call
 * @param args - Arguments to pass
 * @returns Function result or undefined on error
 */
export function safeCall<T, A extends any[]>(
  fn: (...args: A) => T,
  ...args: A
): T | undefined {
  try {
    return fn(...args);
  } catch (err) {
    console.error("Error in safeCall:", err);
    return undefined;
  }
}
