import React, { memo, useState, useEffect, useMemo } from 'react';
import { Typography, Tooltip, SxProps, Theme, useTheme } from '@mui/material';
import { formatMessageTimestamp, formatMessageTime, formatFullDate } from '../../utils/dateUtils';

/**
 * Timestamp display component with auto-updating relative times
 * Shows relative time with hover tooltip containing full date
 */

interface TimestampDisplayProps {
  timestamp: number;
  showTooltip?: boolean;
  onClick?: () => void;
  sx?: SxProps<Theme>;
  format?: 'full' | 'time';
}

// Static styles extracted outside component for performance
const STATIC_STYLES = {
  timestamp: {
    fontSize: '0.75rem',
    cursor: 'pointer',
  } as const,
} as const;

export const TimestampDisplay: React.FC<TimestampDisplayProps> = memo(({
  timestamp,
  showTooltip = true,
  onClick,
  sx,
  format = 'full',
}) => {
  const theme = useTheme();
  const formatFunction = format === 'time' ? formatMessageTime : formatMessageTimestamp;
  const [displayTime, setDisplayTime] = useState(formatFunction(timestamp));
  
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setDisplayTime(formatFunction(timestamp));
    }, 60000);
    
    return () => clearInterval(updateInterval);
  }, [timestamp, formatFunction]);
  
  const fullDate = formatFullDate(timestamp);
  
  // Memoized dynamic styles
  const dynamicStyles = useMemo(() => ({
    timestamp: {
      ...STATIC_STYLES.timestamp,
      color: theme.palette.text.secondary,
      transition: theme.transitions.create(['color'], {
        duration: theme.transitions.duration.short,
      }),
      
      '&:hover': {
        color: theme.palette.text.primary,
      },
      
      ...sx,
    },
  }), [theme, sx]);
  
  const timestampElement = (
    <Typography
      variant="caption"
      component="time"
      dateTime={new Date(timestamp).toISOString()}
      sx={dynamicStyles.timestamp}
      onClick={onClick}
    >
      {displayTime}
    </Typography>
  );
  
  if (!showTooltip) {
    return timestampElement;
  }
  
  return (
    <Tooltip
      title={fullDate}
      placement="top"
      arrow
      enterDelay={1000}
      enterNextDelay={1000}
    >
      {timestampElement}
    </Tooltip>
  );
});

TimestampDisplay.displayName = 'TimestampDisplay';