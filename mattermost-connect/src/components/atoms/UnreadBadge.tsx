/**
 * Unread badge component following Mattermost unread count patterns
 * Shows different colors based on mentions vs regular unread messages
 */
import React, { useMemo } from 'react';
import { Badge } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

export interface UnreadBadgeProps {
  count: number;
  mentions?: number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  sx?: SxProps<Theme>;
  children?: React.ReactNode;
}

export const UnreadBadge = React.forwardRef<HTMLElement, UnreadBadgeProps>(({
  count,
  mentions = 0,
  size = 'md',
  disabled = false,
  className,
  sx,
  children,
  ...props
}, ref) => {
  // Early return for empty badge
  if (count === 0 && mentions === 0) {
    return children || null;
  }

  // Memoized size configuration
  const sizeConfig = useMemo(() => {
    const sizeMap = {
      sm: { fontSize: '10px', minWidth: 16, height: 16 },
      md: { fontSize: '11px', minWidth: 18, height: 18 },
      lg: { fontSize: '12px', minWidth: 20, height: 20 }
    };
    return sizeMap[size];
  }, [size]);

  // Memoized badge logic
  const { badgeColor, badgeContent } = useMemo(() => {
    let displayCount: number;
    let badgeColor: 'error' | 'warning' | 'default';
    
    if (mentions >= count) {
      // Case 1: mentions >= unreads → RED with mention count
      displayCount = mentions;
      badgeColor = 'error'; // red
    } else if (count > mentions && mentions > 0) {
      // Case 2: unreads > mentions > 0 → ORANGE with unread count
      displayCount = count;
      badgeColor = 'warning'; // orange
    } else {
      // Case 3: unreads > 0 && mentions = 0 → GRAY with unread count
      displayCount = count;
      badgeColor = 'default'; // gray
    }

    // Format count for display (Mattermost standard)
    const formatCount = (num: number): string => {
      if (num > 999) return '999+';
      return num.toString();
    };

    return {
      displayCount,
      badgeColor,
      badgeContent: formatCount(displayCount)
    };
  }, [count, mentions]);

  // Memoized base badge styles
  const baseBadgeStyles = useMemo(() => ({
    fontSize: sizeConfig.fontSize,
    minWidth: sizeConfig.minWidth,
    height: sizeConfig.height,
    fontWeight: 600,
    backgroundColor: disabled 
      ? 'action.disabled'  // Disabled = always gray
      : badgeColor === 'error' ? 'error.main' : 
        badgeColor === 'warning' ? 'deepOrange.800' : 'action.disabled',
    color: 'common.white',
    opacity: disabled ? 0.7 : 1, // Transparency for disabled
  }), [sizeConfig, badgeColor, disabled]);

  // Memoized sx for children (with badge positioning)
  const childrenSx = useMemo(() => ({
    '& .MuiBadge-badge': baseBadgeStyles,
    ...sx
  }), [baseBadgeStyles, sx]);

  // Memoized sx for standalone (with static positioning)
  const standaloneSx = useMemo(() => ({
    '& .MuiBadge-badge': {
      ...baseBadgeStyles,
      position: 'static',
      transform: 'none',
    },
    ...sx
  }), [baseBadgeStyles, sx]);

  return (
    <Badge
      ref={ref}
      badgeContent={badgeContent}
      color={badgeColor}
      className={className}
      sx={children ? childrenSx : standaloneSx}
      {...props}
    >
      {children}
    </Badge>
  );
});

UnreadBadge.displayName = 'UnreadBadge';

export default UnreadBadge;