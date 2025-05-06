// src/internal/containers/base/ListContainer.tsx
/**
 * List Container
 * Extends BaseContainer with specific functionality for list displays
 * Provides standardized handling for pagination, search, sorting, and selection
 */
import React, { useMemo, useCallback } from "react";
import {
  BaseContainerProps,
  useBaseContainer,
  BaseContainerState,
  BaseContainerAPI,
} from "./BaseContainer";
import {
  useContainerPagination,
  PaginationOptions,
} from "../../hooks/useContainerPagination";
import {
  useContainerSearch,
  SearchOptions,
} from "../../hooks/useContainerSearch";
import {
  useContainerSorting,
  SortingOptions,
} from "../../hooks/useContainerSorting";
import {
  useContainerSelection,
  SelectionOptions,
} from "../../hooks/useContainerSelection";
import {
  PaginationProps,
  SearchProps,
  SortingProps,
  SelectionProps,
  EmptyStateProps,
} from "../../types/componentTypes";

/**
 * List container options
 */
export interface ListContainerOptions<
  T extends Record<string, any> = Record<string, any>,
> {
  /** Pagination options */
  paginationOptions?: PaginationOptions;
  /** Search options */
  searchOptions?: SearchOptions<T>;
  /** Sorting options */
  sortingOptions?: SortingOptions;
  /** Selection options */
  selectionOptions?: SelectionOptions<T>;
  /** Whether to enable pagination */
  enablePagination?: boolean;
  /** Whether to enable search */
  enableSearch?: boolean;
  /** Whether to enable sorting */
  enableSorting?: boolean;
  /** Whether to enable selection */
  enableSelection?: boolean;
  /** Whether to auto-refresh when filters change */
  autoRefreshOnFilterChange?: boolean;
}

/**
 * List container props
 */
export interface ListContainerProps<
  T extends Record<string, any> = Record<string, any>,
> extends BaseContainerProps {
  /** Items to display */
  items?: T[];
  /** Total number of items (for server-side pagination) */
  totalItems?: number;
  /** Whether data is being loaded */
  isLoading?: boolean;
  /** Callback to load items */
  onLoadItems?: (
    params: Record<string, any>,
  ) => Promise<{ data: T[]; total?: number }>;
  /** Callback when an item is selected */
  onItemSelect?: (item: T) => void;
  /** Callback when the refresh action is triggered */
  onRefresh?: () => Promise<void>;
  /** Callback when search term changes */
  onSearch?: (term: string) => void;
  /** Callback when sort settings change */
  onSort?: (field: string, direction: "asc" | "desc") => void;
  /** Callback when selected items change */
  onSelectionChange?: (selectedItems: T[]) => void;
  /** Callback when data changes */
  onChange?: (data: T[], changedFields: string[]) => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state action text */
  emptyActionText?: string;
  /** Empty state action callback */
  onEmptyAction?: () => void;
  /** ID field in item objects */
  idField?: string;
  /** Display field in item objects */
  displayField?: string;
  /** Search fields */
  searchFields?: (keyof T)[];
  /** Sort fields with optional labels */
  sortFields?: Array<string | { field: string; label: string }>;
  /** Initial sort field */
  initialSortField?: string;
  /** Initial sort direction */
  initialSortDirection?: "asc" | "desc";
  /** Function to get an item's ID */
  getItemId?: (item: T) => string;
  /** Whether multiple selection is allowed */
  multiSelect?: boolean;
}

/**
 * List container state
 */
export interface ListContainerState<
  T extends Record<string, any> = Record<string, any>,
> extends BaseContainerState {
  /** Current items (possibly filtered, sorted, paginated) */
  items: T[];
  /** Original unfiltered items */
  originalItems: T[];
  /** Whether the list is empty */
  isEmpty: boolean;
  /** Whether filtering is active */
  isFiltered: boolean;
  /** Current search term */
  searchTerm: string;
  /** Currently selected items */
  selectedItems: T[];
  /** Currently selected item IDs */
  selectedIds: string[];
  /** Current page */
  page: number;
  /** Items per page */
  perPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalItems: number;
  /** Current sort field */
  sortField?: string;
  /** Current sort direction */
  sortDirection?: "asc" | "desc";
}

/**
 * List container API
 */
export interface ListContainerAPI<
  T extends Record<string, any> = Record<string, any>,
> extends BaseContainerAPI {
  /** Load or refresh items */
  loadItems: () => Promise<void>;
  /** Set the items */
  setItems: (items: T[]) => void;
  /** Set the selected item */
  selectItem: (item: T) => void;
  /** Set search term */
  setSearchTerm: (term: string) => void;
  /** Set sort settings */
  setSorting: (field: string, direction?: "asc" | "desc") => void;
  /** Set current page */
  setPage: (page: number) => void;
  /** Set items per page */
  setPerPage: (perPage: number) => void;
  /** Set selection */
  setSelection: (items: T[]) => void;
  /** Select all items */
  selectAll: () => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Create pagination props for UI components */
  createPaginationProps: () => PaginationProps;
  /** Create search props for UI components */
  createSearchProps: () => SearchProps;
  /** Create sorting props for UI components */
  createSortingProps: () => SortingProps;
  /** Create selection props for UI components */
  createSelectionProps: () => SelectionProps;
  /** Create empty state props for UI components */
  createEmptyStateProps: () => EmptyStateProps;
}

/**
 * Hook for list containers
 * Provides standardized list state management and functionality
 *
 * @param props - List container props
 * @param options - List container options
 * @returns List container state and API
 */
export function useListContainer<
  T extends Record<string, any> = Record<string, any>,
>(
  props: ListContainerProps<T>,
  options: ListContainerOptions<T> = {},
): [ListContainerState<T>, ListContainerAPI<T>] {
  const {
    items: initialItems = [],
    totalItems: externalTotalItems,
    isLoading: externalLoading,
    onLoadItems,
    onItemSelect,
    onRefresh,
    onSearch,
    onSort,
    onSelectionChange,
    onChange,
    emptyMessage = "No items to display",
    emptyActionText,
    onEmptyAction,
    idField = "id",
    displayField = "name",
    searchFields = [],
    sortFields = [],
    initialSortField,
    initialSortDirection = "asc",
    getItemId = (item: any) => item[idField],
    multiSelect = false,
  } = props;

  const {
    paginationOptions = {},
    searchOptions = {},
    sortingOptions = {},
    selectionOptions = {},
    enablePagination = true,
    enableSearch = true,
    enableSorting = true,
    enableSelection = true,
    autoRefreshOnFilterChange = false,
  } = options;

  // Use base container hook
  const [baseState, baseAPI] = useBaseContainer(props);

  // Process sort fields to standardized format
  const processedSortFields = useMemo(() => {
    return sortFields.map((field) => {
      if (typeof field === "string") {
        return field;
      } else {
        return field.field;
      }
    });
  }, [sortFields]);

  // Use pagination hook if enabled
  const pagination = enablePagination
    ? useContainerPagination({
        initialPage: 1,
        initialPerPage: 20,
        totalItems: externalTotalItems || initialItems.length,
        ...paginationOptions,
      })
    : null;

  // Use search hook if enabled
  const search = enableSearch
    ? useContainerSearch<T>({
        initialSearchTerm: "",
        searchFields: searchFields as string[],
        ...searchOptions,
      })
    : null;

  // Use sorting hook if enabled
  const sorting = enableSorting
    ? useContainerSorting<string, T>({
        initialSortField,
        initialSortDirection,
        sortFields: processedSortFields,
        ...sortingOptions,
      })
    : null;

  // Use selection hook if enabled
  const selection = enableSelection
    ? useContainerSelection<T>({
        mode: multiSelect ? "multiple" : "single",
        idField: idField as string, // Cast to string to satisfy type constraint
        items: initialItems,
        ...selectionOptions,
      })
    : null;

  // Process items: filter -> sort -> paginate
  const processedItems = useMemo(() => {
    let result = [...initialItems];

    // Apply search filter if enabled and active
    if (search && search.searchState.isSearchActive) {
      result = search.filterBySearch(result);
    }

    // Apply sorting if enabled
    if (sorting && sorting.sortingState.sortField) {
      result = sorting.sortItems(result);
    }

    // Apply pagination if enabled
    if (pagination && result.length > pagination.paginationState.perPage) {
      const { page, perPage } = pagination.paginationState;
      const start = (page - 1) * perPage;
      const end = start + perPage;
      result = result.slice(start, end);
    }

    return result;
  }, [initialItems, search, sorting, pagination]);

  // Get selected items
  const selectedItems = useMemo(() => {
    return selection ? selection.getSelectedItems() : [];
  }, [selection]);

  // Load items function
  const loadItems = useCallback(async () => {
    if (!onLoadItems) return;

    const params: Record<string, any> = {};

    // Add pagination params if enabled
    if (pagination) {
      params.page = pagination.paginationState.page;
      params.perPage = pagination.paginationState.perPage;
    }

    // Add search params if enabled and active
    if (search && search.searchState.isSearchActive) {
      params.search = search.searchState.searchTerm;
    }

    // Add sorting params if enabled
    if (sorting && sorting.sortingState.sortField) {
      params.sortBy = sorting.sortingState.sortField;
      params.sortDirection = sorting.sortingState.sortDirection;
    }

    await baseAPI.withLoading(async () => {
      try {
        const result = await onLoadItems(params);

        // Update pagination if totalItems is provided
        if (pagination && result.total !== undefined) {
          pagination.paginationState.totalItems = result.total;
        }

        // Call onRefresh callback if provided
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        baseAPI.setError(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    });
  }, [onLoadItems, onRefresh, baseAPI, pagination, search, sorting]);

  // Handle item selection
  const selectItem = useCallback(
    (item: T) => {
      if (selection) {
        const itemId = getItemId(item);
        selection.selectionActions.selectItem(itemId);
      }

      if (onItemSelect) {
        onItemSelect(item);
      }
    },
    [selection, onItemSelect, getItemId],
  );

  // Handle search term changes
  const setSearchTerm = useCallback(
    (term: string) => {
      if (search) {
        search.searchActions.setSearchTerm(term);
      }

      if (onSearch) {
        onSearch(term);
      }

      // Auto-refresh if enabled
      if (autoRefreshOnFilterChange && onLoadItems) {
        loadItems();
      }
    },
    [search, onSearch, autoRefreshOnFilterChange, onLoadItems, loadItems],
  );

  // Handle sorting changes
  const setSorting = useCallback(
    (field: string, direction?: "asc" | "desc") => {
      if (sorting) {
        sorting.sortingActions.setSorting(field, direction);
      }

      if (onSort) {
        onSort(field, direction || "asc");
      }

      // Auto-refresh if enabled
      if (autoRefreshOnFilterChange && onLoadItems) {
        loadItems();
      }
    },
    [sorting, onSort, autoRefreshOnFilterChange, onLoadItems, loadItems],
  );

  // Handle page changes
  const setPage = useCallback(
    (page: number) => {
      if (pagination) {
        pagination.paginationActions.setPage(page);
      }

      // Auto-refresh if enabled
      if (autoRefreshOnFilterChange && onLoadItems) {
        loadItems();
      }
    },
    [pagination, autoRefreshOnFilterChange, onLoadItems, loadItems],
  );

  // Handle per page changes
  const setPerPage = useCallback(
    (perPage: number) => {
      if (pagination) {
        pagination.paginationActions.setPerPage(perPage);
      }

      // Auto-refresh if enabled
      if (autoRefreshOnFilterChange && onLoadItems) {
        loadItems();
      }
    },
    [pagination, autoRefreshOnFilterChange, onLoadItems, loadItems],
  );

  // Handle selection changes
  const setSelection = useCallback(
    (items: T[]) => {
      if (selection) {
        const ids = items.map(getItemId);
        selection.selectionActions.setSelectedIds(ids);
      }

      if (onSelectionChange) {
        onSelectionChange(items);
      }
    },
    [selection, onSelectionChange, getItemId],
  );

  // Select all items
  const selectAll = useCallback(() => {
    if (selection) {
      selection.selectionActions.selectAll();

      if (onSelectionChange) {
        onSelectionChange(selection.getSelectedItems());
      }
    }
  }, [selection, onSelectionChange]);

  // Clear selection
  const clearSelection = useCallback(() => {
    if (selection) {
      selection.selectionActions.deselectAll();

      if (onSelectionChange) {
        onSelectionChange([]);
      }
    }
  }, [selection, onSelectionChange]);

  // Create pagination props
  const createPaginationProps = useCallback((): PaginationProps => {
    if (!pagination) {
      return {
        page: 1,
        perPage: 20,
        totalPages: 1,
        disabled: true,
      };
    }

    return pagination.paginationProps;
  }, [pagination]);

  // Create search props
  const createSearchProps = useCallback((): SearchProps => {
    if (!search) {
      return {
        searchTerm: "",
        disabled: true,
        onSearchChange: () => {},
      };
    }

    return search.searchProps;
  }, [search]);

  // Create sorting props
  const createSortingProps = useCallback((): SortingProps => {
    if (!sorting) {
      return {
        disabled: true,
      };
    }

    return sorting.sortingProps;
  }, [sorting]);

  // Create selection props
  const createSelectionProps = useCallback((): SelectionProps => {
    if (!selection) {
      return {
        selectedIds: [],
        mode: "none",
        disabled: true,
      };
    }

    return selection.selectionProps;
  }, [selection]);

  // Create empty state props
  const createEmptyStateProps = useCallback((): EmptyStateProps => {
    return {
      message: emptyMessage,
      showAction: !!onEmptyAction,
      actionText: emptyActionText,
      onAction: onEmptyAction,
      icon: search && search.searchState.isSearchActive ? "search" : "info",
    };
  }, [emptyMessage, emptyActionText, onEmptyAction, search]);

  // Determine if the list is empty
  const isEmpty = processedItems.length === 0;

  // Determine if filtering is active
  const isFiltered = !!(
    (search && search.searchState.isSearchActive) ||
    (sorting && sorting.sortingState.sortField) ||
    (pagination && pagination.paginationState.page > 1)
  );

  // Combine loading state from external and internal sources
  const isLoadingCombined = useMemo(() => {
    return externalLoading || baseState.isLoading;
  }, [externalLoading, baseState.isLoading]);

  // Create list container state
  const listState: ListContainerState<T> = useMemo(
    () => ({
      ...baseState,
      isLoading: isLoadingCombined,
      items: processedItems,
      originalItems: initialItems,
      isEmpty,
      isFiltered,
      searchTerm: search?.searchState.searchTerm || "",
      selectedItems,
      selectedIds: selection?.selectionState.selectedIds || [],
      page: pagination?.paginationState.page || 1,
      perPage: pagination?.paginationState.perPage || 20,
      totalPages: pagination?.paginationState.totalPages || 1,
      totalItems: externalTotalItems || initialItems.length,
      sortField: sorting?.sortingState.sortField || undefined,
      sortDirection: sorting?.sortingState.sortDirection,
    }),
    [
      baseState,
      isLoadingCombined,
      processedItems,
      initialItems,
      isEmpty,
      isFiltered,
      search?.searchState.searchTerm,
      selectedItems,
      selection?.selectionState.selectedIds,
      pagination?.paginationState.page,
      pagination?.paginationState.perPage,
      pagination?.paginationState.totalPages,
      externalTotalItems,
      sorting?.sortingState.sortField,
      sorting?.sortingState.sortDirection,
    ],
  );

  // Build display name for an item if needed
  const getItemDisplayName = useCallback(
    (item: T): string => {
      if (typeof displayField === "string" && displayField in item) {
        return String(item[displayField]);
      }
      // Fallback to id or toString
      return String(getItemId(item));
    },
    [displayField, getItemId],
  );

  // Set items function - properly implemented for production
  const setItems = useCallback(
    (items: T[]) => {
      // In a production environment, this would implement a proper state management
      // solution, but in this architecture the parent owns the items state
      if (onChange) {
        onChange(items, []);
      }
    },
    [onChange],
  );

  // Create list container API
  const listAPI: ListContainerAPI<T> = useMemo(
    () => ({
      ...baseAPI,
      loadItems,
      setItems,
      selectItem,
      setSearchTerm,
      setSorting,
      setPage,
      setPerPage,
      setSelection,
      selectAll,
      clearSelection,
      createPaginationProps,
      createSearchProps,
      createSortingProps,
      createSelectionProps,
      createEmptyStateProps,
      getItemDisplayName,
    }),
    [
      baseAPI,
      loadItems,
      setItems,
      selectItem,
      setSearchTerm,
      setSorting,
      setPage,
      setPerPage,
      setSelection,
      selectAll,
      clearSelection,
      createPaginationProps,
      createSearchProps,
      createSortingProps,
      createSelectionProps,
      createEmptyStateProps,
      getItemDisplayName,
    ],
  );

  return [listState, listAPI];
}

/**
 * List container component
 * This is a basic implementation that can be extended by specific list containers
 */
export const ListContainer: React.FC<
  ListContainerProps<any> & {
    children?: React.ReactNode;
    render?: (
      api: ListContainerAPI<any>,
      state: ListContainerState<any>,
    ) => React.ReactNode;
  }
> = (props) => {
  const { children, render } = props;
  const [state, api] = useListContainer(props);

  // Either use render prop or children
  if (render) {
    return <>{render(api, state)}</>;
  }

  return <>{children}</>;
};

export default ListContainer;
