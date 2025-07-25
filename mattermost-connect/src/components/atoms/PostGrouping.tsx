import React, { memo, useMemo } from 'react';
import { Box, SxProps, Theme, useTheme } from '@mui/material';
import { formatMessageTime } from '../../utils/dateUtils';

/**
 * Composant pour gérer le groupage des posts selon la logique Mattermost
 */

interface PostGroupingProps {
  isGrouped: boolean;
  showTimestamp?: boolean;
  timestamp?: number; // Timestamp du post pour l'affichage au hover
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

// Static styles extracted outside component for performance
const STATIC_STYLES = {
  container: {
    display: 'flex',
    alignItems: 'flex-start',
    width: '100%',
  } as const,
  
  timestampZone: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    opacity: 0,
    visibility: 'hidden',
    fontSize: '0.75rem',
    zIndex: 10,
  } as const,
} as const;

export const PostGrouping: React.FC<PostGroupingProps> = memo(({
  isGrouped,
  showTimestamp = false,
  timestamp,
  children,
  sx,
}) => {
  const theme = useTheme();
  
  // Memoized dynamic styles
  const dynamicStyles = useMemo(() => ({
    container: {
      ...STATIC_STYLES.container,
      gap: theme.spacing(1),
      
      // Espacement pour les posts groupés
      ...(isGrouped && {
        paddingLeft: theme.spacing(5), // Aligner avec l'avatar (32px + 8px gap)
        paddingTop: theme.spacing(0.25),
        paddingBottom: theme.spacing(0.25),
      }),
      
      // Espacement pour les posts non groupés
      ...(!isGrouped && {
        paddingTop: theme.spacing(0.5),
        paddingBottom: theme.spacing(0.5),
      }),
      
      // Zone de timestamp au hover pour les posts groupés
      ...(isGrouped && showTimestamp && {
        '&:hover': {
          '& .grouped-timestamp': {
            opacity: 1,
            visibility: 'visible',
          },
        },
      }),
      
      ...sx,
    },
    
    timestampZone: {
      ...STATIC_STYLES.timestampZone,
      left: theme.spacing(1),
      transition: theme.transitions.create(['opacity', 'visibility'], {
        duration: theme.transitions.duration.short,
      }),
      color: theme.palette.text.secondary,
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(0.25, 0.5),
      boxShadow: theme.shadows[1],
    },
  }), [theme, isGrouped, showTimestamp, sx]);
  
  return (
    <Box 
      className={`post-grouping ${isGrouped ? 'grouped' : 'standalone'}`}
      sx={dynamicStyles.container}
    >
      {/* Timestamp au hover pour les posts groupés */}
      {isGrouped && showTimestamp && timestamp && (
        <Box 
          className="grouped-timestamp"
          sx={dynamicStyles.timestampZone}
        >
          {formatMessageTime(timestamp)}
        </Box>
      )}
      
      {children}
    </Box>
  );
});

PostGrouping.displayName = 'PostGrouping';