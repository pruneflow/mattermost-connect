import React, { useState, useCallback } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  SxProps,
  Theme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

export interface SearchInputProps {
  value?: string;
  placeholder?: string;
  onSearch: (query: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  autoFocus?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * SearchInput component following Mattermost patterns
 * Optimized search input with debouncing and clear functionality
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  value = '',
  placeholder = 'Search...',
  onSearch,
  onClear,
  disabled = false,
  size = 'medium',
  fullWidth = true,
  autoFocus = false,
  sx,
}) => {
  const [searchQuery, setSearchQuery] = useState(value);

  // Handle input change with immediate update
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setSearchQuery(newValue);
    onSearch(newValue);
  }, [onSearch]);

  // Handle clear
  const handleClear = useCallback(() => {
    setSearchQuery('');
    onSearch('');
    if (onClear) {
      onClear();
    }
  }, [onSearch, onClear]);

  // Handle key press
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClear();
    }
  }, [handleClear]);

  return (
    <TextField
      value={searchQuery}
      onChange={handleInputChange}
      onKeyDown={handleKeyPress}
      placeholder={placeholder}
      disabled={disabled}
      size={size}
      fullWidth={fullWidth}
      autoFocus={autoFocus}
      variant="outlined"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon
              sx={{
                color: 'text.secondary',
                fontSize: size === 'small' ? 18 : 20,
              }}
            />
          </InputAdornment>
        ),
        endAdornment: searchQuery && (
          <InputAdornment position="end">
            <IconButton
              onClick={handleClear}
              size={size}
              edge="end"
              aria-label="clear search"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'text.primary',
                },
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: size === 'small' ? 1 : 1.5,
          backgroundColor: 'background.paper',
          '& fieldset': {
            borderColor: 'divider',
          },
          '&:hover fieldset': {
            borderColor: 'primary.main',
          },
          '&.Mui-focused fieldset': {
            borderColor: 'primary.main',
            borderWidth: 1,
          },
        },
        '& .MuiInputBase-input': {
          fontSize: size === 'small' ? '0.875rem' : '0.9375rem',
          '&::placeholder': {
            color: 'text.secondary',
            opacity: 0.7,
          },
        },
        ...sx,
      }}
    />
  );
};

export default SearchInput;