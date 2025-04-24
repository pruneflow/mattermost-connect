// src/internal/components/common/SearchInput.tsx
/**
 * A reusable search input component
 */
import React, { useEffect, useState } from "react";
import { TextField, InputAdornment, IconButton, Fade } from "@mui/material";
import { Search as SearchIcon, Clear as ClearIcon } from "@mui/icons-material";
import { BaseComponentProps } from "../../types/componentTypes";
import { debounce } from "../../utils/helper";

export interface SearchInputProps extends BaseComponentProps {
  /** Placeholder text */
  placeholder?: string;
  /** Initial value */
  value?: string;
  /** Callback when search value changes */
  onSearch?: (value: string) => void;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the input is full width */
  fullWidth?: boolean;
  /** Input variant */
  variant?: "outlined" | "filled" | "standard";
  /** Size of the input */
  size?: "small" | "medium";
}

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = "Search",
  value: initialValue = "",
  onSearch,
  debounceMs = 300,
  disabled = false,
  fullWidth = false,
  variant = "outlined",
  size = "small",
  className,
  sx,
  id,
}) => {
  const [value, setValue] = useState(initialValue);

  // Debounced search callback
  const debouncedSearch = React.useMemo(
    () =>
      debounce((searchTerm: string) => {
        if (onSearch) {
          onSearch(searchTerm);
        }
      }, debounceMs),
    [onSearch, debounceMs],
  );

  // Handle external value changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Handle input change
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  };

  // Handle clear button click
  const handleClear = () => {
    setValue("");
    if (onSearch) {
      onSearch("");
    }
  };

  return (
    <TextField
      className={className}
      sx={sx}
      id={id}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <Fade in={!!value}>
              <IconButton
                size="small"
                aria-label="clear search"
                onClick={handleClear}
                edge="end"
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </Fade>
          </InputAdornment>
        ),
      }}
    />
  );
};

export default SearchInput;
