import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Tooltip,
  SxProps,
  Theme,
  alpha,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  StarBorder as StarIcon,
  Star as StarFilledIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Info as InfoIcon,
  PersonAdd as PersonAddIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { ChannelIcon } from '../atoms/ChannelIcon';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectCurrentUserId, selectMyChannelMember } from '../../store/selectors';
import { displayUsername } from '../../utils/userUtils';
import type { Channel, UserProfile } from '../../api/types';

export interface ChannelHeaderProps {
  channel: Channel & {
    // Enriched data from selectors (following Mattermost pattern)
    computedDisplayName?: string;
    otherUser?: UserProfile | null;
    otherUserId?: string;
  };
  onChannelInfo?: () => void;
  onAddMembers?: () => void;
  onChannelSettings?: () => void;
  onToggleFavorite?: () => void;
  onToggleMute?: () => void;
  sx?: SxProps<Theme>;
}

/**
 * ChannelHeader component following Mattermost patterns
 * Displays channel information and actions
 */
export const ChannelHeader: React.FC<ChannelHeaderProps> = ({
  channel,
  onChannelInfo,
  onAddMembers,
  onChannelSettings,
  onToggleFavorite,
  onToggleMute,
  sx,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const currentUserId = useAppSelector(selectCurrentUserId);
  const channelMember = useAppSelector(selectMyChannelMember(channel.id));

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Stable handlers for menu items
  const handleChannelInfo = useCallback(() => {
    handleMenuClose();
    if (onChannelInfo) onChannelInfo();
  }, [onChannelInfo, handleMenuClose]);

  const handleAddMembers = useCallback(() => {
    handleMenuClose();
    if (onAddMembers) onAddMembers();
  }, [onAddMembers, handleMenuClose]);

  const handleChannelSettings = useCallback(() => {
    handleMenuClose();
    if (onChannelSettings) onChannelSettings();
  }, [onChannelSettings, handleMenuClose]);

  // Use enriched channel data directly from selectors
  const title = channel.computedDisplayName || channel.display_name || 'Channel';
  const subtitle = channel.type === 'D' 
    ? (channel.otherUser?.username ? `@${channel.otherUser.username}` : 'Direct Message')
    : (channel.purpose || channel.header || (channel.type === 'G' ? 'Group Message' : 'Channel'));
  const isMuted = channelMember?.notify_props?.mark_unread === 'mention';
  const isFavorite = false; // TODO: Implement favorites when available

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
        {onToggleFavorite && (
          <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
            <IconButton
              onClick={onToggleFavorite}
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
        )}

        {/* Mute Toggle */}
        {onToggleMute && (
          <Tooltip title={isMuted ? 'Unmute channel' : 'Mute channel'}>
            <IconButton
              onClick={onToggleMute}
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
        )}

        {/* More Actions Menu */}
        <IconButton
          onClick={handleMenuOpen}
          size="small"
          sx={{
            color: 'action.active',
            '&:hover': {
              backgroundColor: alpha('#000', 0.04),
            },
          }}
        >
          <MoreVertIcon />
        </IconButton>
      </Box>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {onChannelInfo && (
          <MenuItem onClick={handleChannelInfo}>
            <InfoIcon sx={{ mr: 1, fontSize: 20 }} />
            Channel Info
          </MenuItem>
        )}
        
        {onAddMembers && channel.type !== 'D' && (
          <MenuItem onClick={handleAddMembers}>
            <PersonAddIcon sx={{ mr: 1, fontSize: 20 }} />
            Add Members
          </MenuItem>
        )}
        
        {onChannelSettings && channel.type !== 'D' && (
          <MenuItem onClick={handleChannelSettings}>
            <SettingsIcon sx={{ mr: 1, fontSize: 20 }} />
            Channel Settings
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default ChannelHeader;