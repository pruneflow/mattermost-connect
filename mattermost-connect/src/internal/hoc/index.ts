// src/internal/hoc/index.ts
/**
 * Higher-Order Components (HOCs)
 *
 * This file exports all HOCs for easy importing
 */

import withErrorBoundary, {
  WithErrorBoundaryOptions,
} from "./withErrorBoundary";
import withLoading, { WithLoadingOptions } from "./withLoading";

// Error Boundary HOC
export {
  withErrorBoundary,
  ErrorBoundary,
  type ErrorBoundaryProps,
  type WithErrorBoundaryOptions,
} from "./withErrorBoundary";

// Loading HOC
export {
  withLoading,
  type WithLoadingOptions,
  type WithLoadingInjectedProps,
} from "./withLoading";

// Pagination HOC
export {
  withPagination,
  DefaultPaginationComponent,
  type WithPaginationOptions,
  type WithPaginationInjectedProps,
} from "./withPagination";

// Search HOC
export {
  withSearch,
  DefaultSearchComponent,
  type WithSearchOptions,
  type WithSearchInjectedProps,
} from "./withSearch";

// Sorting HOC
export {
  withSorting,
  DefaultSortingComponent,
  type WithSortingOptions,
  type WithSortingInjectedProps,
} from "./withSorting";

// Composite HOCs - Convenient combinations of multiple HOCs

/**
 * Combines error boundary, loading, pagination, search, and sorting HOCs
 * This is useful for list containers that need all these features
 *
 * @param Component - Component to wrap
 * @param options - Options for all HOCs
 * @returns Component wrapped with all HOCs
 *
 * @example
 * ```tsx
 * const EnhancedUserList = withListEnhancements(UserList, {
 *   // Error boundary options
 *   errorBoundary: {
 *     errorTitle: "Error Loading Users",
 *     onError: (error) => console.error("User list error:", error)
 *   },
 *   // Loading options
 *   loading: {
 *     initialLoading: true
 *   },
 *   // Pagination options
 *   pagination: {
 *     initialPage: 1,
 *     initialPerPage: 20
 *   },
 *   // Search options
 *   search: {
 *     searchFields: ["name", "email", "username"],
 *     minSearchLength: 2
 *   },
 *   // Sorting options
 *   sorting: {
 *     initialSortField: "name",
 *     sortFields: ["name", "email", "createdAt"]
 *   }
 * });
 * ```
 */
export function withListEnhancements<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    errorBoundary?: WithErrorBoundaryOptions;
    loading?: WithLoadingOptions;
    pagination?: WithPaginationOptions;
    search?: WithSearchOptions;
    sorting?: WithSortingOptions;
  } = {},
) {
  // Apply HOCs in specific order:
  // 1. Error boundary (outermost) - catches errors from all other HOCs
  // 2. Loading - manages loading state
  // 3. Search - filter data
  // 4. Sorting - sort the filtered data
  // 5. Pagination - paginate the sorted data

  // Start with base component
  let EnhancedComponent = Component;

  // Apply pagination (innermost HOC - operates on the component first)
  if (options.pagination !== false) {
    EnhancedComponent = withPagination(EnhancedComponent, options.pagination);
  }

  // Apply sorting
  if (options.sorting !== false) {
    EnhancedComponent = withSorting(EnhancedComponent, options.sorting);
  }

  // Apply search
  if (options.search !== false) {
    EnhancedComponent = withSearch(EnhancedComponent, options.search);
  }

  // Apply loading state
  if (options.loading !== false) {
    EnhancedComponent = withLoading(EnhancedComponent, options.loading);
  }

  // Apply error boundary (outermost HOC - catches errors from all other HOCs)
  if (options.errorBoundary !== false) {
    EnhancedComponent = withErrorBoundary(
      EnhancedComponent,
      options.errorBoundary,
    );
  }

  // Set display name for debugging
  EnhancedComponent.displayName = `withListEnhancements(${
    Component.displayName || Component.name || "Component"
  })`;

  return EnhancedComponent;
}

/**
 * Combines error boundary and loading HOCs
 * This is useful for detail containers that need error handling and loading states
 *
 * @param Component - Component to wrap
 * @param options - Options for error boundary and loading HOCs
 * @returns Component wrapped with error boundary and loading HOCs
 *
 * @example
 * ```tsx
 * const EnhancedUserDetail = withDetailEnhancements(UserDetail, {
 *   // Error boundary options
 *   errorBoundary: {
 *     errorTitle: "Error Loading User Details",
 *     onError: (error) => console.error("User detail error:", error)
 *   },
 *   // Loading options
 *   loading: {
 *     initialLoading: true,
 *     minLoadingTime: 500
 *   }
 * });
 * ```
 */
export function withDetailEnhancements<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    errorBoundary?: WithErrorBoundaryOptions;
    loading?: WithLoadingOptions;
  } = {},
) {
  // Start with base component
  let EnhancedComponent = Component;

  // Apply loading state
  if (options.loading !== false) {
    EnhancedComponent = withLoading(EnhancedComponent, options.loading);
  }

  // Apply error boundary (outermost HOC)
  if (options.errorBoundary !== false) {
    EnhancedComponent = withErrorBoundary(
      EnhancedComponent,
      options.errorBoundary,
    );
  }

  // Set display name for debugging
  EnhancedComponent.displayName = `withDetailEnhancements(${
    Component.displayName || Component.name || "Component"
  })`;

  return EnhancedComponent;
}

// Export individual HOCs as default export object
export default {
  withErrorBoundary,
  withLoading,
  withPagination,
  withSearch,
  withSorting,
  withListEnhancements,
  withDetailEnhancements,
};
