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

export interface ChannelItemProps {
  channel: Channel & {
    isActive?: boolean;
    hasUnreads?: boolean;
    unreadCount?: number;
    mentionCount?: number;
    isMuted?: boolean;
    // Enriched data from selectors (following Mattermost pattern)
    computedDisplayName?: string;
    otherUser?: UserProfile | null;
    otherUserId?: string;
  };
  onClick?: (channelId: string) => void;
  compact?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * ChannelItem component following Mattermost sidebar patterns
 * Displays channel with icon, name, and indicators (typing/unread)
 */
export const ChannelItem: React.FC<ChannelItemProps> = ({
  channel,
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

  // Channel name style based on state
  const getNameStyle = () => {
    if (channel.isActive) {
      return {
        fontWeight: 600,
        color: 'primary.main',
      };
    }
    if (channel.hasUnreads && !channel.isMuted) {
      return {
        fontWeight: 600,
        color: 'text.primary',
      };
    }
    if (channel.isMuted) {
      return {
        fontWeight: 400,
        color: 'text.disabled',
      };
    }
    return {
      fontWeight: 400,
      color: 'text.secondary',
    };
  };

  return (
    <ListItem
      disablePadding
      sx={{
        '& .MuiListItemButton-root': {
          borderRadius: 1,
          margin: '1px 8px',
          minHeight: compact ? 28 : 32,
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
        ...sx,
      }}
    >
      <ListItemButton
        selected={channel.isActive}
        onClick={handleClick}
        sx={{
          py: compact ? 0.25 : 0.5,
          px: 1,
        }}
      >
        {/* Channel Icon or User Avatar for Direct Channels */}
        <ListItemIcon
          sx={{
            minWidth: compact ? 20 : 24,
            mr: 1,
            position: 'relative',
          }}
        >
          {channel.type === 'D' && channel.otherUser ? (
            <UserAvatar
              userId={channel.otherUser.id}
              size="small"
              showStatus={true}
            />
          ) : (
            <ChannelIcon
              channel={channel}
              size={compact ? 'small' : 'medium'}
              color={channel.isActive ? 'inherit' : 'action'}
            />
          )}
        </ListItemIcon>

        {/* Channel Name */}
        <ListItemText
          primary={
            <Typography
              variant={compact ? 'body2' : 'body1'}
              noWrap
              sx={{
                fontSize: compact ? '0.8125rem' : '0.875rem',
                lineHeight: compact ? 1.2 : 1.4,
                ...getNameStyle(),
              }}
            >
              {displayName}
            </Typography>
          }
          sx={{
            margin: 0,
            '& .MuiListItemText-primary': {
              fontSize: 'inherit',
            },
          }}
        />

        {/* Channel Indicator (Typing or Unread) */}
        <Box sx={{ ml: 'auto', pl: 1 }}>
          <ChannelIndicator channelId={channel.id} />
        </Box>
      </ListItemButton>
    </ListItem>
  );
};

export default ChannelItem;