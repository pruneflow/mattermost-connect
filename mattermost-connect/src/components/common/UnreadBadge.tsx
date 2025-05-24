import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';

interface UnreadBadgeProps {
  count: number;
  showZero?: boolean;
  max?: number;
  className?: string;
  style?: React.CSSProperties;
  sx?: SxProps<Theme>;
}

/**
 * Custom badge component to display unread message counts
 * Simple circle with centered text, no positioning constraints
 */
export function UnreadBadge({ 
  count, 
  showZero = false, 
  max = 99, 
  className,
  style,
  sx 
}: UnreadBadgeProps) {
  // Don't render if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null;
  }

  // Limit count to max value
  const displayCount = count > max ? `${max}+` : count;

  return (
    <Box
      className={className}
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 18,
        borderRadius: '50%',
        backgroundColor: '#ef5350', // Rouge un peu plus intense
        color: 'white',
        fontSize: '0.7rem',
        fontWeight: 600,
        minWidth: 18,
        flexShrink: 0,
        ...sx
      }}
    >
      {displayCount}
    </Box>
  );
}