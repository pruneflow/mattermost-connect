import React from 'react';
import { Box, Typography, ButtonBase } from '@mui/material';
import { UserAvatar, StatusBadge } from '../atoms';
import { displayUsername } from '../../utils/userUtils';
import type { UserProfile, UserStatus } from '../../api/types';
import type { SxProps, Theme } from '@mui/material';

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
  const gap = { 
    xs: size === 'small' ? 0.75 : size === 'medium' ? 1 : 1.5,
    sm: size === 'small' ? 1 : size === 'medium' ? 1.5 : 2
  };
  const padding = { 
    xs: size === 'small' ? 0.75 : size === 'medium' ? 1 : 1.5,
    sm: size === 'small' ? 1 : size === 'medium' ? 1.5 : 2
  };

  const content = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap,
        p: padding,
        borderRadius: 1.5,
        width: '100%',
        ...sx
      }}
    >
      <UserAvatar userId={user.id} size={size} />
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 0.25, 
        flex: 1, 
        minWidth: 0 
      }}>
        <Typography
          variant={size === 'small' ? 'body2' : size === 'medium' ? 'body1' : 'h6'}
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {displayUsername(user, 'full_name')}
        </Typography>
        
        <Typography
          variant={size === 'small' ? 'caption' : 'body2'}
          sx={{
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          @{user.username}
        </Typography>
        
        {showEmail && user.email && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.disabled',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {user.email}
          </Typography>
        )}
      </Box>
      
      {showStatus && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <StatusBadge status={status} size={size === 'large' ? 'md' : 'sm'} />
        </Box>
      )}
    </Box>
  );

  if (onClick) {
    return (
      <ButtonBase
        className={className}
        onClick={onClick}
        sx={{
          borderRadius: 1.5,
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
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