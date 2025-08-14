/**
 * Dropdown component with icon support and custom styling
 * Provides a reusable select component for form inputs
 */
import React from 'react';
import { FormControl, Select, MenuItem, Box, SelectChangeEvent } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

export interface DropdownOption {
  label: string;
  value: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  sx?: SxProps<Theme>;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  placeholder = 'Select...',
  onChange,
  disabled = false,
  className,
  sx
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  return (
    <FormControl 
      size="small" 
      className={className}
      sx={{ 
        minWidth: 120, 
        ...sx 
      }}
    >
      <Select
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        displayEmpty
        renderValue={(selected) => {
          if (!selected) {
            return placeholder;
          }
          const selectedOption = options.find(opt => opt.value === selected);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {selectedOption?.icon && (
                <Box sx={{ mr: 1, display: 'flex' }}>
                  {selectedOption.icon}
                </Box>
              )}
              {selectedOption?.label}
            </Box>
          );
        }}
        sx={{
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
          },
        }}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            sx={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {option.icon && (
              <Box sx={{ mr: 1, display: 'flex' }}>
                {option.icon}
              </Box>
            )}
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default Dropdown;