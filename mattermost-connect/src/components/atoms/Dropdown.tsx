import React, { useState, useRef, useEffect } from 'react';

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
  sx?: React.CSSProperties;
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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    minWidth: '120px',
    ...sx
  };

  const triggerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    color: disabled ? '#6c757d' : '#212529',
    opacity: disabled ? 0.6 : 1
  };

  const arrowStyle: React.CSSProperties = {
    marginLeft: '8px',
    fontSize: '12px',
    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s ease'
  };

  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    maxHeight: '200px',
    overflowY: 'auto'
  };

  const optionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    fontSize: '14px',
    cursor: 'pointer',
    borderBottom: '1px solid #f8f9fa'
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionSelect = (e: React.MouseEvent<HTMLDivElement>) => {
    const value = e.currentTarget.dataset.value;
    const disabled = e.currentTarget.dataset.disabled === 'true';
    
    if (!disabled && value) {
      onChange(value);
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} style={containerStyle} className={className}>
      <div style={triggerStyle} onClick={handleToggle}>
        <span style={{ display: 'flex', alignItems: 'center' }}>
          {selectedOption?.icon && <span style={{ marginRight: '8px' }}>{selectedOption.icon}</span>}
          {selectedOption?.label || placeholder}
        </span>
        <span style={arrowStyle}>▼</span>
      </div>
      
      {isOpen && (
        <div style={menuStyle}>
          {options.map((option) => (
            <div
              key={option.value}
              style={{
                ...optionStyle,
                backgroundColor: option.value === value ? '#f8f9fa' : 'transparent',
                color: option.disabled ? '#6c757d' : '#212529',
                cursor: option.disabled ? 'not-allowed' : 'pointer'
              }}
              data-value={option.value}
              data-disabled={option.disabled}
              onClick={handleOptionSelect}
            >
              {option.icon && <span style={{ marginRight: '8px' }}>{option.icon}</span>}
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;