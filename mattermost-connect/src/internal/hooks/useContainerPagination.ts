// src/internal/hooks/useContainerPagination.ts
/**
 * Container pagination hook
 * Provides standardized pagination functionality for container components
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import { PaginationProps } from "../types/componentTypes";
import {
  useStableCallback,
  useDebouncedCallback,
} from "../utils/performanceUtils";
import { createDefaultPagination } from "../utils/containerUtils";

/**
 * Pagination configuration options
 */
export interface PaginationOptions {
  /** Initial page number (default: 1) */
  initialPage?: number;
  /** Initial items per page (default: 20) */
  initialPerPage?: number;
  /** Total number of items (if known) */
  totalItems?: number;
  /** Whether pagination is enabled (default: true) */
  enabled?: boolean;
  /** Whether to persist pagination state in URL (default: false) */
  persistInUrl?: boolean;
  /** URL parameter name for page (default: 'page') */
  pageParam?: string;
  /** URL parameter name for per page (default: 'per_page') */
  perPageParam?: string;
  /** Allowed per page options */
  perPageOptions?: number[];
  /** Callback when pagination changes */
  onPaginationChange?: (page: number, perPage: number) => void;
}

/**
 * Pagination state returned by the hook
 */
export interface PaginationState {
  /** Current page number */
  page: number;
  /** Items per page */
  perPage: number;
  /** Total number of items (if provided) */
  totalItems?: number;
  /** Total number of pages (calculated if totalItems is provided) */
  totalPages: number;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Current range start (1-based) */
  rangeStart: number;
  /** Current range end (1-based) */
  rangeEnd: number;
  /** Whether the pagination is enabled */
  enabled: boolean;
}

/**
 * Pagination actions returned by the hook
 */
export interface PaginationActions {
  /** Set the current page */
  setPage: (page: number) => void;
  /** Set items per page */
  setPerPage: (perPage: number) => void;
  /** Go to the next page */
  nextPage: () => void;
  /** Go to the previous page */
  previousPage: () => void;
  /** Go to the first page */
  firstPage: () => void;
  /** Go to the last page */
  lastPage: () => void;
  /** Reset pagination to initial values */
  reset: () => void;
}

/**
 * Return type for the useContainerPagination hook
 */
export interface UsePaginationResult {
  /** Pagination state */
  paginationState: PaginationState;
  /** Pagination actions */
  paginationActions: PaginationActions;
  /** Standardized UI props for pagination components */
  paginationProps: PaginationProps;
  /** Calculate the offset for data fetching */
  getOffset: () => number;
  /** Calculate the limit for data fetching */
  getLimit: () => number;
}

/**
 * Container pagination hook
 * Provides standardized pagination functionality for container components
 *
 * @param options - Pagination configuration options
 * @returns Pagination state, actions, and UI props
 *
 * @example
 * ```tsx
 * const { paginationProps, paginationState, paginationActions } = useContainerPagination({
 *   initialPage: 1,
 *   initialPerPage: 25,
 *   totalItems: 100,
 *   onPaginationChange: (page, perPage) => {
 *     fetchData({ page, perPage });
 *   }
 * });
 * ```
 */
export function useContainerPagination(
  options: PaginationOptions = {},
): UsePaginationResult {
  const {
    initialPage = 1,
    initialPerPage = 20,
    totalItems,
    enabled = true,
    persistInUrl = false,
    pageParam = "page",
    perPageParam = "per_page",
    perPageOptions = [10, 20, 50, 100],
    onPaginationChange,
  } = options;

  // Parse URL parameters if persistInUrl is enabled
  const getInitialValuesFromUrl = useCallback(() => {
    if (!persistInUrl) {
      return { page: initialPage, perPage: initialPerPage };
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const pageFromUrl = urlParams.get(pageParam);
      const perPageFromUrl = urlParams.get(perPageParam);

      const parsedPage = pageFromUrl ? parseInt(pageFromUrl, 10) : initialPage;
      const parsedPerPage = perPageFromUrl
        ? parseInt(perPageFromUrl, 10)
        : initialPerPage;

      // Validate parsed values
      const validPage =
        !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : initialPage;
      const validPerPage =
        !isNaN(parsedPerPage) && perPageOptions.includes(parsedPerPage)
          ? parsedPerPage
          : initialPerPage;

      return { page: validPage, perPage: validPerPage };
    } catch (error) {
      console.error("Error parsing pagination URL parameters:", error);
      return { page: initialPage, perPage: initialPerPage };
    }
  }, [
    initialPage,
    initialPerPage,
    persistInUrl,
    pageParam,
    perPageParam,
    perPageOptions,
  ]);

  // Initialize state from URL or initial values
  const [page, setPageInternal] = useState<number>(
    () => getInitialValuesFromUrl().page,
  );
  const [perPage, setPerPageInternal] = useState<number>(
    () => getInitialValuesFromUrl().perPage,
  );

  // Calculate total pages
  const totalPages = useMemo(() => {
    if (!totalItems) return 0;
    return Math.max(1, Math.ceil(totalItems / perPage));
  }, [totalItems, perPage]);

  // Update URL when pagination changes if persistInUrl is enabled
  const updateUrlParams = useCallback(
    (newPage: number, newPerPage: number) => {
      if (!persistInUrl) return;

      try {
        const urlParams = new URLSearchParams(window.location.search);

        // Only set params that differ from defaults
        if (newPage !== initialPage) {
          urlParams.set(pageParam, newPage.toString());
        } else {
          urlParams.delete(pageParam);
        }

        if (newPerPage !== initialPerPage) {
          urlParams.set(perPageParam, newPerPage.toString());
        } else {
          urlParams.delete(perPageParam);
        }

        // Update URL without reloading the page
        const newUrl =
          window.location.pathname +
          (urlParams.toString() ? `?${urlParams.toString()}` : "");
        window.history.replaceState({}, "", newUrl);
      } catch (error) {
        console.error("Error updating pagination URL parameters:", error);
      }
    },
    [persistInUrl, pageParam, perPageParam, initialPage, initialPerPage],
  );

  // Stable callback for pagination changes
  const handlePaginationChange = useStableCallback(
    (newPage: number, newPerPage: number) => {
      if (onPaginationChange) {
        onPaginationChange(newPage, newPerPage);
      }

      // Update URL if persistInUrl is enabled
      updateUrlParams(newPage, newPerPage);
    },
    [onPaginationChange, updateUrlParams],
  );

  // Debounced setPage to prevent rapid changes
  const setPage = useDebouncedCallback(
    (newPage: number) => {
      const validPage = Math.max(
        1,
        Math.min(totalPages || Number.MAX_SAFE_INTEGER, newPage),
      );

      setPageInternal(validPage);
      handlePaginationChange(validPage, perPage);
    },
    150,
    [perPage, totalPages, handlePaginationChange],
  );

  // Set per page with validation
  const setPerPage = useCallback(
    (newPerPage: number) => {
      if (!perPageOptions.includes(newPerPage)) {
        console.warn(
          `Per page value ${newPerPage} is not in the allowed options.`,
        );
        return;
      }

      // Calculate new page to keep the view centered on the same items if possible
      const currentStartItem = (page - 1) * perPage + 1;
      const newPage = Math.max(1, Math.ceil(currentStartItem / newPerPage));

      setPageInternal(newPage);
      setPerPageInternal(newPerPage);
      handlePaginationChange(newPage, newPerPage);
    },
    [page, perPage, perPageOptions, handlePaginationChange],
  );

  // Navigation actions
  const nextPage = useCallback(() => {
    if (totalPages && page < totalPages) {
      setPage(page + 1);
    } else if (!totalPages) {
      setPage(page + 1);
    }
  }, [page, totalPages, setPage]);

  const previousPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page, setPage]);

  const firstPage = useCallback(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [page, setPage]);

  const lastPage = useCallback(() => {
    if (totalPages && page !== totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages, setPage]);

  const reset = useCallback(() => {
    setPage(initialPage);
    setPerPage(initialPerPage);
  }, [initialPage, initialPerPage, setPage, setPerPage]);

  // Calculate current range
  const rangeStart = useMemo(() => (page - 1) * perPage + 1, [page, perPage]);

  const rangeEnd = useMemo(() => {
    if (totalItems) {
      return Math.min(page * perPage, totalItems);
    }
    return page * perPage;
  }, [page, perPage, totalItems]);

  // Determine if there are previous/next pages
  const hasPreviousPage = page > 1;
  const hasNextPage = totalPages ? page < totalPages : true;

  // Create pagination state object
  const paginationState: PaginationState = useMemo(
    () => ({
      page,
      perPage,
      totalItems,
      totalPages,
      hasPreviousPage,
      hasNextPage,
      rangeStart,
      rangeEnd,
      enabled,
    }),
    [
      page,
      perPage,
      totalItems,
      totalPages,
      hasPreviousPage,
      hasNextPage,
      rangeStart,
      rangeEnd,
      enabled,
    ],
  );

  // Create pagination actions object
  const paginationActions: PaginationActions = useMemo(
    () => ({
      setPage,
      setPerPage,
      nextPage,
      previousPage,
      firstPage,
      lastPage,
      reset,
    }),
    [setPage, setPerPage, nextPage, previousPage, firstPage, lastPage, reset],
  );

  // Create standardized UI props for pagination components
  const paginationProps: PaginationProps = useMemo(
    () => ({
      ...createDefaultPagination(),
      page,
      perPage,
      totalPages,
      totalItems,
      perPageOptions,
      onPageChange: setPage,
      onPerPageChange: setPerPage,
      disabled: !enabled,
      showFirstLastButtons: true,
      siblingCount: 1,
    }),
    [
      page,
      perPage,
      totalPages,
      totalItems,
      perPageOptions,
      setPage,
      setPerPage,
      enabled,
    ],
  );

  // Helper methods for API queries
  const getOffset = useCallback(() => (page - 1) * perPage, [page, perPage]);
  const getLimit = useCallback(() => perPage, [perPage]);

  // Update when URL changes (if using URL persistence)
  useEffect(() => {
    if (!persistInUrl) return;

    const handlePopState = () => {
      const { page: newPage, perPage: newPerPage } = getInitialValuesFromUrl();
      if (newPage !== page) {
        setPageInternal(newPage);
      }
      if (newPerPage !== perPage) {
        setPerPageInternal(newPerPage);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [persistInUrl, getInitialValuesFromUrl, page, perPage]);

  return {
    paginationState,
    paginationActions,
    paginationProps,
    getOffset,
    getLimit,
  };
}

export default useContainerPagination;
