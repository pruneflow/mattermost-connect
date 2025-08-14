import React, { memo, useMemo } from 'react';
import { Box, SxProps, Theme, useTheme } from '@mui/material';

/**
 * Post layout component with avatar, content, and actions zones
 * Provides structured layout following Mattermost's post design patterns
 */

interface PostLayoutProps {
  avatarZone?: React.ReactNode;
  contentZone: React.ReactNode;
  actionsZone?: React.ReactNode;
  isGrouped?: boolean;
  sx?: SxProps<Theme>;
}

// Static styles extracted outside component for performance
const STATIC_STYLES = {
  layout: {
    display: 'flex',
    width: '100%',
    position: 'relative',
  } as const,
  
  avatarZone: {
    flexShrink: 0,
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
  } as const,
  
  contentZone: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  } as const,
  
  actionsZone: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'flex-start',
    opacity: 0,
    visibility: 'hidden',
    position: 'absolute',
    zIndex: 5,
  } as const,
} as const;

export const PostLayout: React.FC<PostLayoutProps> = memo(({
  avatarZone,
  contentZone,
  actionsZone,
  isGrouped = false,
  sx,
}) => {
  const theme = useTheme();
  
  // Memoized dynamic styles
  const dynamicStyles = useMemo(() => ({
    layout: {
      ...STATIC_STYLES.layout,
      gap: theme.spacing(1),
      
      ...(isGrouped ? {
        paddingTop: theme.spacing(0.125),
        paddingBottom: theme.spacing(0.125),
      } : {
        paddingTop: theme.spacing(0.5),
        paddingBottom: theme.spacing(0.5),
      }),
      
      ...sx,
    },
    
    avatarZone: {
      ...STATIC_STYLES.avatarZone,
      marginTop: theme.spacing(0.25),
    },
    
    contentZone: {
      ...STATIC_STYLES.contentZone,
      gap: theme.spacing(0.25),
    },
    
    actionsZone: {
      ...STATIC_STYLES.actionsZone,
      transition: theme.transitions.create(['opacity', 'visibility'], {
        duration: theme.transitions.duration.short,
      }),
      marginTop: theme.spacing(0.25),
      right: theme.spacing(1),
      top: theme.spacing(0.5),
    },
  }), [theme, isGrouped, sx]);
  
  return (
    <Box 
      className="post-layout"
      sx={dynamicStyles.layout}
    >
      {/* Avatar zone */}
      {avatarZone && (
        <Box 
          className="post-avatar-zone"
          sx={dynamicStyles.avatarZone}
        >
          {avatarZone}
        </Box>
      )}
      
      {/* Main content zone */}
      <Box 
        className="post-content-zone"
        sx={dynamicStyles.contentZone}
      >
        {contentZone}
      </Box>
      
      {/* Actions zone (visible on hover) */}
      {actionsZone && (
        <Box 
          className="post-actions post-actions-zone"
          sx={dynamicStyles.actionsZone}
        >
          {actionsZone}
        </Box>
      )}
    </Box>
  );
});

PostLayout.displayName = 'PostLayout';