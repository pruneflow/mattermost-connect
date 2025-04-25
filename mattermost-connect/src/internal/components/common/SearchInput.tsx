// src/internal/components/common/SearchInput.tsx
/**
 * A reusable search input component with debounce functionality
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  IconButton,
  InputBase,
  InputAdornment,
  Tooltip,
  SxProps,
  Theme,
} from "@mui/material";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface SearchInputProps extends BaseComponentProps {
  /** Current search value */
  value: string;
  /** Callback when search value changes */
  onSearch: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show the filter button */
  showFilter?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Callback when filter button is clicked */
  onFilterClick?: () => void;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Whether the input is full width */
  fullWidth?: boolean;
  /** Size of the input */
  size?: "small" | "medium";
}

/**
 * Search input component with debounce functionality
 */
const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onSearch,
  placeholder = "Search...",
  showFilter = false,
  disabled = false,
  onFilterClick,
  debounceMs = 300,
  fullWidth = false,
  size = "medium",
  className,
  sx,
  id,
}) => {
  // Local state for input value
  const [inputValue, setInputValue] = useState(value);

  // Ref for debounce timer
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle input change with debounce
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      // Clear previous timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Set new timer
      debounceTimer.current = setTimeout(() => {
        onSearch(newValue);
      }, debounceMs);
    },
    [onSearch, debounceMs],
  );

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Clear search
  const handleClear = useCallback(() => {
    setInputValue("");
    onSearch("");
  }, [onSearch]);

  return (
    <InputBase
      value={inputValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      fullWidth={fullWidth}
      className={className}
      id={id}
      startAdornment={
        <InputAdornment position="start">
          <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
        </InputAdornment>
      }
      endAdornment={
        <Box display="flex" alignItems="center">
          {inputValue && (
            <Tooltip title="Clear search">
              <IconButton
                size="small"
                onClick={handleClear}
                sx={{ p: 0.5 }}
                disabled={disabled}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {showFilter && (
            <Tooltip title="Filter">
              <IconButton
                size="small"
                onClick={onFilterClick}
                sx={{ ml: 0.5, p: 0.5 }}
                disabled={disabled}
              >
                <FilterIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      }
      sx={{
        px: 1.5,
        py: 0.75,
        bgcolor: "action.hover",
        borderRadius: 2,
        transition: (theme) =>
          theme.transitions.create(["background-color", "box-shadow"]),
        "&:hover": {
          bgcolor: "action.selected",
        },
        "&.Mui-focused": {
          bgcolor: "background.paper",
          boxShadow: (theme) => theme.shadows[1],
        },
        ...(size === "small" && {
          py: 0.5,
        }),
        ...sx,
      }}
    />
  );
};

export default SearchInput;
