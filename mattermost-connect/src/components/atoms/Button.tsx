import React from 'react';
import { Button as MuiButton, CircularProgress } from '@mui/material';
import type { ButtonProps as MuiButtonProps } from '@mui/material';

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  sx,
  ...props
}) => {
  const getVariant = (): MuiButtonProps['variant'] => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return 'contained';
      case 'secondary':
        return 'outlined';
      case 'ghost':
        return 'text';
      default:
        return 'contained';
    }
  };

  const getColor = (): MuiButtonProps['color'] => {
    switch (variant) {
      case 'primary':
        return 'primary';
      case 'danger':
        return 'error';
      case 'secondary':
      case 'ghost':
        return 'inherit';
      default:
        return 'primary';
    }
  };

  const getSize = (): MuiButtonProps['size'] => {
    switch (size) {
      case 'sm':
        return 'small';
      case 'lg':
        return 'large';
      default:
        return 'medium';
    }
  };

  return (
    <MuiButton
      variant={getVariant()}
      color={getColor()}
      size={getSize()}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} /> : undefined}
      sx={{
        textTransform: 'none',
        borderRadius: 1.5,
        fontWeight: 500,
        // Mobile touch targets
        minHeight: { xs: 44, sm: 'auto' },
        px: { xs: 2, sm: 'auto' },
        ...sx,
      }}
      {...props}
    >
      {children}
    </MuiButton>
  );
};

export default Button;