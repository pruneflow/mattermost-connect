// src/internal/hooks/index.ts
/**
 * Hooks
 *
 * This file exports all internal hooks for easy importing
 */

// Dialog Hook
export { default as useDialog, type DialogResult } from "./useDialog";

// Hook for pagination management
export {
  useContainerPagination,
  type PaginationOptions,
  type PaginationState,
  type PaginationActions,
  type UsePaginationResult,
} from "./useContainerPagination";

// Hook for search functionality
export {
  useContainerSearch,
  type SearchOptions,
  type SearchState,
  type SearchActions,
  type UseSearchResult,
} from "./useContainerSearch";

// Hook for sorting functionality
export {
  useContainerSorting,
  type SortingOptions,
  type SortingState,
  type SortingActions,
  type UseSortingResult,
  type SortDirection,
  type SortField,
} from "./useContainerSorting";

// Hook for selection management
export {
  useContainerSelection,
  type SelectionOptions,
  type SelectionState,
  type SelectionActions,
  type UseSelectionResult,
  type SelectionMode,
} from "./useContainerSelection";

// Hook for loading state management
export {
  useContainerLoadingState,
  type LoadingStateOptions,
  type LoadingState,
  type LoadingActions,
  type UseLoadingStateResult,
} from "./useContainerLoadingState";

// Directly import each hook for the containerHooks object
import useContainerPaginationHook from "./useContainerPagination";
import useContainerSearchHook from "./useContainerSearch";
import useContainerSortingHook from "./useContainerSorting";
import useContainerSelectionHook from "./useContainerSelection";
import useContainerLoadingStateHook from "./useContainerLoadingState";

// Export all hooks as a named object for easier access
export const containerHooks = {
  useContainerPagination: useContainerPaginationHook,
  useContainerSearch: useContainerSearchHook,
  useContainerSorting: useContainerSortingHook,
  useContainerSelection: useContainerSelectionHook,
  useContainerLoadingState: useContainerLoadingStateHook,
};

export default containerHooks;
