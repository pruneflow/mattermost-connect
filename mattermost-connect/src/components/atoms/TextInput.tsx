import React from 'react';
import { TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';

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
  const getVariant = (): TextFieldProps['variant'] => {
    switch (variant) {
      case 'filled':
        return 'filled';
      default:
        return 'outlined';
    }
  };

  const getSize = (): TextFieldProps['size'] => {
    switch (size) {
      case 'sm':
        return 'small';
      case 'lg':
        return 'medium'; // Material-UI n'a pas 'large' pour TextField
      default:
        return 'medium';
    }
  };

  return (
    <TextField
      variant={getVariant()}
      size={getSize()}
      sx={{
        mb: 2,
        '& .MuiOutlinedInput-root': {
          borderRadius: 1,
        },
        '& .MuiInputLabel-root': {
          fontWeight: 500,
        },
        ...sx,
      }}
      {...props}
    />
  );
};

export default TextInput;