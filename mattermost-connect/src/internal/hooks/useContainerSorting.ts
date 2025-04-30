// src/internal/hooks/useContainerSorting.ts
/**
 * Container sorting hook
 * Provides standardized sorting functionality for container components
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import { SortingProps } from "../types/componentTypes";
import { useStableCallback } from "../utils/performanceUtils";
import { mapSortDirectionToUI } from "../utils";

/**
 * Sort direction type
 */
export type SortDirection = "asc" | "desc" | undefined;

/**
 * Sort field with direction
 */
export interface SortField<T = string> {
  /** Field to sort by */
  field: T;
  /** Sort direction */
  direction: SortDirection;
}

/**
 * Sorting configuration options
 */
export interface SortingOptions<T = string> {
  /** Initial sort field */
  initialSortField?: T;
  /** Initial sort direction */
  initialSortDirection?: SortDirection;
  /** Available sort fields */
  sortFields?: T[];
  /** Default sort field (used for reset) */
  defaultSortField?: T;
  /** Default sort direction (used for reset) */
  defaultSortDirection?: SortDirection;
  /** Whether to persist sorting in URL */
  persistInUrl?: boolean;
  /** URL parameter for sort field */
  sortFieldParam?: string;
  /** URL parameter for sort direction */
  sortDirectionParam?: string;
  /** Custom sort function */
  sortFn?: <U>(items: U[], field: T, direction: SortDirection) => U[];
  /** Whether sorting is enabled */
  enabled?: boolean;
  /** Callback when sort changes */
  onSortChange?: (field: T, direction: SortDirection) => void;
  /** Whether to allow multiple sort fields (future expansion, currently unused) */
  allowMultiSort?: boolean;
}

/**
 * Sorting state returned by the hook
 */
export interface SortingState<T = string> {
  /** Current sort field */
  sortField: T | null;
  /** Current sort direction */
  sortDirection: SortDirection;
  /** Whether sorting is enabled */
  enabled: boolean;
  /** Available sort fields */
  availableSortFields: T[];
}

/**
 * Sorting actions returned by the hook
 */
export interface SortingActions<T = string> {
  /** Set sort field and direction */
  setSorting: (field: T, direction?: SortDirection) => void;
  /** Toggle sort direction for the current field */
  toggleSortDirection: () => void;
  /** Change sort field */
  changeSortField: (field: T) => void;
  /** Reset sorting to defaults */
  resetSorting: () => void;
}

/**
 * Return type for the useContainerSorting hook
 */
export interface UseSortingResult<T = string, U = any> {
  /** Sorting state */
  sortingState: SortingState<T>;
  /** Sorting actions */
  sortingActions: SortingActions<T>;
  /** Standardized UI props for sorting components */
  sortingProps: SortingProps;
  /** Sort function to sort an array of items */
  sortItems: (items: U[]) => U[];
  /** Get sort parameters for API requests */
  getSortParams: () => { sortBy?: string; sortDirection?: string };
}

/**
 * Default sort function that can handle basic property sorting
 */
function defaultSortFn<T, U extends Record<string, any>>(
  items: U[],
  field: T,
  direction: SortDirection,
): U[] {
  if (!field || !direction) {
    return [...items];
  }

  const fieldName = String(field);
  const sortModifier = direction === "desc" ? -1 : 1;

  return [...items].sort((a, b) => {
    const aValue = a[fieldName];
    const bValue = b[fieldName];

    if (aValue === undefined || aValue === null) return sortModifier;
    if (bValue === undefined || bValue === null) return -sortModifier;

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortModifier * aValue.localeCompare(bValue);
    }

    if (aValue < bValue) return -sortModifier;
    if (aValue > bValue) return sortModifier;
    return 0;
  });
}

/**
 * Container sorting hook
 * Provides standardized sorting functionality for container components
 *
 * @param options - Sorting configuration options
 * @returns Sorting state, actions, and UI props
 *
 * @example
 * ```tsx
 * const { sortingProps, sortingState, sortItems } = useContainerSorting<'name' | 'createdAt' | 'status'>({
 *   initialSortField: 'createdAt',
 *   initialSortDirection: 'desc',
 *   sortFields: ['name', 'createdAt', 'status'],
 *   onSortChange: (field, direction) => {
 *     // Handle server-side sorting
 *     fetchData({ sort: field, direction });
 *   }
 * });
 *
 * // Sort items client-side
 * const sortedItems = sortItems(users);
 * ```
 */
export function useContainerSorting<T = string, U = any>(
  options: SortingOptions<T> = {},
): UseSortingResult<T, U> {
  const {
    initialSortField,
    initialSortDirection = "asc",
    sortFields = [] as T[],
    defaultSortField = initialSortField,
    defaultSortDirection = initialSortDirection,
    persistInUrl = false,
    sortFieldParam = "sort",
    sortDirectionParam = "order",
    sortFn,
    enabled = true,
    onSortChange,
    allowMultiSort = false,
  } = options;

  // Get initial values from URL if persistInUrl is enabled
  const getInitialValuesFromUrl = useCallback(() => {
    if (!persistInUrl) {
      return {
        field: initialSortField || null,
        direction: initialSortDirection,
      };
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const fieldFromUrl = urlParams.get(sortFieldParam);
      const directionFromUrl = urlParams.get(sortDirectionParam);

      // Validate field from URL is in sortFields
      const validField =
        fieldFromUrl &&
        (sortFields.length === 0 || sortFields.includes(fieldFromUrl as T))
          ? (fieldFromUrl as T)
          : initialSortField || null;

      // Validate direction
      const validDirection =
        directionFromUrl === "asc" || directionFromUrl === "desc"
          ? (directionFromUrl as SortDirection)
          : initialSortDirection;

      return { field: validField, direction: validDirection };
    } catch (error) {
      console.error("Error parsing sorting URL parameters:", error);
      return {
        field: initialSortField || null,
        direction: initialSortDirection,
      };
    }
  }, [
    initialSortField,
    initialSortDirection,
    persistInUrl,
    sortFieldParam,
    sortDirectionParam,
    sortFields,
  ]);

  // Initialize state from URL or initial values
  const initialValues = getInitialValuesFromUrl();
  const [sortField, setSortFieldInternal] = useState<T | null>(
    initialValues.field,
  );
  const [sortDirection, setSortDirectionInternal] = useState<SortDirection>(
    initialValues.direction,
  );

  // Update URL when sorting changes if persistInUrl is enabled
  const updateUrlParams = useCallback(
    (field: T | null, direction: SortDirection) => {
      if (!persistInUrl) return;

      try {
        const urlParams = new URLSearchParams(window.location.search);

        // Only set params that differ from defaults or are non-null
        if (
          field &&
          (field !== defaultSortField || defaultSortField === undefined)
        ) {
          urlParams.set(sortFieldParam, String(field));
        } else {
          urlParams.delete(sortFieldParam);
        }

        if (direction !== defaultSortDirection) {
          urlParams.set(sortDirectionParam, direction || "");
        } else {
          urlParams.delete(sortDirectionParam);
        }

        // Update URL without reloading the page
        const newUrl =
          window.location.pathname +
          (urlParams.toString() ? `?${urlParams.toString()}` : "");
        window.history.replaceState({}, "", newUrl);
      } catch (error) {
        console.error("Error updating sorting URL parameters:", error);
      }
    },
    [
      persistInUrl,
      sortFieldParam,
      sortDirectionParam,
      defaultSortField,
      defaultSortDirection,
    ],
  );

  // Stable callback for sort changes
  const handleSortChange = useStableCallback(
    (field: T | null, direction: SortDirection) => {
      if (onSortChange && field) {
        onSortChange(field, direction);
      }

      // Update URL if persistInUrl is enabled
      updateUrlParams(field, direction);
    },
    [onSortChange, updateUrlParams],
  );

  // Set sort field and direction
  const setSorting = useCallback(
    (field: T, direction?: SortDirection) => {
      if (!enabled) return;

      // If direction is not specified, use ascending or toggle if the field is already selected
      const newDirection =
        direction ||
        (field === sortField && sortDirection === "asc" ? "desc" : "asc");

      setSortFieldInternal(field);
      setSortDirectionInternal(newDirection);
      handleSortChange(field, newDirection);
    },
    [enabled, sortField, sortDirection, handleSortChange],
  );

  // Toggle sort direction for the current field
  const toggleSortDirection = useCallback(() => {
    if (!enabled || !sortField) return;

    const newDirection = sortDirection === "asc" ? "desc" : "asc";
    setSortDirectionInternal(newDirection);
    handleSortChange(sortField, newDirection);
  }, [enabled, sortField, sortDirection, handleSortChange]);

  // Change sort field (maintains direction if changing fields)
  const changeSortField = useCallback(
    (field: T) => {
      if (!enabled) return;

      // Keep current direction or use default for new field
      setSortFieldInternal(field);
      handleSortChange(field, sortDirection);
    },
    [enabled, sortDirection, handleSortChange],
  );

  // Reset sorting to defaults
  const resetSorting = useCallback(() => {
    setSortFieldInternal(defaultSortField || null);
    setSortDirectionInternal(defaultSortDirection);
    handleSortChange(defaultSortField || null, defaultSortDirection);
  }, [defaultSortField, defaultSortDirection, handleSortChange]);

  // Create sorting state
  const sortingState: SortingState<T> = useMemo(
    () => ({
      sortField,
      sortDirection,
      enabled,
      availableSortFields: sortFields,
    }),
    [sortField, sortDirection, enabled, sortFields],
  );

  // Create sorting actions
  const sortingActions: SortingActions<T> = useMemo(
    () => ({
      setSorting,
      toggleSortDirection,
      changeSortField,
      resetSorting,
    }),
    [setSorting, toggleSortDirection, changeSortField, resetSorting],
  );

  // Create standardized UI props for sorting components
  const sortingProps: SortingProps = useMemo(
    () => ({
      sortField: sortField !== null ? String(sortField) : undefined,
      sortDirection: mapSortDirectionToUI(sortDirection),
      sortOptions: sortFields.map((field) => ({
        field: String(field),
        label: String(field),
      })),
      onSortChange: (field: string, direction?: "asc" | "desc") =>
        setSorting(field as T, direction || undefined),
      onSortFieldChange: (field: string) => changeSortField(field as T),
      onSortDirectionChange: () => toggleSortDirection(),
      disabled: !enabled,
    }),
    [
      sortField,
      sortDirection,
      sortFields,
      setSorting,
      changeSortField,
      toggleSortDirection,
      enabled,
    ],
  );

  // Define sort function to sort items
  const sortItems = useCallback(
    (items: U[]) => {
      if (!enabled || !sortField || !sortDirection) {
        return [...items];
      }

      if (sortFn) {
        return sortFn(items, sortField, sortDirection);
      }

      // Assert that U extends Record<string, any> for the defaultSortFn
      return defaultSortFn<T, Record<string, any>>(
        items as unknown as Record<string, any>[],
        sortField,
        sortDirection,
      ) as unknown as U[];
    },
    [enabled, sortField, sortDirection, sortFn],
  );

  // Get sort parameters for API requests
  const getSortParams = useCallback(() => {
    if (!enabled || !sortField || !sortDirection) {
      return {};
    }

    return {
      sortBy: String(sortField),
      sortDirection,
    };
  }, [enabled, sortField, sortDirection]);

  // Update when URL changes (if using URL persistence)
  useEffect(() => {
    if (!persistInUrl) return;

    const handlePopState = () => {
      const { field, direction } = getInitialValuesFromUrl();
      if (field !== sortField) {
        setSortFieldInternal(field);
      }
      if (direction !== sortDirection) {
        setSortDirectionInternal(direction);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [persistInUrl, getInitialValuesFromUrl, sortField, sortDirection]);

  return {
    sortingState,
    sortingActions,
    sortingProps,
    sortItems,
    getSortParams,
  };
}

export default useContainerSorting;
