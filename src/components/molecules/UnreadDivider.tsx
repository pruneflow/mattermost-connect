/**
 * Unread messages divider component matching Mattermost design
 * Displays a divider line with message count for unread messages
 */
import React, { memo, useMemo } from 'react';
import { Box, Typography, SxProps, Theme, useTheme } from '@mui/material';

interface UnreadDividerProps {
  count?: number;
  sx?: SxProps<Theme>;
}

// Static styles extracted outside component for performance
const STATIC_STYLES = {
  container: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    
    '&::before': {
      content: '""',
      flex: 1,
      height: '2px',
    },
    
    '&::after': {
      content: '""',
      flex: 1,
      height: '2px',
    },
  } as const,
  
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
  } as const,
} as const;

export const UnreadDivider: React.FC<UnreadDividerProps> = memo(({
  count,
  sx,
}) => {
  const theme = useTheme();
  
  const displayText = count && count > 0 
    ? `${count} New Message${count > 1 ? 's' : ''}`
    : 'New Messages';
  
  // Memoized dynamic styles
  const dynamicStyles = useMemo(() => ({
    container: {
      ...STATIC_STYLES.container,
      margin: theme.spacing(1.5, 0),
      padding: theme.spacing(0, 2),
      
      // Responsive padding
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(0, 1.5),
        margin: theme.spacing(1, 0),
      },
      
      '&::before': {
        ...STATIC_STYLES.container['&::before'],
        backgroundColor: theme.palette.error.main,
        marginRight: theme.spacing(1.5),
      },
      
      '&::after': {
        ...STATIC_STYLES.container['&::after'],
        backgroundColor: theme.palette.error.main,
        marginLeft: theme.spacing(1.5),
      },
      
      ...sx,
    },
    
    label: {
      ...STATIC_STYLES.label,
      backgroundColor: theme.palette.error.main,
      color: theme.palette.error.contrastText,
      padding: theme.spacing(0.5, 1.5),
      borderRadius: theme.shape.borderRadius,
      
      // Responsive font size
      [theme.breakpoints.down('sm')]: {
        fontSize: '0.8125rem',
        padding: theme.spacing(0.375, 1),
      },
    },
  }), [theme, sx]);
  
  return (
    <Box 
      className="unread-divider"
      sx={dynamicStyles.container}
      role="separator"
      aria-label="New messages"
    >
      <Typography
        variant="body2"
        sx={dynamicStyles.label}
      >
        {displayText}
      </Typography>
    </Box>
  );
});

UnreadDivider.displayName = 'UnreadDivider';