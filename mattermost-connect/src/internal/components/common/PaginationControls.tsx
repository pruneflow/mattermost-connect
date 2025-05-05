// src/internal/components/common/PaginationControls.tsx
/**
 * Standardized pagination controls component
 */
import React from "react";
import {
  Pagination,
  Box,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface PaginationControlsProps extends BaseComponentProps {
  /** Current page number */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Items per page */
  perPage: number;
  /** Available page size options */
  perPageOptions: number[];
  /** Page change callback */
  onPageChange?: (page: number) => void;
  /** Per page change callback */
  onPerPageChange?: (perPage: number) => void;
  /** Whether pagination is disabled */
  disabled?: boolean;
  /** Whether to show the per page selector */
  showPerPageSelect?: boolean;
}

/**
 * Standardized pagination controls component
 */
const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  totalPages,
  perPage,
  perPageOptions,
  onPageChange,
  onPerPageChange,
  disabled = false,
  showPerPageSelect = true,
  className,
  sx,
  id,
}) => {
  if (totalPages <= 1 && !showPerPageSelect) return null;

  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        py: 2,
        px: 1,
        ...sx,
      }}
      id={id}
    >
      {/* Pagination controls */}
      {totalPages > 1 && onPageChange && (
        <Pagination
          page={page}
          count={totalPages}
          disabled={disabled}
          color="primary"
          size="medium"
          showFirstButton
          showLastButton
          onChange={(_, value) => onPageChange && onPageChange(value)}
          sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}
        />
      )}

      {/* Items per page selector */}
      {showPerPageSelect && onPerPageChange && (
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
            onChange={(e) =>
              onPerPageChange && onPerPageChange(Number(e.target.value))
            }
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

export default PaginationControls;
