import React from 'react';

export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled';
  size?: 'sm' | 'md' | 'lg';
}

const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  helperText,
  variant = 'default',
  size = 'md',
  style,
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const containerStyle: React.CSSProperties = {
    marginBottom: '16px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#333',
    marginBottom: '4px',
  };

  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    border: `1px solid ${error ? '#d32f2f' : '#ddd'}`,
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s ease',
    outline: 'none',
  };

  const variantStyles = {
    default: {
      backgroundColor: 'white',
    },
    filled: {
      backgroundColor: '#f5f5f5',
    },
  };

  const sizeStyles = {
    sm: {
      padding: '6px 8px',
      fontSize: '13px',
    },
    md: {
      padding: '8px 12px',
      fontSize: '14px',
    },
    lg: {
      padding: '12px 16px',
      fontSize: '16px',
    },
  };

  const inputStyle = {
    ...baseInputStyle,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  };

  const helperStyle: React.CSSProperties = {
    fontSize: '12px',
    color: error ? '#d32f2f' : '#666',
    marginTop: '4px',
  };

  return (
    <div style={containerStyle}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
        </label>
      )}
      
      <input
        id={inputId}
        style={inputStyle}
        onFocus={(e) => {
          e.target.style.borderColor = error ? '#d32f2f' : '#1976d2';
          e.target.style.boxShadow = `0 0 0 2px ${error ? 'rgba(211, 47, 47, 0.2)' : 'rgba(25, 118, 210, 0.2)'}`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? '#d32f2f' : '#ddd';
          e.target.style.boxShadow = 'none';
        }}
        {...props}
      />
      
      {(error || helperText) && (
        <p style={helperStyle}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default TextInput;