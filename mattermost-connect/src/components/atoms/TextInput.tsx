/**
 * Enhanced text input component with consistent styling
 * Extends Material-UI TextField with custom variants and responsive sizing
 */
import React, { useMemo } from 'react';
import { TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';

// Static styles extracted for performance
const STATIC_STYLES = {
  base: {
    mb: 2,
    '& .MuiOutlinedInput-root': {
      borderRadius: 1,
    },
    '& .MuiInputLabel-root': {
      fontWeight: 500,
    },
  } as const,
};

// Configuration maps
const VARIANT_MAP = {
  default: 'outlined' as const,
  filled: 'filled' as const,
};

const SIZE_MAP = {
  sm: 'small' as const,
  md: 'medium' as const,
  lg: 'medium' as const, // Material-UI doesn't have 'large' for TextField
};

export interface TextInputProps extends Omit<TextFieldProps, 'variant' | 'size'> {
  variant?: 'default' | 'filled';
  size?: 'sm' | 'md' | 'lg';
}

const TextInput: React.FC<TextInputProps> = ({
  variant = 'default',
  size = 'md',
  sx,
  ...props
}) => {
  // Memoized props and styles
  const textFieldProps = useMemo(() => ({
    variant: VARIANT_MAP[variant],
    size: SIZE_MAP[size],
    sx: {
      ...STATIC_STYLES.base,
      ...sx,
    },
  }), [variant, size, sx]);

  return (
    <TextField
      {...textFieldProps}
      {...props}
    />
  );
};

export default TextInput;