import React, { memo, ReactNode, useMemo } from 'react';
import { Box, SxProps, Theme, useTheme } from '@mui/material';

/**
 * Wrapper principal pour un post avec styles Mattermost
 */

interface PostWrapperProps {
  children: ReactNode;
  isHovered?: boolean;
  isSelected?: boolean;
  isGrouped?: boolean;
  isPending?: boolean;
  isFailed?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  sx?: SxProps<Theme>;
}

// Static styles extracted outside component for performance
const STATIC_STYLES = {
  base: {
    position: 'relative',
    display: 'flex',
    width: '100%',
    cursor: 'pointer',
    
    '&:focus': {
      outline: 'none',
    },
    
    // Shimmer animation for pending posts
    '@keyframes shimmer': {
      '0%': {
        transform: 'translateX(-100%)',
      },
      '100%': {
        transform: 'translateX(100%)',
      },
    },
  } as const,

  hover: {
    // Afficher les actions au hover
    '& .post-actions': {
      opacity: 1,
      visibility: 'visible',
    },
  } as const,

  pending: {
    opacity: 0.6,
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      animation: 'shimmer 1.5s infinite',
    },
  } as const,

  failed: {
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '2px',
    },
  } as const,
} as const;

export const PostWrapper: React.FC<PostWrapperProps> = memo(({
  children,
  isHovered = false,
  isSelected = false,
  isGrouped = false,
  isPending = false,
  isFailed = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  sx,
}) => {
  const theme = useTheme();
  
  // Memoized dynamic styles
  const dynamicStyles = useMemo(() => ({
    ...STATIC_STYLES.base,
    minHeight: isGrouped ? '1.5rem' : '2.5rem',
    padding: theme.spacing(0.5, 1),
    backgroundColor: isSelected 
      ? theme.palette.action.selected
      : isHovered 
      ? theme.palette.action.hover
      : 'transparent',
    borderLeft: isSelected ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
    transition: theme.transitions.create(['background-color', 'border-left-color'], {
      duration: theme.transitions.duration.short,
    }),
    
    // État pending
    ...(isPending && {
      ...STATIC_STYLES.pending,
      '&::after': {
        ...STATIC_STYLES.pending['&::after'],
        background: `linear-gradient(90deg, transparent, ${theme.palette.action.hover}, transparent)`,
      },
    }),
    
    // État failed
    ...(isFailed && {
      backgroundColor: theme.palette.error.dark + '10',
      borderLeft: `2px solid ${theme.palette.error.main}`,
      '&::before': {
        ...STATIC_STYLES.failed['&::before'],
        backgroundColor: theme.palette.error.main,
      },
    }),
    
    // Hover states
    '&:hover': {
      backgroundColor: isSelected 
        ? theme.palette.action.selected
        : theme.palette.action.hover,
      ...STATIC_STYLES.hover,
    },
    
    '&:focus': {
      ...STATIC_STYLES.base['&:focus'],
      backgroundColor: theme.palette.action.hover,
      borderLeft: `2px solid ${theme.palette.primary.main}`,
    },
    
    ...sx,
  }), [theme, isHovered, isSelected, isGrouped, isPending, isFailed, sx]);
  
  return (
    <Box
      className="post-wrapper"
      sx={dynamicStyles}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="article"
      tabIndex={0}
    >
      {children}
    </Box>
  );
});

PostWrapper.displayName = 'PostWrapper';