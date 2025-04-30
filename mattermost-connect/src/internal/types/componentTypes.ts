// src/internal/types/componentTypes.ts
/**
 * Common component types for the internal components library
 * Defines standardized props interfaces for all container components
 */

/**
 * Base component props for all components
 */
export interface BaseComponentProps {
  /** CSS class name */
  className?: string;
  /** Material-UI sx prop for custom styling */
  sx?: any;
  /** Component ID */
  id?: string;
}

/**
 * Display variant options for components
 */
export type DisplayVariant = "list" | "grid" | "sidebar" | "tabs";

/**
 * Density variant options for components
 */
export type DensityVariant = "compact" | "comfortable" | "spacious";

/**
 * Size variant options for components
 */
export type SizeVariant = "small" | "medium" | "large";

/**
 * Item state options
 */
export type ItemState =
  | "default"
  | "selected"
  | "disabled"
  | "loading"
  | "error";

/**
 * Login mode options
 */
export type LoginMode = "direct" | "proxy";

// --------------------------
// LOADING RELATED PROPS
// --------------------------

/**
 * Loading props for components
 */
export interface LoadingProps {
  /** Whether the component is in loading state */
  show?: boolean;
  /** Loading variant */
  variant?: "circular" | "linear" | "skeleton";
  /** Loading text */
  text?: string;
}

/**
 * Error state props for components
 */
export interface ErrorStateProps {
  /** Error message */
  message?: string;
  /** Whether to show retry button */
  showRetry?: boolean;
  /** Retry button text */
  retryText?: string;
  /** Retry action callback */
  onRetry?: () => void;
}

/**
 * Empty state props for components
 */
export interface EmptyStateProps {
  /** Empty state message */
  message?: string;
  /** Whether to show an action button */
  showAction?: boolean;
  /** Action button text */
  actionText?: string;
  /** Action callback */
  onAction?: () => void;
  /** Empty state icon type */
  icon?: "search" | "add" | "info" | "error" | "none";
}

// --------------------------
// SEARCH RELATED PROPS
// --------------------------

/**
 * Search props for components
 */
export interface SearchProps {
  /** Search text */
  searchTerm?: string;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Whether search is disabled */
  disabled?: boolean;
  /** Minimum characters to start searching */
  minSearchLength?: number;
  /** Whether search is currently processing */
  isSearching?: boolean;
  /** Search change callback */
  onSearchChange?: (term: string) => void;
  /** Search clear callback */
  onSearchClear?: () => void;
}

// --------------------------
// SORTING RELATED PROPS
// --------------------------

/**
 * Sort option item
 */
export interface SortOption {
  /** Field identifier */
  field: string;
  /** Display label */
  label: string;
}

/**
 * Sorting props for components
 */
export interface SortingProps {
  /** Current sort field */
  sortField?: string;
  /** Current sort direction */
  sortDirection?: "asc" | "desc";
  /** Available sort options */
  sortOptions?: SortOption[];
  /** Whether sorting is disabled */
  disabled?: boolean;
  /** Sort change callback */
  onSortChange?: (field: string, direction?: "asc" | "desc") => void;
  /** Sort field change callback */
  onSortFieldChange?: (field: string) => void;
  /** Sort direction change callback */
  onSortDirectionChange?: () => void;
}

// --------------------------
// SELECTION RELATED PROPS
// --------------------------

/**
 * Selection props for components
 */
export interface SelectionProps {
  /** Selected item IDs */
  selectedIds?: string[];
  /** Selection mode */
  mode?: "single" | "multiple" | "none";
  /** Whether selection is disabled */
  disabled?: boolean;
  /** Whether all items are selected */
  isAllSelected?: boolean;
  /** Whether any items are selected */
  hasSelection?: boolean;
  /** Number of selected items */
  selectedCount?: number;
  /** Maximum number of selectable items */
  maxSelectedItems?: number;
  /** Whether to allow deselection by clicking selected item */
  allowDeselect?: boolean;
  /** Selection change callback */
  onSelectionChange?: (ids: string[]) => void;
  /** Toggle selection callback */
  onToggleSelection?: (id: string) => void;
  /** Select item callback */
  onSelectItem?: (id: string) => void;
  /** Deselect item callback */
  onDeselectItem?: (id: string) => void;
  /** Select all callback */
  onSelectAll?: () => void;
  /** Deselect all callback */
  onDeselectAll?: () => void;
}

// --------------------------
// PAGINATION RELATED PROPS
// --------------------------

/**
 * Pagination props for components
 */
export interface PaginationProps {
  /** Current page number */
  page?: number;
  /** Items per page */
  perPage?: number;
  /** Total number of pages */
  totalPages?: number;
  /** Total number of items */
  totalItems?: number;
  /** Available page size options */
  perPageOptions?: number[];
  /** Whether pagination is disabled */
  disabled?: boolean;
  /** Whether to show first/last page buttons */
  showFirstLastButtons?: boolean;
  /** Number of page buttons to show before/after current page */
  siblingCount?: number;
  /** Page change callback */
  onPageChange?: (page: number) => void;
  /** Per page change callback */
  onPerPageChange?: (perPage: number) => void;
}

// --------------------------
// FILTERING RELATED PROPS
// --------------------------

/**
 * Filter option
 */
export interface FilterOption {
  /** Filter value */
  value: string;
  /** Display label */
  label: string;
  /** Filter count */
  count?: number;
  /** Whether this filter is selected */
  selected?: boolean;
}

/**
 * Filter group
 */
export interface FilterGroup {
  /** Filter group ID */
  id: string;
  /** Display label */
  label: string;
  /** Filter options */
  options: FilterOption[];
  /** Whether multiple options can be selected */
  multiSelect?: boolean;
}

/**
 * Filter props for components
 */
export interface FilterProps {
  /** Filter groups */
  filterGroups?: FilterGroup[];
  /** Whether filtering is disabled */
  disabled?: boolean;
  /** Filter change callback */
  onFilterChange?: (
    groupId: string,
    value: string | string[],
    selected: boolean,
  ) => void;
  /** Reset filters callback */
  onResetFilters?: () => void;
}

// --------------------------
// ACTION RELATED PROPS
// --------------------------

/**
 * Action props for components
 */
export interface ActionProps {
  /** Whether actions are enabled */
  actionsEnabled?: boolean;
  /** Available actions */
  actions?: Array<{
    /** Action ID */
    id: string;
    /** Display label */
    label: string;
    /** Action icon */
    icon?: string;
    /** Whether this action is disabled */
    disabled?: boolean;
    /** Whether this action is destructive */
    destructive?: boolean;
    /** Whether this action requires confirmation */
    requiresConfirmation?: boolean;
    /** Confirmation message */
    confirmationMessage?: string;
  }>;
  /** Action click callback */
  onAction?: (actionId: string, itemId?: string) => void;
}

// --------------------------
// VIRTUALIZATION PROPS
// --------------------------

/**
 * Virtualization props for list components
 */
export interface VirtualizationProps {
  /** Whether virtualization is enabled */
  enabled?: boolean;
  /** Fixed item height (for better performance) */
  itemHeight?: number;
  /** Number of items to render beyond visible area */
  overscanCount?: number;
}
