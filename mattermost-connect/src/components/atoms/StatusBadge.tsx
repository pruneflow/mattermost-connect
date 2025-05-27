import React from 'react';
import type { UserStatus } from '../../api/types';

export interface StatusBadgeProps {
  status: UserStatus['status'];
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  sx?: React.CSSProperties;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showText = false,
  className,
  sx
}) => {
  const sizeMap = {
    sm: 8,
    md: 10,
    lg: 12
  };

  const statusColors: Record<UserStatus['status'], string> = {
    online: '#28a745',
    away: '#ffc107',
    dnd: '#dc3545',
    offline: '#6c757d'
  };

  const statusLabels: Record<UserStatus['status'], string> = {
    online: 'Online',
    away: 'Away',
    dnd: 'Do Not Disturb',
    offline: 'Offline'
  };

  const dotSize = sizeMap[size];

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: showText ? '6px' : '0',
    ...sx
  };

  const dotStyle: React.CSSProperties = {
    width: dotSize,
    height: dotSize,
    borderRadius: '50%',
    backgroundColor: statusColors[status],
    flexShrink: 0
  };

  const textStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#495057',
    fontWeight: 500
  };

  return (
    <div style={containerStyle} className={className}>
      <div style={dotStyle} />
      {showText && <span style={textStyle}>{statusLabels[status]}</span>}
    </div>
  );
};

export default StatusBadge;