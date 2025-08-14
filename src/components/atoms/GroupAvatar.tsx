/**
 * Group avatar component for displaying channel member avatars
 * Shows overlapping user avatars or group icon with member count badge
 */
import React, { useMemo, useCallback } from 'react';
import { Avatar, Badge, Box, Typography } from '@mui/material';
import { Group as GroupIcon } from '@mui/icons-material';
import { UserAvatar } from './UserAvatar';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectChannelMemberCount } from '../../store/selectors';

// Static styles and configurations extracted for performance
const EMPTY_USER_IDS: string[] = [];

const SIZE_MAP = {
  xs: 24,
  small: 28,
  medium: 40,
  large: 56,
} as const;

const FONT_SIZE_MAP = {
  xs: '8px',
  small: '10px', 
  medium: '12px',
  large: '14px',
} as const;

const ICON_SIZE_MAP = {
  xs: 12,
  small: 14,
  medium: 18,
  large: 22,
} as const;

const STATIC_STYLES = {
  badge: {
    overlap: 'circular' as const,
    anchorOrigin: { vertical: 'bottom' as const, horizontal: 'right' as const },
  },
  
  countBadge: {
    borderRadius: '50%',
    border: '2px solid',
    borderColor: 'background.paper',
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    minWidth: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
  } as const,
  
  avatarBase: {
    bgcolor: 'grey.400',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
};

export interface GroupAvatarProps {
  channelId: string;
  size?: 'xs' | 'small' | 'medium' | 'large';
  showMemberCount?: boolean;
  onClick?: () => void;
}

export const GroupAvatar = React.forwardRef<HTMLDivElement, GroupAvatarProps & React.HTMLAttributes<HTMLDivElement>>(({
  channelId,
  size = 'medium',
  showMemberCount = true,
  onClick,
  ...rest
}, ref) => {
  // Get member count and user IDs from store
  const memberCount = useAppSelector(selectChannelMemberCount(channelId));
  const userIds = useAppSelector(state => state.entities.users.profilesInChannel[channelId] || EMPTY_USER_IDS);
  
  // Get first 3 user IDs for avatars
  const firstThreeUsers = userIds.slice(0, 3);
  // Memoized styles based on size
  const styles = useMemo(() => {
    const avatarSize = SIZE_MAP[size];
    const iconSize = ICON_SIZE_MAP[size];
    const countBadgeSize = Math.max(16, avatarSize * 0.45); // Slightly larger badge
    const userAvatarSize = Math.max(14, avatarSize * 0.45); // Larger user avatars to match direct messages
    
    return {
      container: {
        position: 'relative',
        width: avatarSize,
        height: avatarSize,
      },
      
      avatar: {
        ...STATIC_STYLES.avatarBase,
        width: avatarSize,
        height: avatarSize,
      },
      
      icon: {
        fontSize: iconSize,
      },
      
      countBadge: {
        ...STATIC_STYLES.countBadge,
        width: countBadgeSize,
        height: countBadgeSize,
        fontSize: FONT_SIZE_MAP[size],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      
      userAvatarsContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: avatarSize,
        height: avatarSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      
      userAvatar: {
        position: 'absolute',
        width: userAvatarSize,
        height: userAvatarSize,
      },
    };
  }, [size]);

  // Render user avatars or group icon
  const renderContent = () => {
    if (firstThreeUsers.length >= 3) {
      // Show 3 overlapping user avatars
      return (
        <Box sx={styles.userAvatarsContainer}>
          {firstThreeUsers.map((userId, index) => (
            <Box
              key={userId}
              sx={{
                ...styles.userAvatar,
                zIndex: 3 - index,
                transform: `translate(${(index - 1) * 4}px, ${(index - 1) * -2}px)`,
              }}
            >
              <UserAvatar
                userId={userId}
                size="xs"
                showStatus={false}
              />
            </Box>
          ))}
        </Box>
      );
    } else {
      // Show group icon
      return (
        <Avatar sx={styles.avatar} onClick={onClick}>
          <GroupIcon sx={styles.icon} />
        </Avatar>
      );
    }
  };

  // If no member count or not showing count, return simple content
  if (!showMemberCount || memberCount <= 0) {
    return (
      <Box ref={ref} sx={styles.container} {...rest}>
        {renderContent()}
      </Box>
    );
  }

  // Wrap with member count badge
  return (
    <Badge
      overlap={STATIC_STYLES.badge.overlap}
      anchorOrigin={STATIC_STYLES.badge.anchorOrigin}
      badgeContent={
        <Box sx={styles.countBadge}>
          <Typography variant="caption" sx={{ fontSize: FONT_SIZE_MAP[size], lineHeight: 1 }}>
            {memberCount > 99 ? '99+' : memberCount}
          </Typography>
        </Box>
      }
    >
      <Box ref={ref} sx={styles.container} {...rest}>
        {renderContent()}
      </Box>
    </Badge>
  );
});

GroupAvatar.displayName = 'GroupAvatar';

export default GroupAvatar;