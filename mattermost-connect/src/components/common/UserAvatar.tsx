import React from 'react';
import { Avatar, Badge, Box, Tooltip, Typography, styled } from '@mui/material';
import { User, UserStatus } from '../../api/types';
import { useUserAvatar } from '../../hooks/useUserAvatar';
import { UserStatusBadge } from './UserStatusBadge';
import { getUserInitials } from '../../utils/formatters';

// Custom styled Badge for status indicators
const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    borderRadius: '50%',
    width: 12,
    height: 12,
    right: 2,
    bottom: 2,
  },
}));

export interface UserAvatarProps {
  // User data
  user?: User | null;
  userId?: string;  // Alternative to passing user object
  status?: UserStatus;
  
  // Display options
  size?: 'small' | 'medium' | 'large' | number;
  showStatus?: boolean;
  showName?: boolean;
  namePosition?: 'right' | 'bottom';
  showTooltip?: boolean;
  
  // Interaction
  onClick?: () => void;
  
  // Styling
  sx?: React.CSSProperties;
  className?: string;
}

/**
 * A reusable avatar component that displays user profile pictures with caching.
 * Automatically manages loading images and provides fallback initials.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  userId,
  status,
  size = 'medium',
  showStatus = false,
  showName = false,
  namePosition = 'right',
  showTooltip = true,
  onClick,
  sx,
  className
}) => {
  // Process the userId - either directly provided or from user object
  const effectiveUserId = userId || (user?.id);
  
  // Use our avatar hook for this specific user ID
  const { avatarUrl, getAvatarColor } = useUserAvatar(effectiveUserId);
  
  // Convert size to pixels
  const sizeMap = {
    small: 28,
    medium: 40,
    large: 56
  };
  const pixelSize = typeof size === 'number' ? size : sizeMap[size];
  
  // Get display name
  const displayName = user ? 
    `${user.first_name} ${user.last_name}`.trim() || user.username || 'User' 
    : 'User';
  
  // Get initials for fallback
  const initials = getUserInitials(user);
  
  // Get background color for avatar
  const bgColor = getAvatarColor(user?.username);
  
  // Basic avatar element
  const avatarElement = (
    <Avatar
      alt={displayName}
      src={avatarUrl}
      sx={{
        width: pixelSize,
        height: pixelSize,
        fontSize: `${pixelSize / 2.5}px`,
        bgcolor: bgColor,
        cursor: onClick ? 'pointer' : 'default',
        ...sx
      }}
      onClick={onClick}
      className={className}
    >
      {initials}
    </Avatar>
  );
  
  // Avatar with status badge if needed
  const avatarWithStatus = !showStatus || !status ? (
    avatarElement
  ) : (
    <Box sx={{ position: 'relative' }}>
      {avatarElement}
      <Box 
        sx={{ 
          position: 'absolute', 
          bottom: '-8px', 
          right: '-8px',
          zIndex: 2, // Assure que l'icône est au-dessus de l'image
          display: 'flex',
          bgcolor: 'background.paper',
          borderRadius: '50%',
          padding: '1px'
        }}
      >
        <UserStatusBadge 
          status={status} 
          size={pixelSize <= 32 ? 'small' : pixelSize >= 56 ? 'large' : 'medium'}
          variant="icon"
          showTooltip={false}
          bordered={false}
        />
      </Box>
    </Box>
  );
  
  // Add name if requested
  if (showName) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: namePosition === 'bottom' ? 'column' : 'row',
          alignItems: 'center',
        }}
      >
        {avatarWithStatus}
        <Typography
          variant="body2"
          sx={{
            ml: namePosition === 'right' ? 1 : 0,
            mt: namePosition === 'bottom' ? 0.5 : 0,
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {displayName}
        </Typography>
      </Box>
    );
  }
  
  // Default avatar with or without status and tooltip
  if (showTooltip) {
    return (
      <Tooltip title={displayName} arrow>
        {avatarWithStatus}
      </Tooltip>
    );
  }
  
  return avatarWithStatus;
};

export default UserAvatar;