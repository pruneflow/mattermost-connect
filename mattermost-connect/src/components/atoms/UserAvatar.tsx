import React from 'react';
import { Avatar, Badge, Box } from '@mui/material';
import { displayUsername, getProfileImageUrl } from '../../utils/userUtils';
import { getStatusColor } from '../../utils/statusUtils';
import { useUserStatus } from '../../hooks/useUserStatus';
import type { UserProfile } from '../../api/types';

export interface UserAvatarProps {
  user?: UserProfile;
  size?: 'small' | 'medium' | 'large';
  showStatus?: boolean;
  onClick?: () => void;
  showTooltip?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'medium',
  showStatus = false,
  onClick,
  showTooltip = true,
}) => {
  const { getUserStatus } = useUserStatus();
  
  // Get user's current status and color
  const userStatus = user?.id ? getUserStatus(user.id) : null;
  const statusColor = getStatusColor(userStatus?.status);
  // Size mapping for MUI Avatar
  const sizeMap = {
    small: 28,
    medium: 40,
    large: 56,
  };

  const avatarSize = sizeMap[size];

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

  // Profile image URL if user exists (with cache busting timestamp)
  const profileImageUrl = user?.id ? getProfileImageUrl(user.id, (user as any).last_picture_update) : undefined;

  const avatar = (
    <Avatar
      src={profileImageUrl}
      sx={{
        width: avatarSize,
        height: avatarSize,
        bgcolor: 'primary.main', // Use theme primary color (Mattermost blue in light)
        fontSize: size === 'small' ? '12px' : size === 'medium' ? '14px' : '18px',
        fontWeight: 600,
      }}
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
      overlap="circular"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      badgeContent={
        <Box
          sx={{
            width: size === 'small' ? 8 : size === 'medium' ? 10 : 12,
            height: size === 'small' ? 8 : size === 'medium' ? 10 : 12,
            borderRadius: '50%',
            bgcolor: statusColor,
            border: '2px solid',
            borderColor: 'background.paper',
          }}
        />
      }
    >
      {avatar}
    </Badge>
  );
};

export default UserAvatar;