import React from 'react';
import { Badge } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

export interface UnreadBadgeProps {
  count: number;
  mentions?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  sx?: SxProps<Theme>;
  children?: React.ReactNode;
}

export const UnreadBadge: React.FC<UnreadBadgeProps> = ({
  count,
  mentions = 0,
  size = 'md',
  className,
  sx,
  children
}) => {
  if (count === 0 && mentions === 0) {
    return children ? <>{children}</> : null;
  }

  const sizeMap = {
    sm: { fontSize: '10px', minWidth: 16, height: 16 },
    md: { fontSize: '11px', minWidth: 18, height: 18 },
    lg: { fontSize: '12px', minWidth: 20, height: 20 }
  };

  const sizeConfig = sizeMap[size];

  // Show mentions if any, otherwise show unread count
  const displayCount = mentions > 0 ? mentions : count;
  const isMention = mentions > 0;

  // Format count for display (Mattermost standard)
  const formatCount = (num: number): string => {
    if (num > 999) return '999+';
    return num.toString();
  };

  const badgeContent = formatCount(displayCount);

  if (children) {
    return (
      <Badge
        badgeContent={badgeContent}
        color={isMention ? 'error' : 'default'}
        className={className}
        sx={{
          '& .MuiBadge-badge': {
            fontSize: sizeConfig.fontSize,
            minWidth: sizeConfig.minWidth,
            height: sizeConfig.height,
            fontWeight: 600,
            backgroundColor: isMention ? 'error.main' : 'action.disabled',
            color: 'common.white',
          },
          ...sx
        }}
      >
        {children}
      </Badge>
    );
  }

  // Standalone badge
  return (
    <Badge
      badgeContent={badgeContent}
      color={isMention ? 'error' : 'default'}
      className={className}
      sx={{
        '& .MuiBadge-badge': {
          fontSize: sizeConfig.fontSize,
          minWidth: sizeConfig.minWidth,
          height: sizeConfig.height,
          fontWeight: 600,
          backgroundColor: isMention ? 'error.main' : 'action.disabled',
          color: 'common.white',
          position: 'static',
          transform: 'none',
        },
        ...sx
      }}
    />
  );
};

export default UnreadBadge;