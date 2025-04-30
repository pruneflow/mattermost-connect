// src/internal/hoc/withSorting.tsx
/**
 * Sorting HOC
 * Wraps a component with sorting functionality
 * Provides a standardized way to handle sorting in list components
 */
import React, { ComponentType, useMemo } from "react";
import {
  useContainerSorting,
  SortingOptions,
  UseSortingResult,
  SortDirection,
} from "../hooks/useContainerSorting";
import {
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Stack,
  SelectChangeEvent,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

/**
 * Default sorting component that displays sort controls
 */
export const DefaultSortingComponent: React.FC<{
  sortField?: string;
  sortDirection?: SortDirection;
  sortOptions: Array<{ field: string; label: string }>;
  onSortChange: (field: string, direction?: SortDirection) => void;
  onSortFieldChange: (field: string) => void;
  onSortDirectionChange: () => void;
  disabled?: boolean;
}> = ({
  sortField,
  sortDirection,
  sortOptions,
  onSortChange,
  onSortFieldChange,
  onSortDirectionChange,
  disabled = false,
}) => {
  // If no sort options or just one, don't render
  if (!sortOptions.length || sortOptions.length === 1) {
    return null;
  }

  // Handle field change
  const handleFieldChange = (event: SelectChangeEvent<string>) => {
    const newField = event.target.value;
    onSortFieldChange(newField);
  };

  return (
    <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <FormControl size="small" disabled={disabled} sx={{ minWidth: 150 }}>
          <InputLabel id="sort-field-label">Sort by</InputLabel>
          <Select
            labelId="sort-field-label"
            id="sort-field-select"
            value={sortField || ""}
            label="Sort by"
            onChange={handleFieldChange}
          >
            {sortOptions.map((option) => (
              <MenuItem key={option.field} value={option.field}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {sortField && (
          <Tooltip
            title={`Sort ${sortDirection === "asc" ? "Descending" : "Ascending"}`}
          >
            <IconButton
              onClick={onSortDirectionChange}
              disabled={disabled}
              color="primary"
              size="small"
              sx={{ ml: 1 }}
            >
              {sortDirection === "asc" ? (
                <ArrowUpwardIcon fontSize="small" />
              ) : (
                <ArrowDownwardIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
};

/**
 * Options for withSorting HOC
 */
export interface WithSortingOptions<T = string, U = any>
  extends SortingOptions<T> {
  /** Custom sorting component */
  SortingComponent?: React.ComponentType<any>;
  /** Position of the sorting component (default: 'top') */
  position?: "top" | "bottom";
  /** Prop name to expose sorting state (default: 'sortingState') */
  sortingStatePropName?: string;
  /** Prop name to expose sorting actions (default: 'sortingActions') */
  sortingActionsPropName?: string;
  /** Prop name to expose sorting props (default: 'sortingProps') */
  sortingPropsPropName?: string;
  /** Whether to auto-sort data (default: true) */
  autoSortData?: boolean;
  /** Function to get data to sort (used when autoSortData is true) */
  getData?: (props: any) => U[];
  /** Prop name to receive sorted data (default: 'sortedData') */
  sortedDataPropName?: string;
  /** Field to label mapping for sort options */
  fieldLabels?: Record<string, string>;
}

/**
 * Props injected by the withSorting HOC
 */
export type WithSortingInjectedProps<T = string, U = any> = UseSortingResult<
  T,
  U
> & {
  sortedData?: U[];
};

/**
 * Props for the sortable component
 */
type SortableComponentProps<P, T = string, U = any> = Omit<
  P,
  keyof WithSortingInjectedProps<T, U>
> &
  Partial<WithSortingInjectedProps<T, U>>;

/**
 * HOC that wraps a component with sorting functionality
 *
 * @param Component - Component to wrap with sorting functionality
 * @param options - Sorting configuration options
 * @returns Wrapped component with sorting functionality
 *
 * @example
 * ```tsx
 * // Basic usage with string field names
 * const UserListWithSorting = withSorting(UserList, {
 *   initialSortField: "name",
 *   initialSortDirection: "asc",
 *   sortFields: ["name", "email", "createdAt"],
 *   fieldLabels: {
 *     name: "Name",
 *     email: "Email Address",
 *     createdAt: "Created Date"
 *   }
 * });
 *
 * // With auto-sorting data
 * const UserListWithSorting = withSorting(UserList, {
 *   initialSortField: "name",
 *   sortFields: ["name", "email", "createdAt"],
 *   autoSortData: true,
 *   getData: (props) => props.users,
 *   sortedDataPropName: 'sortedUsers'
 * });
 *
 * // With strongly typed field names (enum or union type)
 * enum UserSortField {
 *   Name = "name",
 *   Email = "email",
 *   CreatedAt = "createdAt"
 * }
 *
 * const UserListWithSorting = withSorting<Props, UserSortField>(UserList, {
 *   initialSortField: UserSortField.Name,
 *   sortFields: [UserSortField.Name, UserSortField.Email, UserSortField.CreatedAt]
 * });
 * ```
 */
export function withSorting<P extends object, T = string, U = any>(
  Component: ComponentType<P>,
  options: WithSortingOptions<T, U> = {},
): React.FC<SortableComponentProps<P, T, U>> {
  const {
    SortingComponent = DefaultSortingComponent,
    position = "top",
    sortingStatePropName = "sortingState",
    sortingActionsPropName = "sortingActions",
    sortingPropsPropName = "sortingProps",
    autoSortData = true,
    getData,
    sortedDataPropName = "sortedData",
    fieldLabels = {},
    ...sortingOptions
  } = options;

  const WithSorting: React.FC<SortableComponentProps<P, T, U>> = (props) => {
    // Use the sorting hook
    const {
      sortingState,
      sortingActions,
      sortingProps,
      sortItems,
      getSortParams,
    } = useContainerSorting<T, U>(sortingOptions);

    // Create sort options with labels from fieldLabels or sortFields
    const enhancedSortOptions = useMemo(() => {
      if (!sortingOptions.sortFields) return [];

      return sortingOptions.sortFields.map((field) => ({
        field: String(field),
        label: fieldLabels[String(field)] || String(field),
      }));
    }, [sortingOptions.sortFields, fieldLabels]);

    // Auto-sort data if enabled and getData function is provided
    const sortedData = useMemo(() => {
      if (!autoSortData || !getData) return undefined;

      const data = getData(props);
      if (!Array.isArray(data)) return data;

      return sortItems(data);
    }, [props, autoSortData, getData, sortItems]);

    // Create the injected props
    const injectedProps = useMemo(() => {
      const result = {
        [sortingStatePropName]: sortingState,
        [sortingActionsPropName]: sortingActions,
        [sortingPropsPropName]: sortingProps,
        sortItems,
        getSortParams,
      } as any;

      if (autoSortData && sortedData !== undefined) {
        result[sortedDataPropName] = sortedData;
      }

      return result;
    }, [
      sortingState,
      sortingActions,
      sortingProps,
      sortItems,
      getSortParams,
      autoSortData,
      sortedData,
      sortingStatePropName,
      sortingActionsPropName,
      sortingPropsPropName,
      sortedDataPropName,
    ]);

    // Check if we should render the sorting component
    const shouldRenderSorting = enhancedSortOptions.length > 1;

    return (
      <>
        {/* Top sorting controls */}
        {shouldRenderSorting && position === "top" && (
          <SortingComponent
            sortField={sortingProps.sortField}
            sortDirection={sortingProps.sortDirection}
            sortOptions={enhancedSortOptions}
            onSortChange={
              sortingProps.onSortChange || sortingActions.setSorting
            }
            onSortFieldChange={
              sortingProps.onSortFieldChange || sortingActions.changeSortField
            }
            onSortDirectionChange={
              sortingProps.onSortDirectionChange ||
              sortingActions.toggleSortDirection
            }
            disabled={sortingProps.disabled || !sortingState.enabled}
          />
        )}

        {/* Wrapped component with injected sorting props */}
        <Component {...(props as P)} {...injectedProps} />

        {/* Bottom sorting controls */}
        {shouldRenderSorting && position === "bottom" && (
          <SortingComponent
            sortField={sortingProps.sortField}
            sortDirection={sortingProps.sortDirection}
            sortOptions={enhancedSortOptions}
            onSortChange={
              sortingProps.onSortChange || sortingActions.setSorting
            }
            onSortFieldChange={
              sortingProps.onSortFieldChange || sortingActions.changeSortField
            }
            onSortDirectionChange={
              sortingProps.onSortDirectionChange ||
              sortingActions.toggleSortDirection
            }
            disabled={sortingProps.disabled || !sortingState.enabled}
          />
        )}
      </>
    );
  };

  // Set display name for debugging
  WithSorting.displayName = `WithSorting(${
    Component.displayName || Component.name || "Component"
  })`;

  return WithSorting;
}

export default withSorting;
