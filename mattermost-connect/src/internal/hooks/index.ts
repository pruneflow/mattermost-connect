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
  type PaginationOptions,
  type PaginationState,
  type PaginationActions,
  type UsePaginationResult,
} from "./useContainerPagination";

// Hook for search functionality
export {
  type SearchOptions,
  type SearchState,
  type SearchActions,
  type UseSearchResult,
} from "./useContainerSearch";

// Hook for sorting functionality
export {
  type SortingOptions,
  type SortingState,
  type SortingActions,
  type UseSortingResult,
  type SortDirection,
  type SortField,
} from "./useContainerSorting";

// Hook for selection management
export {
  type SelectionOptions,
  type SelectionState,
  type SelectionActions,
  type UseSelectionResult,
  type SelectionMode,
} from "./useContainerSelection";

// Hook for loading state management
export {
  type LoadingStateOptions,
  type LoadingState,
  type LoadingActions,
  type UseLoadingStateResult,
} from "./useContainerLoadingState";

export {
  type UserContainerOptions,
  type UseUserContainerResult,
} from "./useContainerUser";

// Directly import each hook for the containerHooks object
import useContainerPaginationHook from "./useContainerPagination";
import useContainerSearchHook from "./useContainerSearch";
import useContainerSortingHook from "./useContainerSorting";
import useContainerSelectionHook from "./useContainerSelection";
import useContainerLoadingStateHook from "./useContainerLoadingState";
import useDialogHook from "./useDialog";
import useContainerUserHook from "./useContainerUser";

// Export all hooks as a named object for easier access
export const containerHooks = {
  useContainerPagination: useContainerPaginationHook,
  useContainerSearch: useContainerSearchHook,
  useContainerSorting: useContainerSortingHook,
  useContainerSelection: useContainerSelectionHook,
  useContainerLoadingState: useContainerLoadingStateHook,
  useDialog: useDialogHook,
  useContainerUser: useContainerUserHook,
};

export default containerHooks;
