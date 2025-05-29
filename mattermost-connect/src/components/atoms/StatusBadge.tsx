import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import type { UserStatus } from '../../api/types';
import type { SxProps, Theme } from '@mui/material';

export interface StatusBadgeProps {
  status: UserStatus['status'];
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  sx?: SxProps<Theme>;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showText = false,
  className,
  sx
}) => {
  const theme = useTheme();
  
  const sizeMap = {
    sm: 8,
    md: 10,
    lg: 12
  };

  // Use theme-aware status colors that work in light/dark mode
  const getStatusColor = (status: UserStatus['status']) => {
    switch (status) {
      case 'online': return theme.palette.success.main;
      case 'away': return theme.palette.warning.main;
      case 'dnd': return theme.palette.error.main;
      case 'offline': return theme.palette.action.disabled;
      default: return theme.palette.action.disabled;
    }
  };

  const statusLabels: Record<UserStatus['status'], string> = {
    online: 'Online',
    away: 'Away',
    dnd: 'Do Not Disturb',
    offline: 'Offline'
  };

  const dotSize = sizeMap[size];

  return (
    <Box 
      className={className}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: showText ? 0.75 : 0,
        ...sx
      }}
    >
      <Box
        sx={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: getStatusColor(status),
          flexShrink: 0
        }}
      />
      {showText && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 500
          }}
        >
          {statusLabels[status]}
        </Typography>
      )}
    </Box>
  );
};

export default StatusBadge;