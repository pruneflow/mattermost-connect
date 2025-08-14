import React, { useMemo } from 'react';
import { Button as MuiButton, CircularProgress } from '@mui/material';
import type { ButtonProps as MuiButtonProps } from '@mui/material';

// Static styles extracted for performance
const STATIC_STYLES = {
  base: {
    textTransform: 'none',
    borderRadius: 1.5,
    fontWeight: 500,
    // Mobile touch targets
    minHeight: { xs: 44, sm: 'auto' },
    px: { xs: 2, sm: 'auto' },
  } as const,
};

// Configuration maps
const VARIANT_MAP = {
  primary: 'contained' as const,
  danger: 'contained' as const,
  secondary: 'outlined' as const,
  ghost: 'text' as const,
};

const COLOR_MAP = {
  primary: 'primary' as const,
  danger: 'error' as const,
  secondary: 'inherit' as const,
  ghost: 'inherit' as const,
};

const SIZE_MAP = {
  sm: 'small' as const,
  md: 'medium' as const,
  lg: 'large' as const,
};

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

/**
 * Custom Button component with Mattermost styling
 * Supports loading state and consistent variant/size mapping
 */

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  sx,
  ...props
}) => {
  // Memoized button props and styles
  const { buttonProps, buttonStyles } = useMemo(() => ({
    buttonProps: {
      variant: VARIANT_MAP[variant],
      color: COLOR_MAP[variant],
      size: SIZE_MAP[size],
      disabled: disabled || loading,
      startIcon: loading ? <CircularProgress size={16} /> : undefined,
    },
    buttonStyles: {
      ...STATIC_STYLES.base,
      ...sx,
    },
  }), [variant, size, loading, disabled, sx]);

  return (
    <MuiButton
      {...buttonProps}
      sx={buttonStyles}
      {...props}
    >
      {children}
    </MuiButton>
  );
};

export default Button;