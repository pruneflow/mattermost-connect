import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  SxProps,
  Theme,
  alpha,
} from '@mui/material';
import {
  StarBorder as StarIcon,
  Star as StarFilledIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
} from '@mui/icons-material';
import { ChannelIcon } from '../atoms/ChannelIcon';
import { ChannelMenu, type ChannelMenuOptions } from './ChannelMenu';
import { useAppSelector } from '../../hooks/useAppSelector';
import { isChannelFavorite, toggleFavorite, muteChannel } from '../../services/channelService';
import { selectCurrentUserId, selectIsChannelFavorite, selectMyChannelMember } from "../../store/selectors";
import { displayUsername } from '../../utils/userUtils';
import type { Channel, UserProfile } from '../../api/types';

export interface ChannelHeaderProps {
  channel: Channel & {
    // Enriched data from selectors (following Mattermost pattern)
    computedDisplayName?: string;
    otherUser?: UserProfile | null;
    otherUserId?: string;
  };
  menuOptions?: ChannelMenuOptions;
  sx?: SxProps<Theme>;
}

/**
 * ChannelHeader component following Mattermost patterns
 * Displays channel information and actions
 */
export const ChannelHeader: React.FC<ChannelHeaderProps> = ({
  channel,
  menuOptions,
  sx,
}) => {

  const channelMember = useAppSelector(selectMyChannelMember(channel.id));

  const isFavorite = useAppSelector(state => selectIsChannelFavorite(state, channel.id));


  // Use enriched channel data directly from selectors
  const title = channel.computedDisplayName || channel.display_name || 'Channel';
  const subtitle = channel.type === 'D' 
    ? (channel.otherUser?.username ? `@${channel.otherUser.username}` : 'Direct Message')
    : (channel.purpose || channel.header || (channel.type === 'G' ? 'Group Message' : 'Channel'));
  const isMuted = channelMember?.notify_props?.mark_unread === 'mention';

  // Stable handlers for favorite and mute actions
  const handleToggleFavorite = useCallback(() => {
    toggleFavorite(channel.id, isFavorite);
  }, [channel.id, isFavorite]);

  const handleMuteChannel = useCallback(() => {
    muteChannel(channel.id, !isMuted);
  }, [channel.id, isMuted]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        minHeight: 56,
        ...sx,
      }}
    >
      {/* Channel Icon */}
      <ChannelIcon
        channel={channel}
        size="medium"
        sx={{ mr: 1.5 }}
      />

      {/* Channel Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            {title}
          </Typography>
          
          {/* Channel Status Chips */}
          {isMuted && (
            <Chip
              icon={<NotificationsOffIcon />}
              label="Muted"
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.75rem' }}
            />
          )}
          
          {channel.type === 'P' && (
            <Chip
              label="Private"
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.75rem' }}
            />
          )}
        </Box>
        
        {subtitle && (
          <Typography
            variant="body2"
            noWrap
            sx={{
              color: 'text.secondary',
              fontSize: '0.8125rem',
              mt: 0.25,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      {/* Quick Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {/* Favorite Toggle */}
        <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
          <IconButton
            onClick={handleToggleFavorite}
            size="small"
            sx={{
              color: isFavorite ? 'warning.main' : 'action.active',
              '&:hover': {
                backgroundColor: alpha('#000', 0.04),
              },
            }}
          >
            {isFavorite ? <StarFilledIcon /> : <StarIcon />}
          </IconButton>
        </Tooltip>

        {/* Mute Toggle */}
        <Tooltip title={isMuted ? 'Unmute channel' : 'Mute channel'}>
          <IconButton
            onClick={handleMuteChannel}
            size="small"
            sx={{
              color: isMuted ? 'warning.main' : 'action.active',
              '&:hover': {
                backgroundColor: alpha('#000', 0.04),
              },
            }}
          >
            {isMuted ? <NotificationsOffIcon /> : <NotificationsIcon />}
          </IconButton>
        </Tooltip>

        {/* More Actions Menu */}
        <ChannelMenu 
          channelId={channel.id}
          size="small"
          options={menuOptions}
          placement="left"
          sx={{
            color: 'action.active',
            '&:hover': {
              backgroundColor: alpha('#000', 0.04),
            },
          }}
        />
      </Box>

    </Box>
  );
};

export default ChannelHeader;