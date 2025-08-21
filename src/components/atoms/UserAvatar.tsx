/**
 * User avatar component with optional status indicator
 * Displays user profile images, initials, and online status following Mattermost patterns
 */
import React, { useMemo, useState, useEffect } from 'react';
import { Avatar, Badge, Box } from '@mui/material';
import { displayUsername } from '../../utils/userUtils';
import { getStatusColor } from '../../utils/statusUtils';
import { useUserStatus } from '../../hooks/useUserStatus';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectUserById } from '../../store/selectors';
import { imageService } from '../../services/imageService';
import type { UserProfile } from '../../api/types';

// Static styles and configurations extracted for performance
const SIZE_MAP = {
  xs: 24,
  small: 28,
  medium: 40,
  large: 56,
} as const;

const FONT_SIZE_MAP = {
  xs: '10px',
  small: '12px', 
  medium: '14px',
  large: '18px',
} as const;

const STATUS_BADGE_SIZE_MAP = {
  xs: 6,
  small: 8,
  medium: 10, 
  large: 12,
} as const;

const STATIC_STYLES = {
  badge: {
    overlap: 'circular' as const,
    anchorOrigin: { vertical: 'bottom' as const, horizontal: 'right' as const },
  },
  
  statusIndicator: {
    borderRadius: '50%',
    border: '2px solid',
    borderColor: 'background.paper',
  } as const,
  
  avatarBase: {
    bgcolor: 'primary.main',
    fontWeight: 600,
  } as const,
};

export interface UserAvatarProps {
  userId: string;
  size?: 'xs' | 'small' | 'medium' | 'large';
  showStatus?: boolean;
  onClick?: () => void;
  showTooltip?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  size = 'medium',
  showStatus = false,
  onClick,
  showTooltip = true,
}) => {
  const { getUserStatus } = useUserStatus();
  
  // Get user from store
  const user = useAppSelector(selectUserById(userId));
  
  // Get user's current status and color
  const userStatus = userId ? getUserStatus(userId) : null;
  const statusColor = getStatusColor(userStatus?.status);
  
  // Memoized styles based on size and statusColor
  const styles = useMemo(() => {
    const avatarSize = SIZE_MAP[size];
    const statusBadgeSize = STATUS_BADGE_SIZE_MAP[size];
    
    return {
      avatar: {
        ...STATIC_STYLES.avatarBase,
        width: avatarSize,
        height: avatarSize,
        fontSize: FONT_SIZE_MAP[size],
      },
      
      statusIndicator: {
        ...STATIC_STYLES.statusIndicator,
        width: statusBadgeSize,
        height: statusBadgeSize,
        bgcolor: statusColor,
      },
    };
  }, [size, statusColor]);

  // Generate initials using official Mattermost display name
  const getInitials = (user: UserProfile): string => {
    const displayName = displayUsername(user, 'full_name', true);
    
    if (!displayName || displayName === 'Someone') return '?';
    
    const words = displayName.split(' ').filter(word => word.length > 0);
    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }
    
    return displayName.charAt(0).toUpperCase();
  };

  // Profile image URL using image service (handles token/cookie authentication)
  const [profileImageUrl, setProfileImageUrl] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (!user) {
      setProfileImageUrl(undefined);
      return;
    }

    imageService.getUserAvatar(userId, (user as any).last_picture_update)
      .then(url => setProfileImageUrl(url))
      .catch(() => setProfileImageUrl(undefined));

    // Cleanup function to revoke blob URLs on unmount/change
    return () => {
      if (profileImageUrl && profileImageUrl.startsWith('blob:')) {
        imageService.revokeBlobUrl(profileImageUrl);
      }
    };
  }, [user, userId]);

  const avatar = (
    <Avatar
      src={profileImageUrl}
      sx={styles.avatar}
      onClick={onClick}
    >
      {user ? getInitials(user) : '?'}
    </Avatar>
  );

  // If no status indicator needed, return simple avatar
  if (!showStatus) {
    return avatar;
  }

  // Wrap with status badge
  return (
    <Badge
      overlap={STATIC_STYLES.badge.overlap}
      anchorOrigin={STATIC_STYLES.badge.anchorOrigin}
      badgeContent={
        <Box sx={styles.statusIndicator} />
      }
    >
      {avatar}
    </Badge>
  );
};

export default UserAvatar;