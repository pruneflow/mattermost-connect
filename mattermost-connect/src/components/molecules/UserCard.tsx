/**
 * User card component displaying user profile information with avatar and status
 * Supports different sizes and optional click handling for user selection
 */
import React, { useMemo } from 'react';
import { Box, Typography, ButtonBase } from '@mui/material';
import { UserAvatar, StatusBadge } from '../atoms';
import { displayUsername } from '../../utils/userUtils';
import type { UserProfile, UserStatus } from '../../api/types';
import type { SxProps, Theme } from '@mui/material';

// Static styles extracted for performance
const STATIC_STYLES = {
  container: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: 1.5,
    width: '100%',
  } as const,
  
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.25,
    flex: 1,
    minWidth: 0,
  } as const,
  
  userName: {
    fontWeight: 600,
    color: 'text.primary',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  
  username: {
    color: 'text.secondary',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  
  email: {
    color: 'text.disabled',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
  } as const,
  
  buttonBase: {
    borderRadius: 1.5,
    '&:hover': {
      backgroundColor: 'action.hover',
    },
  } as const,
};

export interface UserCardProps {
  user: UserProfile;
  status?: UserStatus['status'];
  showStatus?: boolean;
  showEmail?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  className?: string;
  sx?: SxProps<Theme>;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  status = 'offline',
  showStatus = true,
  showEmail = false,
  size = 'medium',
  onClick,
  className,
  sx
}) => {
  // Memoized styles based on size
  const styles = useMemo(() => {
    const gap = { 
      xs: size === 'small' ? 0.75 : size === 'medium' ? 1 : 1.5,
      sm: size === 'small' ? 1 : size === 'medium' ? 1.5 : 2
    };
    const padding = { 
      xs: size === 'small' ? 0.75 : size === 'medium' ? 1 : 1.5,
      sm: size === 'small' ? 1 : size === 'medium' ? 1.5 : 2
    };
    
    return {
      container: {
        ...STATIC_STYLES.container,
        gap,
        p: padding,
        ...sx,
      },
      
      userNameVariant: size === 'small' ? 'body2' as const : size === 'medium' ? 'body1' as const : 'h6' as const,
      usernameVariant: size === 'small' ? 'caption' as const : 'body2' as const,
      statusBadgeSize: size === 'large' ? 'md' as const : 'sm' as const,
    };
  }, [size, sx]);

  const content = (
    <Box sx={styles.container}>
      <UserAvatar userId={user.id} size={size} />
      
      <Box sx={STATIC_STYLES.userInfo}>
        <Typography variant={styles.userNameVariant} sx={STATIC_STYLES.userName}>
          {displayUsername(user, 'full_name')}
        </Typography>
        
        <Typography variant={styles.usernameVariant} sx={STATIC_STYLES.username}>
          @{user.username}
        </Typography>
        
        {showEmail && user.email && (
          <Typography variant="caption" sx={STATIC_STYLES.email}>
            {user.email}
          </Typography>
        )}
      </Box>
      
      {showStatus && (
        <Box sx={STATIC_STYLES.statusContainer}>
          <StatusBadge status={status} size={styles.statusBadgeSize} />
        </Box>
      )}
    </Box>
  );

  if (onClick) {
    return (
      <ButtonBase
        className={className}
        onClick={onClick}
        sx={STATIC_STYLES.buttonBase}
      >
        {content}
      </ButtonBase>
    );
  }

  return (
    <Box className={className}>
      {content}
    </Box>
  );
};

export default UserCard;