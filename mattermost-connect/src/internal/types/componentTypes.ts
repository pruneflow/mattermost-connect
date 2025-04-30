// src/internal/types/componentTypes.ts
/**
 * Common type definitions for UI components
 * Provides standardized prop interfaces and variants for all components
 */
import { Theme } from "@mui/material/styles";

// Use a more compatible type definition for SxProps
type SxProps = object | ((theme: Theme) => object);

/**
 * Base component props interface
 * Extended by all component props to ensure consistent styling and identification
 */
export interface BaseComponentProps {
  /** Optional CSS class name */
  className?: string;
  /** MUI system props for advanced styling */
  sx?: SxProps;
  /** Element ID for testing or accessibility */
  id?: string;
}

/**
 * Display variants for list-based components
 */
export type DisplayVariant = "list" | "grid" | "sidebar" | "tabs" | "cards";

/**
 * Density variants for spacing control
 */
export type DensityVariant = "compact" | "comfortable" | "spacious";

/**
 * Size variants for component scaling
 */
export type SizeVariant = "small" | "medium" | "large";

/**
 * Authentication mode options
 */
export type LoginMode = "direct" | "proxy" | "sso";

/**
 * Status for asynchronous operations
 */
export type AsyncStatus = "idle" | "loading" | "success" | "error";

/**
 * Icon position options
 */
export type IconPosition = "left" | "right" | "top" | "bottom";

/**
 * Alignment options for content positioning
 */
export type AlignmentOption = "start" | "center" | "end" | "stretch";

/**
 * Visual item state
 */
export interface ItemState {
  /** Whether the item is currently selected */
  isSelected?: boolean;
  /** Whether the item is currently active */
  isActive?: boolean;
  /** Whether the item is currently focused */
  isFocused?: boolean;
  /** Whether the item is currently hovered */
  isHovered?: boolean;
  /** Whether the item is currently disabled */
  isDisabled?: boolean;
  /** Whether the item is currently loading */
  isLoading?: boolean;
  /** Whether the item has unread content */
  hasUnread?: boolean;
  /** Whether the item has mentions */
  hasMention?: boolean;
  /** Whether the item is muted */
  isMuted?: boolean;
  /** Whether the item is favorited */
  isFavorite?: boolean;
}

/**
 * Common selection props for list-based components
 */
export interface SelectionProps {
  /** Whether selection is enabled */
  selectable?: boolean;
  /** Whether multiple selection is allowed */
  multiSelect?: boolean;
  /** Currently selected item IDs */
  selectedIds?: string[];
  /** Callback when selection changes */
  onSelectionChange?: (ids: string[]) => void;
}

/**
 * Common loading state props
 */
export interface LoadingProps {
  /** Whether component is in loading state */
  isLoading?: boolean;
  /** Whether to show a loading indicator */
  showLoadingIndicator?: boolean;
  /** Custom loading text */
  loadingText?: string;
  /** Loading indicator variant */
  loadingVariant?: "circular" | "linear" | "skeleton";
}

/**
 * Common empty state props
 */
export interface EmptyStateProps {
  /** Whether to show an empty state when no items exist */
  showEmptyState?: boolean;
  /** Custom empty state message */
  emptyStateMessage?: string;
  /** Custom empty state icon name */
  emptyStateIcon?: string;
  /** Action button text for empty state */
  emptyStateActionText?: string;
  /** Callback for empty state action button */
  onEmptyStateAction?: () => void;
}

/**
 * Common error state props
 */
export interface ErrorStateProps {
  /** Error object if an error occurred */
  error?: Error | null;
  /** Whether to show error state */
  showError?: boolean;
  /** Custom error message override */
  errorMessage?: string;
  /** Whether to show retry button */
  showRetry?: boolean;
  /** Custom retry button text */
  retryText?: string;
  /** Callback for retry button */
  onRetry?: () => void;
}

/**
 * Common search props
 */
export interface SearchProps {
  /** Whether search is enabled */
  showSearch?: boolean;
  /** Current search term */
  searchTerm?: string;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Callback when search term changes */
  onSearchChange?: (term: string) => void;
  /** Fields to search in */
  searchFields?: string[];
}

/**
 * Common pagination props
 */
export interface PaginationProps {
  /** Whether pagination is enabled */
  paginated?: boolean;
  /** Current page number (1-based) */
  page?: number;
  /** Number of items per page */
  perPage?: number;
  /** Total number of items */
  totalItems?: number;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Callback when items per page changes */
  onPerPageChange?: (perPage: number) => void;
}

/**
 * Common sorting props
 */
export interface SortingProps {
  /** Whether sorting is enabled */
  sortable?: boolean;
  /** Current sort field */
  sortField?: string;
  /** Current sort direction */
  sortDirection?: "asc" | "desc";
  /** Available sort options */
  sortOptions?: Array<{
    field: string;
    label: string;
  }>;
  /** Callback when sort changes */
  onSortChange?: (field: string, direction: "asc" | "desc") => void;
}

/**
 * Common action props
 */
export interface ActionProps {
  /** Whether actions are enabled */
  showActions?: boolean;
  /** Available actions */
  actions?: Array<{
    id: string;
    label: string;
    icon?: string;
    color?: "primary" | "secondary" | "error" | "warning" | "info" | "success";
    isDestructive?: boolean;
    isDisabled?: boolean;
  }>;
  /** Callback when an action is triggered */
  onAction?: (actionId: string, itemId?: string) => void;
}

/**
 * Common filter props
 */
export interface FilterProps {
  /** Whether filtering is enabled */
  showFilters?: boolean;
  /** Current active filters */
  activeFilters?: Record<string, any>;
  /** Available filter options */
  filterOptions?: Array<{
    id: string;
    label: string;
    type: "checkbox" | "radio" | "select" | "date" | "text";
    options?: Array<{
      value: string;
      label: string;
    }>;
  }>;
  /** Callback when filters change */
  onFilterChange?: (filters: Record<string, any>) => void;
}

/**
 * Common virtualization props
 */
export interface VirtualizationProps {
  /** Whether virtualization is enabled */
  virtualized?: boolean;
  /** Height of the virtualized container */
  height?: number | string;
  /** Estimated item height for virtualization */
  itemHeight?: number;
  /** Buffer size (number of items to render outside viewport) */
  overscanCount?: number;
}
