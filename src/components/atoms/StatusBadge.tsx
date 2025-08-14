/**
 * Status badge component for displaying user online status
 * Shows colored dot indicator with optional text label
 */
import React, { useMemo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import type { UserStatus } from '../../api/types';
import type { SxProps, Theme } from '@mui/material';

// Static configuration extracted for performance
const SIZE_MAP = {
  sm: 8,
  md: 10,
  lg: 12,
} as const;

const STATUS_LABELS: Record<UserStatus['status'], string> = {
  online: 'Online',
  away: 'Away',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
};

const STATIC_STYLES = {
  container: {
    display: 'flex',
    alignItems: 'center',
  } as const,
  
  dot: {
    borderRadius: '50%',
    flexShrink: 0,
  } as const,
  
  text: {
    color: 'text.secondary',
    fontWeight: 500,
  } as const,
};

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
  
  // Memoized styles based on props
  const styles = useMemo(() => {
    const dotSize = SIZE_MAP[size];
    
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
    
    return {
      container: {
        ...STATIC_STYLES.container,
        gap: showText ? 0.75 : 0,
        ...sx,
      },
      
      dot: {
        ...STATIC_STYLES.dot,
        width: dotSize,
        height: dotSize,
        backgroundColor: getStatusColor(status),
      },
    };
  }, [size, status, showText, sx, theme.palette]);

  return (
    <Box className={className} sx={styles.container}>
      <Box sx={styles.dot} />
      {showText && (
        <Typography variant="caption" sx={STATIC_STYLES.text}>
          {STATUS_LABELS[status]}
        </Typography>
      )}
    </Box>
  );
};

export default StatusBadge;