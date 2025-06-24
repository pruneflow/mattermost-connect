import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  SxProps,
  Theme,
  alpha,
} from '@mui/material';
import { ChannelIcon } from '../atoms/ChannelIcon';
import { UserAvatar } from '../atoms/UserAvatar';
import { ChannelIndicator } from './ChannelIndicator';
import type { Channel, UserProfile } from '../../api/types';

// Static styles extracted outside component for performance
const STATIC_STYLES = {
  listItem: {
    '& .MuiListItemButton-root': {
      borderRadius: 1,
      margin: '1px 8px',
      '&:hover': {
        backgroundColor: alpha('#000', 0.04),
      },
      '&.Mui-selected': {
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        '&:hover': {
          backgroundColor: 'primary.dark',
        },
        '& .MuiListItemIcon-root': {
          color: 'primary.contrastText',
        },
        '& .MuiTypography-root': {
          color: 'primary.contrastText',
        },
      },
    },
  } as const,
  
  listItemText: {
    margin: 0,
    '& .MuiListItemText-primary': {
      fontSize: 'inherit',
    },
  } as const,
  
  channelIndicatorBox: {
    ml: 'auto',
    pl: 1,
  } as const,
  
  listItemButton: {
    px: 1,
  } as const,
  
  listItemIcon: {
    mr: 1,
    position: 'relative',
  } as const,
};

export interface ChannelItemProps {
  channel: Channel & {
    hasUnreads?: boolean;
    unreadCount?: number;
    mentionCount?: number;
    isMuted?: boolean;
    // Enriched data from selectors (following Mattermost pattern)
    computedDisplayName?: string;
    otherUser?: UserProfile | null;
    otherUserId?: string;
  };
  isActive?: boolean;
  onClick?: (channelId: string) => void;
  compact?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * ChannelItem component following Mattermost sidebar patterns
 * Displays channel with icon, name, and indicators (typing/unread)
 */
export const ChannelItem: React.FC<ChannelItemProps> = React.memo(({
  channel,
  isActive = false,
  onClick,
  compact = false,
  sx,
}) => {
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(channel.id);
    }
  }, [onClick, channel.id]);

  // Get display name (computed by selector following Mattermost pattern)
  const displayName = channel.computedDisplayName || channel.display_name;

  // Memoized dynamic styles based on props
  const dynamicStyles = useMemo(() => ({
    listItem: {
      ...STATIC_STYLES.listItem,
      '& .MuiListItemButton-root': {
        ...STATIC_STYLES.listItem['& .MuiListItemButton-root'],
        minHeight: compact ? 28 : 32,
      },
      ...sx,
    },
    
    listItemButton: {
      ...STATIC_STYLES.listItemButton,
      py: compact ? 0.25 : 0.5,
    },
    
    listItemIcon: {
      ...STATIC_STYLES.listItemIcon,
      minWidth: compact ? 20 : 24,
    },
    
    typography: {
      fontSize: compact ? '0.8125rem' : '0.875rem',
      lineHeight: compact ? 1.2 : 1.4,
      fontWeight: isActive ? 600 : 
                 (channel.hasUnreads && !channel.isMuted) ? 600 : 400,
      color: isActive ? 'primary.main' :
             (channel.hasUnreads && !channel.isMuted) ? 'text.primary' :
             channel.isMuted ? 'text.disabled' : 'text.secondary',
    },
  }), [compact, sx, isActive, channel.hasUnreads, channel.isMuted]);

  return (
    <ListItem
      disablePadding
      sx={dynamicStyles.listItem}
    >
      <ListItemButton
        selected={isActive}
        onClick={handleClick}
        sx={dynamicStyles.listItemButton}
      >
        {/* Channel Icon or User Avatar for Direct Channels */}
        <ListItemIcon
          sx={dynamicStyles.listItemIcon}
        >
          {channel.type === 'D' && channel.otherUser ? (
            <UserAvatar
              userId={channel.otherUser.id}
              size="medium"
              showStatus={true}
            />
          ) : (
            <ChannelIcon
              channel={channel}
              size={compact ? 'small' : 'medium'}
              color={isActive ? 'inherit' : 'action'}
            />
          )}
        </ListItemIcon>

        {/* Channel Name */}
        <ListItemText
          primary={
            <Typography
              variant={compact ? 'body2' : 'body1'}
              noWrap
              sx={dynamicStyles.typography}
            >
              {displayName}
            </Typography>
          }
          sx={STATIC_STYLES.listItemText}
        />

        {/* Channel Indicator (Typing or Unread) */}
        <Box sx={STATIC_STYLES.channelIndicatorBox}>
          <ChannelIndicator 
            channelId={channel.id}
            hasUnreads={channel.hasUnreads}
            unreadCount={channel.unreadCount}
            mentionCount={channel.mentionCount}
          />
        </Box>
      </ListItemButton>
    </ListItem>
  );
});

export default ChannelItem;