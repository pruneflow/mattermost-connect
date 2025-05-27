import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    borderRadius: '6px',
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    opacity: disabled || loading ? 0.6 : 1,
  };

  const variantStyles = {
    primary: {
      backgroundColor: '#1976d2',
      color: 'white',
    },
    secondary: {
      backgroundColor: '#f5f5f5',
      color: '#333',
      border: '1px solid #ddd',
    },
    danger: {
      backgroundColor: '#d32f2f',
      color: 'white',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#666',
    },
  };

  const sizeStyles = {
    sm: {
      padding: '6px 12px',
      fontSize: '13px',
    },
    md: {
      padding: '8px 16px',
      fontSize: '14px',
    },
    lg: {
      padding: '12px 24px',
      fontSize: '16px',
    },
  };

  const finalStyle = {
    ...baseStyle,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  };

  return (
    <button
      style={finalStyle}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span style={{ marginRight: '8px' }}>
          ⏳
        </span>
      )}
      {children}
    </button>
  );
};

export default Button;