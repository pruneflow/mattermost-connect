import React, { memo, useMemo } from 'react';
import { Box, Typography, Chip, SxProps, Theme, useTheme } from '@mui/material';
import { useAppSelector } from '../../hooks/useAppSelector';
import { displayUsername } from '../../utils/userUtils';

/**
 * Username display component with role badges
 * Shows user display name with colored badges for bot, admin, guest roles
 */

interface UsernameBadgeProps {
  userId: string;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}

// Static styles extracted outside component for performance
const STATIC_STYLES = {
  container: {
    display: 'flex',
    alignItems: 'center',
  } as const,
  
  username: {
    cursor: 'pointer',
    fontWeight: 600,
  } as const,
  
  badgeBase: {
    height: 16,
    fontSize: '0.625rem',
    fontWeight: 500,
    '& .MuiChip-label': {
      paddingLeft: 0,
      paddingRight: 0,
    },
  } as const,
} as const;

const getUserBadges = (user: any): string[] => {
  const badges: string[] = [];
  
  // Bot
  if (user.is_bot) {
    badges.push('bot');
  }
  
  if (user.roles && user.roles.includes('system_admin')) {
    badges.push('system_admin');
  }
  
  if (user.roles && user.roles.includes('team_admin')) {
    badges.push('admin');
  }
  
  if (user.roles && user.roles.includes('system_guest')) {
    badges.push('guest');
  }
  
  return badges;
};

const getBadgeLabel = (badgeType: string): string => {
  switch (badgeType) {
    case 'bot':
      return 'BOT';
    case 'admin':
      return 'ADMIN';
    case 'system_admin':
      return 'SYSTEM ADMIN';
    case 'guest':
      return 'GUEST';
    default:
      return badgeType.toUpperCase();
  }
};

export const UsernameBadge: React.FC<UsernameBadgeProps> = memo(({
  userId,
  onClick,
  sx,
}) => {
  const theme = useTheme();
  // Create stable selector to avoid inline function
  const selectUserProfile = useMemo(() => 
    (state: any) => state.entities.users.profiles[userId]
  , [userId]);
  
  const user = useAppSelector(selectUserProfile);
  
  // Memoized dynamic styles
  const dynamicStyles = useMemo(() => ({
    container: {
      ...STATIC_STYLES.container,
      ...sx,
    },
    
    username: {
      ...STATIC_STYLES.username,
      color: theme.palette.text.primary,
      transition: theme.transitions.create(['color'], {
        duration: theme.transitions.duration.short,
      }),
      
      '&:hover': {
        color: theme.palette.primary.main,
        textDecoration: 'underline',
      },
    },
    
    getBadgeStyles: (badgeType: string) => {
      const baseStyles = {
        ...STATIC_STYLES.badgeBase,
        marginLeft: theme.spacing(0.5),
        '& .MuiChip-label': {
          ...STATIC_STYLES.badgeBase['& .MuiChip-label'],
          paddingLeft: theme.spacing(0.5),
          paddingRight: theme.spacing(0.5),
        },
      };
      
      switch (badgeType) {
        case 'bot':
          return {
            ...baseStyles,
            backgroundColor: theme.palette.info.main,
            color: theme.palette.info.contrastText,
          };
        case 'admin':
          return {
            ...baseStyles,
            backgroundColor: theme.palette.warning.main,
            color: theme.palette.warning.contrastText,
          };
        case 'system_admin':
          return {
            ...baseStyles,
            backgroundColor: theme.palette.error.main,
            color: theme.palette.error.contrastText,
          };
        case 'guest':
          return {
            ...baseStyles,
            backgroundColor: theme.palette.grey[500],
            color: theme.palette.grey[50],
          };
        default:
          return baseStyles;
      }
    },
  }), [theme, sx]);
  
  if (!user) {
    return (
      <Typography 
        variant="subtitle2" 
        sx={dynamicStyles.username}
      >
        Unknown User
      </Typography>
    );
  }
  
  const displayName = displayUsername(user, "full_name_nickname", true);
  const badges = getUserBadges(user);
  
  return (
    <Box sx={dynamicStyles.container}>
      <Typography
        variant="subtitle2"
        sx={dynamicStyles.username}
        onClick={onClick}
      >
        {displayName}
      </Typography>
      
      {badges.map((badge) => (
        <Chip
          key={badge}
          label={getBadgeLabel(badge)}
          size="small"
          sx={dynamicStyles.getBadgeStyles(badge)}
        />
      ))}
    </Box>
  );
});

UsernameBadge.displayName = 'UsernameBadge';