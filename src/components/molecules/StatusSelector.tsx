/**
 * Status selector dropdown component for changing user presence status
 * Provides online, away, DND, and offline options with status indicators
 */
import React from 'react';
import { Dropdown, StatusBadge } from '../atoms';
import { handleError } from '../../services/errorService';
import type { UserStatus } from '../../api/types';
import type { DropdownOption } from '../atoms/Dropdown';

export interface StatusSelectorProps {
  currentStatus: UserStatus['status'];
  onChange: (status: UserStatus['status']) => void;
  disabled?: boolean;
  className?: string;
  sx?: React.CSSProperties;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  currentStatus,
  onChange,
  disabled = false,
  className,
  sx
}) => {
  
  const statusOptions: DropdownOption[] = [
    {
      label: 'Online',
      value: 'online',
      icon: <StatusBadge status="online" size="sm" />
    },
    {
      label: 'Away',
      value: 'away',
      icon: <StatusBadge status="away" size="sm" />
    },
    {
      label: 'Do Not Disturb',
      value: 'dnd',
      icon: <StatusBadge status="dnd" size="sm" />
    },
    {
      label: 'Offline',
      value: 'offline',
      icon: <StatusBadge status="offline" size="sm" />
    }
  ];

  const handleChange = (value: string) => {
    try {
      onChange(value as UserStatus['status']);
    } catch (error) {
      handleError(error, {
        component: 'StatusSelector',
        action: 'changeStatus',
        showToast: true
      });
    }
  };

  return (
    <Dropdown
      options={statusOptions}
      value={currentStatus}
      onChange={handleChange}
      disabled={disabled}
      placeholder="Select status"
      className={className}
      sx={sx}
    />
  );
};

export default StatusSelector;