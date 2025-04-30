// src/internal/hoc/withSearch.tsx
/**
 * Search HOC
 * Wraps a component with search functionality
 * Provides a standardized way to handle search in list components
 */
import React, { ComponentType, useMemo } from "react";
import {
  useContainerSearch,
  SearchOptions,
  UseSearchResult,
} from "../hooks/useContainerSearch";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

/**
 * Default search component that displays a search input field
 */
export const DefaultSearchComponent: React.FC<{
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSearchClear: () => void;
  placeholder?: string;
  disabled?: boolean;
  isSearching?: boolean;
  minSearchLength?: number;
  variant?: "outlined" | "filled" | "standard";
  size?: "small" | "medium";
  fullWidth?: boolean;
}> = ({
  searchTerm,
  onSearchChange,
  onSearchClear,
  placeholder = "Search...",
  disabled = false,
  isSearching = false,
  minSearchLength = 2,
  variant = "outlined",
  size = "small",
  fullWidth = true,
}) => {
  return (
    <Box sx={{ mb: 2, width: fullWidth ? "100%" : "auto" }}>
      <TextField
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: searchTerm ? (
            <InputAdornment position="end">
              <Tooltip title="Clear search">
                <IconButton
                  size="small"
                  onClick={onSearchClear}
                  disabled={disabled || isSearching}
                  edge="end"
                  aria-label="clear search"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ) : null,
        }}
        helperText={
          minSearchLength > 1 &&
          searchTerm.length > 0 &&
          searchTerm.length < minSearchLength
            ? `Enter at least ${minSearchLength} characters to search`
            : undefined
        }
      />
    </Box>
  );
};

/**
 * Options for withSearch HOC
 */
export interface WithSearchOptions<T = any> extends SearchOptions<T> {
  /** Custom search component */
  SearchComponent?: React.ComponentType<any>;
  /** Position of the search component (default: 'top') */
  position?: "top" | "bottom";
  /** Prop name to expose search state (default: 'searchState') */
  searchStatePropName?: string;
  /** Prop name to expose search actions (default: 'searchActions') */
  searchActionsPropName?: string;
  /** Prop name to expose search props (default: 'searchProps') */
  searchPropsPropName?: string;
  /** Whether to auto-filter data (default: true) */
  autoFilterData?: boolean;
  /** Function to get data to filter (used when autoFilterData is true) */
  getData?: (props: any) => any[];
  /** Prop name to receive filtered data (default: 'filteredData') */
  filteredDataPropName?: string;
  /** Search input variant */
  searchInputVariant?: "outlined" | "filled" | "standard";
  /** Search input size */
  searchInputSize?: "small" | "medium";
  /** Whether the search input should take full width */
  searchInputFullWidth?: boolean;
}

/**
 * Props injected by the withSearch HOC
 */
export type WithSearchInjectedProps<T = any> = UseSearchResult<T> & {
  filteredData?: T[];
};

/**
 * Props for the searchable component
 */
type SearchableComponentProps<P, T = any> = Omit<
  P,
  keyof WithSearchInjectedProps<T>
> &
  Partial<WithSearchInjectedProps<T>>;

/**
 * HOC that wraps a component with search functionality
 *
 * @param Component - Component to wrap with search functionality
 * @param options - Search configuration options
 * @returns Wrapped component with search functionality
 *
 * @example
 * ```tsx
 * // Basic usage
 * const UserListWithSearch = withSearch(UserList, {
 *   searchFields: ["name", "email", "username"],
 *   minSearchLength: 2
 * });
 *
 * // Auto-filter data
 * const UserListWithSearch = withSearch(UserList, {
 *   searchFields: ["name", "email", "username"],
 *   autoFilterData: true,
 *   getData: (props) => props.users,
 *   filteredDataPropName: 'filteredUsers'
 * });
 *
 * // Custom search component
 * const CustomSearch = (props) => (
 *   <div>
 *     <input
 *       value={props.searchTerm}
 *       onChange={(e) => props.onSearchChange(e.target.value)}
 *       placeholder="Find users..."
 *     />
 *     {props.searchTerm && (
 *       <button onClick={props.onSearchClear}>Clear</button>
 *     )}
 *   </div>
 * );
 *
 * const UserListWithCustomSearch = withSearch(UserList, {
 *   SearchComponent: CustomSearch,
 *   searchFields: ["name", "email", "username"]
 * });
 * ```
 */
export function withSearch<P extends object, T = any>(
  Component: ComponentType<P>,
  options: WithSearchOptions<T> = {},
): React.FC<SearchableComponentProps<P, T>> {
  const {
    SearchComponent = DefaultSearchComponent,
    position = "top",
    searchStatePropName = "searchState",
    searchActionsPropName = "searchActions",
    searchPropsPropName = "searchProps",
    autoFilterData = true,
    getData,
    filteredDataPropName = "filteredData",
    searchInputVariant = "outlined",
    searchInputSize = "small",
    searchInputFullWidth = true,
    ...searchOptions
  } = options;

  const WithSearch: React.FC<SearchableComponentProps<P, T>> = (props) => {
    // Use the search hook
    const {
      searchState,
      searchActions,
      searchProps,
      filterBySearch,
      matchesSearch,
    } = useContainerSearch<T>(searchOptions);

    // Auto-filter data if enabled and getData function is provided
    const filteredData = useMemo(() => {
      if (!autoFilterData || !getData) return undefined;

      const data = getData(props);
      if (!Array.isArray(data)) return data;

      return filterBySearch(data);
    }, [props, autoFilterData, getData, filterBySearch]);

    // Create the injected props
    const injectedProps = useMemo(() => {
      const result = {
        [searchStatePropName]: searchState,
        [searchActionsPropName]: searchActions,
        [searchPropsPropName]: searchProps,
        filterBySearch,
        matchesSearch,
      } as any;

      if (autoFilterData && filteredData !== undefined) {
        result[filteredDataPropName] = filteredData;
      }

      return result;
    }, [
      searchState,
      searchActions,
      searchProps,
      filterBySearch,
      matchesSearch,
      autoFilterData,
      filteredData,
      searchStatePropName,
      searchActionsPropName,
      searchPropsPropName,
      filteredDataPropName,
    ]);

    return (
      <>
        {/* Search input */}
        {position === "top" && (
          <SearchComponent
            searchTerm={searchState.searchTerm}
            onSearchChange={searchActions.setSearchTerm}
            onSearchClear={searchActions.clearSearch}
            placeholder={searchProps.searchPlaceholder}
            disabled={!searchState.enabled}
            isSearching={searchState.isSearching}
            minSearchLength={searchState.minSearchLength}
            variant={searchInputVariant}
            size={searchInputSize}
            fullWidth={searchInputFullWidth}
          />
        )}

        {/* Wrapped component with injected search props */}
        <Component {...(props as P)} {...injectedProps} />

        {/* Bottom search input (if position is bottom) */}
        {position === "bottom" && (
          <SearchComponent
            searchTerm={searchState.searchTerm}
            onSearchChange={searchActions.setSearchTerm}
            onSearchClear={searchActions.clearSearch}
            placeholder={searchProps.searchPlaceholder}
            disabled={!searchState.enabled}
            isSearching={searchState.isSearching}
            minSearchLength={searchState.minSearchLength}
            variant={searchInputVariant}
            size={searchInputSize}
            fullWidth={searchInputFullWidth}
          />
        )}
      </>
    );
  };

  // Set display name for debugging
  WithSearch.displayName = `WithSearch(${
    Component.displayName || Component.name || "Component"
  })`;

  return WithSearch;
}

export default withSearch;
