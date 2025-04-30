// src/internal/hooks/useContainerSearch.ts
/**
 * Container search hook
 * Provides standardized search functionality for container components
 */
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { SearchProps } from "../types/componentTypes";
import {
  useDebouncedCallback,
  useStableCallback,
  createSearchFilter,
} from "../utils";

/**
 * Search configuration options
 */
export interface SearchOptions<
  T extends Record<string, any> = Record<string, any>,
> {
  /** Initial search term */
  initialSearchTerm?: string;
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Minimum characters before search is triggered (default: 2) */
  minSearchLength?: number;
  /** Fields to search in (for client-side filtering) */
  searchFields?: (keyof T)[];
  /** Custom filter function */
  filterFn?: (item: T, searchTerm: string) => boolean;
  /** Whether to persist search in URL (default: false) */
  persistInUrl?: boolean;
  /** URL parameter name (default: 'search') */
  searchParam?: string;
  /** Whether search is enabled (default: true) */
  enabled?: boolean;
  /** Whether search is case sensitive (default: false) */
  caseSensitive?: boolean;
  /** Callback when search term changes */
  onSearchChange?: (searchTerm: string) => void;
  /** Optional search mode */
  searchMode?: "contains" | "startsWith" | "exact";
}

/**
 * Search state returned by the hook
 */
export interface SearchState {
  /** Current search term */
  searchTerm: string;
  /** Whether search is active (has content and meets minimum length) */
  isSearchActive: boolean;
  /** Whether search is currently being processed (during debounce) */
  isSearching: boolean;
  /** Processed search term (after debounce) */
  debouncedSearchTerm: string;
  /** Minimum characters required for search */
  minSearchLength: number;
  /** Whether search is enabled */
  enabled: boolean;
}

/**
 * Search actions returned by the hook
 */
export interface SearchActions {
  /** Set search term */
  setSearchTerm: (term: string) => void;
  /** Clear search */
  clearSearch: () => void;
}

/**
 * Return type for the useContainerSearch hook
 */
export interface UseSearchResult<
  T extends Record<string, any> = Record<string, any>,
> {
  /** Search state */
  searchState: SearchState;
  /** Search actions */
  searchActions: SearchActions;
  /** Standardized UI props for search components */
  searchProps: SearchProps;
  /** Filter function to filter items by the current search term */
  filterBySearch: (items: T[]) => T[];
  /** Check if an item matches the search term */
  matchesSearch: (item: T) => boolean;
}

/**
 * Container search hook
 * Provides standardized search functionality for container components
 *
 * @param options - Search configuration options
 * @returns Search state, actions, and UI props
 *
 * @example
 * ```tsx
 * const { searchProps, searchState, filterBySearch } = useContainerSearch<User>({
 *   initialSearchTerm: "",
 *   searchFields: ["name", "email", "username"],
 *   onSearchChange: (term) => {
 *     // Handle server-side search
 *     fetchData({ search: term });
 *   }
 * });
 *
 * // Filter items client-side
 * const filteredItems = filterBySearch(users);
 * ```
 */
export function useContainerSearch<
  T extends Record<string, any> = Record<string, any>,
>(options: SearchOptions<T> = {}): UseSearchResult<T> {
  const {
    initialSearchTerm = "",
    debounceMs = 300,
    minSearchLength = 2,
    searchFields,
    filterFn,
    persistInUrl = false,
    searchParam = "search",
    enabled = true,
    caseSensitive = false,
    onSearchChange,
    searchMode = "contains",
  } = options;

  // Track if this is the initial mount
  const isInitialMount = useRef(true);

  // Get initial search term from URL if persistInUrl is enabled
  const getInitialSearchTermFromUrl = useCallback(() => {
    if (!persistInUrl) {
      return initialSearchTerm;
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const searchFromUrl = urlParams.get(searchParam);
      return searchFromUrl || initialSearchTerm;
    } catch (error) {
      console.error("Error parsing search URL parameter:", error);
      return initialSearchTerm;
    }
  }, [initialSearchTerm, persistInUrl, searchParam]);

  // Internal state for search term (unprocessed)
  const [searchTerm, setSearchTermInternal] = useState<string>(() =>
    getInitialSearchTermFromUrl(),
  );

  // Processed search term (after debounce)
  const [debouncedSearchTerm, setDebouncedSearchTerm] =
    useState<string>(searchTerm);

  // Loading state during debounce
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Update URL when search term changes if persistInUrl is enabled
  const updateUrlParam = useCallback(
    (term: string) => {
      if (!persistInUrl) return;

      try {
        const urlParams = new URLSearchParams(window.location.search);

        if (term && term !== initialSearchTerm) {
          urlParams.set(searchParam, term);
        } else {
          urlParams.delete(searchParam);
        }

        // Update URL without reloading the page
        const newUrl =
          window.location.pathname +
          (urlParams.toString() ? `?${urlParams.toString()}` : "");
        window.history.replaceState({}, "", newUrl);
      } catch (error) {
        console.error("Error updating search URL parameter:", error);
      }
    },
    [persistInUrl, searchParam, initialSearchTerm],
  );

  // Stable callback for search term changes
  const handleSearchChange = useStableCallback(
    (term: string) => {
      if (
        onSearchChange &&
        (!minSearchLength ||
          term.length >= minSearchLength ||
          term.length === 0)
      ) {
        onSearchChange(term);
      }

      // Update URL if persistInUrl is enabled
      updateUrlParam(term);
    },
    [onSearchChange, minSearchLength, updateUrlParam],
  );

  // Debounced search handling
  const debouncedSetSearchTerm = useDebouncedCallback(
    (term: string) => {
      setDebouncedSearchTerm(term);
      setIsSearching(false);
      handleSearchChange(term);
    },
    debounceMs,
    [handleSearchChange],
  );

  // Set search term with debounce
  const setSearchTerm = useCallback(
    (term: string) => {
      setSearchTermInternal(term);
      setIsSearching(true);
      debouncedSetSearchTerm(term);
    },
    [debouncedSetSearchTerm],
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTerm("");
  }, [setSearchTerm]);

  // Create custom filter function
  const customFilterFn = useMemo(() => {
    if (filterFn) {
      return filterFn;
    }

    if (!searchFields || searchFields.length === 0) {
      return null;
    }

    return createSearchFilter<T>(searchFields as string[], {
      caseSensitive,
      mode: searchMode,
    });
  }, [filterFn, searchFields, caseSensitive, searchMode]);

  // Filter function to apply search to items
  const filterBySearch = useCallback(
    (items: T[]): T[] => {
      if (
        !enabled ||
        !debouncedSearchTerm ||
        debouncedSearchTerm.length < minSearchLength
      ) {
        return items;
      }

      if (!customFilterFn) {
        console.warn(
          "No filter function or search fields provided for search filtering",
        );
        return items;
      }

      return items.filter((item) => customFilterFn(item, debouncedSearchTerm));
    },
    [enabled, debouncedSearchTerm, minSearchLength, customFilterFn],
  );

  // Check if an item matches the search term
  const matchesSearch = useCallback(
    (item: T): boolean => {
      if (
        !enabled ||
        !debouncedSearchTerm ||
        debouncedSearchTerm.length < minSearchLength
      ) {
        return true;
      }

      if (!customFilterFn) {
        return true;
      }

      return customFilterFn(item, debouncedSearchTerm);
    },
    [enabled, debouncedSearchTerm, minSearchLength, customFilterFn],
  );

  // Determine if search is active
  const isSearchActive = useMemo(
    () =>
      enabled &&
      !!debouncedSearchTerm &&
      debouncedSearchTerm.length >= minSearchLength,
    [enabled, debouncedSearchTerm, minSearchLength],
  );

  // Create search state object
  const searchState: SearchState = useMemo(
    () => ({
      searchTerm,
      isSearchActive,
      isSearching,
      debouncedSearchTerm,
      minSearchLength,
      enabled,
    }),
    [
      searchTerm,
      isSearchActive,
      isSearching,
      debouncedSearchTerm,
      minSearchLength,
      enabled,
    ],
  );

  // Create search actions object
  const searchActions: SearchActions = useMemo(
    () => ({
      setSearchTerm,
      clearSearch,
    }),
    [setSearchTerm, clearSearch],
  );

  // Create standardized UI props for search components
  const searchProps: SearchProps = useMemo(
    () => ({
      searchTerm,
      searchPlaceholder: "Search...",
      disabled: !enabled,
      isSearching,
      minSearchLength,
      onSearchChange: setSearchTerm,
      onSearchClear: clearSearch,
    }),
    [
      searchTerm,
      setSearchTerm,
      clearSearch,
      enabled,
      isSearching,
      minSearchLength,
    ],
  );

  // Update when URL changes (if using URL persistence)
  useEffect(() => {
    if (!persistInUrl) return;

    const handlePopState = () => {
      const newSearchTerm = getInitialSearchTermFromUrl();
      if (newSearchTerm !== searchTerm) {
        setSearchTermInternal(newSearchTerm);
        setDebouncedSearchTerm(newSearchTerm);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [persistInUrl, getInitialSearchTermFromUrl, searchTerm]);

  // Call onSearchChange for initial term (if not empty and meets minimum length)
  useEffect(() => {
    if (
      isInitialMount.current &&
      searchTerm &&
      searchTerm.length >= minSearchLength &&
      onSearchChange
    ) {
      onSearchChange(searchTerm);
      isInitialMount.current = false;
    }
  }, [searchTerm, minSearchLength, onSearchChange]);

  return {
    searchState,
    searchActions,
    searchProps,
    filterBySearch,
    matchesSearch,
  };
}

export default useContainerSearch;
