import React, { memo, useMemo } from 'react';
import { Box, Typography, SxProps, Theme, useTheme } from '@mui/material';
import { formatDate } from '../../utils/dateUtils';

/**
 * Date divider component that displays a date separator with horizontal line
 * Exactly replicates Mattermost's date separator styling and behavior
 */

interface DateDividerProps {
  date: number;
  sx?: SxProps<Theme>;
}

// Static styles extracted outside component for performance
const STATIC_STYLES = {
  container: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: 0,
      right: 0,
      height: '1px',
      zIndex: 1,
    },
  } as const,
  
  label: {
    position: 'relative',
    fontSize: '0.875rem',
    fontWeight: 600,
    zIndex: 2,
  } as const,
} as const;

export const DateDivider: React.FC<DateDividerProps> = memo(({
  date,
  sx,
}) => {
  const theme = useTheme();
  const formattedDate = formatDate(date);
  
  // Memoized dynamic styles
  const dynamicStyles = useMemo(() => ({
    container: {
      ...STATIC_STYLES.container,
      padding: theme.spacing(1.5, 2),
      margin: theme.spacing(1.5, 0),
      
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(1, 1.5),
        margin: theme.spacing(1, 0),
      },
      
      '&::before': {
        ...STATIC_STYLES.container['&::before'],
        backgroundColor: theme.palette.divider,
      },
      
      ...sx,
    },
    
    label: {
      ...STATIC_STYLES.label,
      backgroundColor: theme.palette.background.paper,
      padding: theme.spacing(0.5, 1.5),
      borderRadius: theme.shape.borderRadius,
      border: `1px solid ${theme.palette.divider}`,
      color: theme.palette.text.secondary,
      
      [theme.breakpoints.down('sm')]: {
        fontSize: '0.8125rem',
        padding: theme.spacing(0.375, 1),
      },
    },
  }), [theme, sx]);
  
  return (
    <Box
      className="date-divider"
      sx={dynamicStyles.container}
      role="separator"
      aria-label={`Messages from ${formattedDate}`}
    >
      <Typography
        variant="body2"
        sx={dynamicStyles.label}
      >
        {formattedDate}
      </Typography>
    </Box>
  );
});

DateDivider.displayName = 'DateDivider';