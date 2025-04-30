// src/internal/utils/containerUtils.ts
/**
 * Utility functions for container components
 * Provides helpers for common container patterns and optimizations
 */
import React, { useMemo } from "react";
import { SxProps, Theme } from "@mui/material";
import {
  BaseComponentProps,
  ItemState,
  AsyncStatus,
} from "../types/componentTypes";
import { useStableCallback, useMemoizedProps } from "./performanceUtils";

/**
 * Merges component props with base properties
 * Allows containers to pass styling and identification props to UI components
 *
 * @param props Base component props
 * @param additionalSx Additional sx props to merge
 * @param additionalClassName Additional className to merge
 * @param additionalId Additional id to merge
 * @returns Merged base component props
 */
export function mergeBaseProps(
  props?: BaseComponentProps,
  additionalSx?: SxProps<Theme>,
  additionalClassName?: string,
  additionalId?: string,
): BaseComponentProps {
  const baseProps: BaseComponentProps = { ...props };

  // Merge sx props if both exist
  if (props?.sx && additionalSx) {
    baseProps.sx = [props.sx, additionalSx];
  } else if (additionalSx) {
    baseProps.sx = additionalSx;
  }

  // Merge classNames if both exist
  if (props?.className && additionalClassName) {
    baseProps.className = `${props.className} ${additionalClassName}`;
  } else if (additionalClassName) {
    baseProps.className = additionalClassName;
  }

  // Use additionalId as fallback
  if (!baseProps.id && additionalId) {
    baseProps.id = additionalId;
  }

  return baseProps;
}

/**
 * Creates an id with optional prefix for DOM elements
 * Useful for generating consistent IDs for accessibility
 *
 * @param base Base string for the ID
 * @param suffix Optional suffix to add
 * @param prefix Optional prefix to add
 * @returns Generated ID string
 */
export function createElementId(
  base: string,
  suffix?: string | number,
  prefix = "mc",
): string {
  return `${prefix}-${base}${suffix ? `-${suffix}` : ""}`;
}

/**
 * Type for item state mapper function
 */
type ItemStateMapper<T> = (item: T, index: number) => ItemState;

/**
 * Maps item data to standardized item states
 * Used to convert domain data to UI state flags
 *
 * @param items Array of items to map
 * @param mapper Function that maps each item to its state
 * @returns Array of items with their associated states
 */
export function mapItemStates<T>(
  items: T[],
  mapper: ItemStateMapper<T>,
): Array<T & ItemState> {
  return items.map((item, index) => ({
    ...item,
    ...mapper(item, index),
  }));
}

/**
 * Helper to create a stable handler with item ID
 * Creates a callback that includes the item ID when triggered
 *
 * @param handler Base handler function that receives item ID and event
 * @param itemId ID of the item associated with this handler
 * @returns Stable handler function with the item ID pre-bound
 */
export function createItemHandler<E extends React.SyntheticEvent<any>>(
  handler: ((itemId: string, event: E) => void) | undefined,
  itemId: string,
): ((event: E) => void) | undefined {
  if (!handler) return undefined;

  return useStableCallback(
    (event: E) => {
      handler(itemId, event);
    },
    [itemId, handler],
  );
}

/**
 * Creates standard item action handlers
 * Maps common actions to stable handlers with pre-bound item IDs
 *
 * @param itemId ID of the item
 * @param handlers Object containing handler functions
 * @returns Object with stable handler functions
 */
export function createItemActionHandlers<T extends Record<string, any>>(
  itemId: string,
  handlers: T,
): {
  [K in keyof T]: T[K] extends Function
    ? (event: React.SyntheticEvent) => void
    : T[K];
} {
  const result: any = {};

  Object.entries(handlers).forEach(([key, handler]) => {
    if (typeof handler === "function") {
      result[key] = createItemHandler(handler as any, itemId);
    } else {
      result[key] = handler;
    }
  });

  return result;
}

/**
 * Type for consistent API loading states
 */
interface ApiLoadingState {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  status: AsyncStatus;
}

/**
 * Merges multiple API loading states
 * Useful when a container uses multiple API hooks
 *
 * @param states Array of loading states to merge
 * @returns Merged loading state
 */
export function mergeLoadingStates(states: ApiLoadingState[]): ApiLoadingState {
  return {
    isLoading: states.some((state) => state.isLoading),
    isError: states.some((state) => state.isError),
    error: states.find((state) => state.error)?.error || null,
    status: determineAggregateStatus(states.map((state) => state.status)),
  };
}

/**
 * Determines the aggregate status from multiple status values
 *
 * @param statuses Array of status values
 * @returns Aggregate status
 */
function determineAggregateStatus(statuses: AsyncStatus[]): AsyncStatus {
  if (statuses.some((status) => status === "error")) return "error";
  if (statuses.some((status) => status === "loading")) return "loading";
  if (statuses.every((status) => status === "success")) return "success";
  return "idle";
}

/**
 * Type for item identity function
 */
type ItemIdentifier<T> = (item: T) => string;

/**
 * Creates a map of items by ID
 *
 * @param items Array of items to map
 * @param idGetter Function to extract ID from an item
 * @returns Record mapping IDs to items
 */
export function createItemsById<T>(
  items: T[],
  idGetter: ItemIdentifier<T>,
): Record<string, T> {
  return items.reduce<Record<string, T>>((acc, item) => {
    const id = idGetter(item);
    acc[id] = item;
    return acc;
  }, {});
}

/**
 * Creates default pagination state
 *
 * @param initialPage Initial page number (1-based)
 * @param initialPerPage Initial items per page
 * @returns Default pagination state
 */
export function createDefaultPagination(
  initialPage = 1,
  initialPerPage = 20,
): { page: number; perPage: number } {
  return {
    page: initialPage,
    perPage: initialPerPage,
  };
}

/**
 * Creates standard UI props for a component
 * Memoizes the props to prevent unnecessary re-renders
 *
 * @param propsFactory Function that creates the props
 * @param deps Dependencies array
 * @returns Memoized UI props
 */
export function createUiProps<T extends Record<string, any>>(
  propsFactory: () => T,
  deps: React.DependencyList,
): T {
  return useMemoizedProps(propsFactory, deps);
}

/**
 * Generates standard empty state props
 *
 * @param state State object with count and loading status
 * @param options Configuration options
 * @returns Empty state props
 */
export function createEmptyStateProps(
  state: { count: number; isLoading: boolean },
  options: {
    message?: string;
    icon?: string;
    actionText?: string;
    onAction?: () => void;
  } = {},
): {
  showEmptyState: boolean;
  emptyStateMessage: string;
  emptyStateIcon: string;
  emptyStateActionText?: string;
  onEmptyStateAction?: () => void;
} {
  return {
    showEmptyState: !state.isLoading && state.count === 0,
    emptyStateMessage: options.message || "No items found",
    emptyStateIcon: options.icon || "inbox",
    emptyStateActionText: options.actionText,
    onEmptyStateAction: options.onAction,
  };
}

/**
 * Generates standard loading state props
 *
 * @param isLoading Whether currently loading
 * @param options Configuration options
 * @returns Loading state props
 */
export function createLoadingStateProps(
  isLoading: boolean,
  options: {
    text?: string;
    variant?: "circular" | "linear" | "skeleton";
    show?: boolean;
  } = {},
): {
  isLoading: boolean;
  showLoadingIndicator: boolean;
  loadingText: string;
  loadingVariant: "circular" | "linear" | "skeleton";
} {
  return {
    isLoading,
    showLoadingIndicator: options.show ?? isLoading,
    loadingText: options.text || "Loading...",
    loadingVariant: options.variant || "circular",
  };
}

/**
 * Generates standard error state props
 *
 * @param error Error object or null
 * @param options Configuration options
 * @returns Error state props
 */
export function createErrorStateProps(
  error: Error | null,
  options: {
    message?: string;
    showRetry?: boolean;
    retryText?: string;
    onRetry?: () => void;
  } = {},
): {
  error: Error | null;
  showError: boolean;
  errorMessage: string;
  showRetry: boolean;
  retryText: string;
  onRetry?: () => void;
} {
  return {
    error,
    showError: !!error,
    errorMessage: options.message || error?.message || "An error occurred",
    showRetry: options.showRetry ?? true,
    retryText: options.retryText || "Retry",
    onRetry: options.onRetry,
  };
}

/**
 * Memoizes an array of items by their IDs
 * Useful to prevent re-renders when only references change
 *
 * @param items Array of items
 * @param idGetter Function to extract ID from an item
 * @returns Memoized array of items
 */
export function memoizeItemsById<T>(
  items: T[] | undefined | null,
  idGetter: ItemIdentifier<T>,
): T[] {
  return useMemo(() => {
    if (!items) return [];

    // Create a map of items by ID
    const itemsById = createItemsById(items, idGetter);

    // Create an array of IDs
    const ids = Object.keys(itemsById);

    // Return items in same order as original array
    return ids.map((id) => itemsById[id]);
  }, [
    // Generate a stable dependency key from item IDs and a hash of each item
    items ? JSON.stringify(items.map((item) => idGetter(item))) : "",
    // The length is also a dependency to handle additions/removals
    items?.length,
  ]);
}

/**
 * Creates filter function for search
 *
 * @param searchTerm Term to search for
 * @param fields Fields to search in
 * @returns Filter function
 */
export function createSearchFilter<T>(
  searchTerm: string,
  fields: (keyof T)[],
): (item: T) => boolean {
  if (!searchTerm) return () => true;

  const lowerTerm = searchTerm.toLowerCase();

  return (item: T) => {
    return fields.some((field) => {
      const value = item[field];
      if (typeof value === "string") {
        return value.toLowerCase().includes(lowerTerm);
      }
      if (typeof value === "number" || typeof value === "boolean") {
        return String(value).toLowerCase().includes(lowerTerm);
      }
      return false;
    });
  };
}
