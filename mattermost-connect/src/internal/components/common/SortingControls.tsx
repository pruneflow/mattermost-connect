// src/internal/components/common/SortingControls.tsx
/**
 * Standardized sorting controls component
 */
import React from "react";
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
import { BaseComponentProps } from "../../types/componentTypes";

export type SortDirection = "asc" | "desc" | undefined;

export interface SortingControlsProps extends BaseComponentProps {
  /** Current sort field */
  sortField?: string;
  /** Current sort direction */
  sortDirection?: SortDirection;
  /** Available sort options */
  sortOptions: Array<{ field: string; label: string }>;
  /** Sort change callback */
  onSortChange: (field: string, direction?: SortDirection) => void;
  /** Sort field change callback */
  onSortFieldChange: (field: string) => void;
  /** Sort direction change callback */
  onSortDirectionChange: () => void;
  /** Whether sorting is disabled */
  disabled?: boolean;
}

/**
 * Standardized sorting controls component
 */
const SortingControls: React.FC<SortingControlsProps> = ({
  sortField,
  sortDirection,
  sortOptions,
  onSortChange,
  onSortFieldChange,
  onSortDirectionChange,
  disabled = false,
  className,
  sx,
  id,
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
    <Box
      className={className}
      sx={{ mb: 2, display: "flex", alignItems: "center", ...sx }}
      id={id}
    >
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

export default SortingControls;
