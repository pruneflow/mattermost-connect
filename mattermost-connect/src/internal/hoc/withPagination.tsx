// src/internal/hoc/withPagination.tsx
/**
 * Pagination HOC
 * Wraps a component with pagination functionality
 * Provides a standardized way to handle pagination in list components
 */
import React, { ComponentType, useMemo } from "react";
import {
  useContainerPagination,
  PaginationOptions,
  UsePaginationResult,
} from "../hooks/useContainerPagination";
import {
  Pagination,
  Box,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";

/**
 * Default pagination component that displays pagination controls
 */
export const DefaultPaginationComponent: React.FC<{
  page: number;
  totalPages: number;
  perPage: number;
  perPageOptions: number[];
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  disabled?: boolean;
  showPerPageSelect?: boolean;
}> = ({
  page,
  totalPages,
  perPage,
  perPageOptions,
  onPageChange,
  onPerPageChange,
  disabled = false,
  showPerPageSelect = true,
}) => {
  if (totalPages <= 1 && !showPerPageSelect) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        py: 2,
        px: 1,
      }}
    >
      {/* Pagination controls */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          count={totalPages}
          disabled={disabled}
          color="primary"
          size="medium"
          showFirstButton
          showLastButton
          onChange={(_, value) => onPageChange(value)}
          sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}
        />
      )}

      {/* Items per page selector */}
      {showPerPageSelect && (
        <FormControl
          sx={{ minWidth: 120, ml: totalPages > 1 ? 2 : 0 }}
          size="small"
        >
          <InputLabel id="items-per-page-label">Per Page</InputLabel>
          <Select
            labelId="items-per-page-label"
            value={perPage}
            label="Per Page"
            disabled={disabled}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
          >
            {perPageOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  );
};

/**
 * Options for withPagination HOC
 */
export interface WithPaginationOptions extends PaginationOptions {
  /** Custom pagination component */
  PaginationComponent?: React.ComponentType<any>;
  /** Position of the pagination component (default: 'bottom') */
  position?: "top" | "bottom" | "both";
  /** Whether to show the per page selector (default: true) */
  showPerPageSelect?: boolean;
  /** Prop name to expose pagination state (default: 'paginationState') */
  paginationStatePropName?: string;
  /** Prop name to expose pagination actions (default: 'paginationActions') */
  paginationActionsPropName?: string;
  /** Prop name to expose pagination props (default: 'paginationProps') */
  paginationPropsPropName?: string;
  /** Whether to auto-paginate data (default: true) */
  autoPaginateData?: boolean;
  /** Function to get data to paginate (used when autoPaginateData is true) */
  getData?: (props: any) => any[];
  /** Prop name to receive paginated data (default: 'paginatedData') */
  paginatedDataPropName?: string;
}

/**
 * Props injected by the withPagination HOC
 */
export type WithPaginationInjectedProps = UsePaginationResult & {
  paginatedData?: any[];
};

/**
 * Props for the paginated component
 */
type PaginatedComponentProps<P> = Omit<P, keyof WithPaginationInjectedProps> &
  Partial<WithPaginationInjectedProps>;

/**
 * HOC that wraps a component with pagination functionality
 *
 * @param Component - Component to wrap with pagination
 * @param options - Pagination configuration options
 * @returns Wrapped component with pagination functionality
 *
 * @example
 * ```tsx
 * // Basic usage
 * const UserListWithPagination = withPagination(UserList, {
 *   initialPage: 1,
 *   initialPerPage: 20
 * });
 *
 * // Auto-paginate data
 * const UserListWithPagination = withPagination(UserList, {
 *   initialPage: 1,
 *   initialPerPage: 10,
 *   autoPaginateData: true,
 *   getData: (props) => props.users,
 *   paginatedDataPropName: 'paginatedUsers'
 * });
 *
 * // Custom pagination component
 * const CustomPagination = (props) => (
 *   <div>
 *     Page {props.page} of {props.totalPages}
 *     <button onClick={() => props.onPageChange(props.page - 1)}>Previous</button>
 *     <button onClick={() => props.onPageChange(props.page + 1)}>Next</button>
 *   </div>
 * );
 *
 * const UserListWithCustomPagination = withPagination(UserList, {
 *   PaginationComponent: CustomPagination,
 *   position: 'both'
 * });
 * ```
 */
export function withPagination<P extends object>(
  Component: ComponentType<P>,
  options: WithPaginationOptions = {},
): React.FC<PaginatedComponentProps<P>> {
  const {
    PaginationComponent = DefaultPaginationComponent,
    position = "bottom",
    showPerPageSelect = true,
    paginationStatePropName = "paginationState",
    paginationActionsPropName = "paginationActions",
    paginationPropsPropName = "paginationProps",
    autoPaginateData = true,
    getData,
    paginatedDataPropName = "paginatedData",
    ...paginationOptions
  } = options;

  const WithPagination: React.FC<PaginatedComponentProps<P>> = (props) => {
    // Use the pagination hook
    const {
      paginationState,
      paginationActions,
      paginationProps,
      getOffset,
      getLimit,
    } = useContainerPagination(paginationOptions);

    // Auto-paginate data if enabled and getData function is provided
    const paginatedData = useMemo(() => {
      if (!autoPaginateData || !getData) return undefined;

      const data = getData(props);
      if (!Array.isArray(data)) return data;

      const { page, perPage } = paginationState;
      const start = (page - 1) * perPage;
      const end = start + perPage;

      // Update total pages in pagination state if not already set
      if (paginationState.totalItems === undefined && data.length !== 0) {
        // This is just to inform the pagination controls, not to modify the state
        paginationProps.totalItems = data.length;
        paginationProps.totalPages = Math.ceil(data.length / perPage);
      }

      return data.slice(start, end);
    }, [props, autoPaginateData, getData, paginationState, paginationProps]);

    // Create the injected props
    const injectedProps = useMemo(() => {
      const result = {
        [paginationStatePropName]: paginationState,
        [paginationActionsPropName]: paginationActions,
        [paginationPropsPropName]: paginationProps,
        getOffset,
        getLimit,
      } as any;

      if (autoPaginateData && paginatedData !== undefined) {
        result[paginatedDataPropName] = paginatedData;
      }

      return result;
    }, [
      paginationState,
      paginationActions,
      paginationProps,
      getOffset,
      getLimit,
      autoPaginateData,
      paginatedData,
      paginationStatePropName,
      paginationActionsPropName,
      paginationPropsPropName,
      paginatedDataPropName,
    ]);

    // Don't render pagination if there's only one page and no per page selector
    const shouldRenderPagination =
      paginationState.totalPages > 1 || showPerPageSelect;

    return (
      <>
        {/* Top pagination */}
        {shouldRenderPagination &&
          (position === "top" || position === "both") && (
            <PaginationComponent
              page={paginationState.page}
              totalPages={paginationState.totalPages}
              perPage={paginationState.perPage}
              perPageOptions={
                paginationProps.perPageOptions || [10, 20, 50, 100]
              }
              onPageChange={paginationActions.setPage}
              onPerPageChange={paginationActions.setPerPage}
              disabled={!paginationState.enabled}
              showPerPageSelect={showPerPageSelect}
            />
          )}

        {/* Wrapped component with injected pagination props */}
        <Component {...(props as P)} {...injectedProps} />

        {/* Bottom pagination */}
        {shouldRenderPagination &&
          (position === "bottom" || position === "both") && (
            <PaginationComponent
              page={paginationState.page}
              totalPages={paginationState.totalPages}
              perPage={paginationState.perPage}
              perPageOptions={
                paginationProps.perPageOptions || [10, 20, 50, 100]
              }
              onPageChange={paginationActions.setPage}
              onPerPageChange={paginationActions.setPerPage}
              disabled={!paginationState.enabled}
              showPerPageSelect={showPerPageSelect}
            />
          )}
      </>
    );
  };

  // Set display name for debugging
  WithPagination.displayName = `WithPagination(${
    Component.displayName || Component.name || "Component"
  })`;

  return WithPagination;
}

export default withPagination;
