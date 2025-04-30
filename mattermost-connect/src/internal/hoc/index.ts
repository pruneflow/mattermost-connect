// src/internal/hoc/index.ts
/**
 * Higher-Order Components (HOCs)
 *
 * This file exports all HOCs for easy importing
 */

// Import all HOCs and their types
import withErrorBoundary, {
  WithErrorBoundaryOptions,
} from "./withErrorBoundary";

import withLoading, { WithLoadingOptions } from "./withLoading";

import withPagination, { WithPaginationOptions } from "./withPagination";

import withSearch, { WithSearchOptions } from "./withSearch";

import withSorting, { WithSortingOptions } from "./withSorting";
import React from "react";

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

// Types d'options pour les fonctions composées
type EnhancementOption<T> = T | boolean;

/**
 * Options pour withListEnhancements
 */
export interface WithListEnhancementsOptions {
  /** Options pour le HOC d'error boundary, ou false pour le désactiver */
  errorBoundary?: EnhancementOption<WithErrorBoundaryOptions>;
  /** Options pour le HOC de loading, ou false pour le désactiver */
  loading?: EnhancementOption<WithLoadingOptions>;
  /** Options pour le HOC de pagination, ou false pour le désactiver */
  pagination?: EnhancementOption<WithPaginationOptions>;
  /** Options pour le HOC de recherche, ou false pour le désactiver */
  search?: EnhancementOption<WithSearchOptions<any>>;
  /** Options pour le HOC de tri, ou false pour le désactiver */
  sorting?: EnhancementOption<WithSortingOptions>;
}

/**
 * Options pour withDetailEnhancements
 */
export interface WithDetailEnhancementsOptions {
  /** Options pour le HOC d'error boundary, ou false pour le désactiver */
  errorBoundary?: EnhancementOption<WithErrorBoundaryOptions>;
  /** Options pour le HOC de loading, ou false pour le désactiver */
  loading?: EnhancementOption<WithLoadingOptions>;
}

// Fonction utilitaire pour extraire les options correctes
function extractOptions<T>(
  option: EnhancementOption<T> | undefined,
): T | undefined {
  if (option === undefined || option === false) {
    return undefined;
  }
  return option === true ? ({} as T) : option;
}

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
  options: WithListEnhancementsOptions = {},
): React.ComponentType<any> {
  // Start with base component
  let EnhancedComponent: React.ComponentType<any> = Component;

  // Apply pagination (innermost HOC - operates on the component first)
  const paginationOptions = extractOptions(options.pagination);
  if (paginationOptions) {
    EnhancedComponent = withPagination(EnhancedComponent, paginationOptions);
  }

  // Apply sorting
  const sortingOptions = extractOptions(options.sorting);
  if (sortingOptions) {
    EnhancedComponent = withSorting(EnhancedComponent, sortingOptions);
  }

  // Apply search
  const searchOptions = extractOptions(options.search);
  if (searchOptions) {
    EnhancedComponent = withSearch(EnhancedComponent, searchOptions);
  }

  // Apply loading state
  const loadingOptions = extractOptions(options.loading);
  if (loadingOptions) {
    EnhancedComponent = withLoading(EnhancedComponent, loadingOptions);
  }

  // Apply error boundary (outermost HOC - catches errors from all other HOCs)
  const errorOptions = extractOptions(options.errorBoundary);
  if (errorOptions) {
    EnhancedComponent = withErrorBoundary(EnhancedComponent, errorOptions);
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
  options: WithDetailEnhancementsOptions = {},
): React.ComponentType<any> {
  // Start with base component
  let EnhancedComponent: React.ComponentType<any> = Component;

  // Apply loading state
  const loadingOptions = extractOptions(options.loading);
  if (loadingOptions) {
    EnhancedComponent = withLoading(EnhancedComponent, loadingOptions);
  }

  // Apply error boundary (outermost HOC)
  const errorOptions = extractOptions(options.errorBoundary);
  if (errorOptions) {
    EnhancedComponent = withErrorBoundary(EnhancedComponent, errorOptions);
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
