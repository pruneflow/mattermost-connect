import React from 'react';
import { Box, SvgIcon, SxProps, Theme } from '@mui/material';
import {
  Public as PublicIcon,
  Lock as PrivateIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Forum as ForumIcon,
} from '@mui/icons-material';
import type { Channel } from '../../api/types';

export interface ChannelIconProps {
  channel: Channel;
  size?: 'small' | 'medium' | 'large';
  color?: 'inherit' | 'primary' | 'secondary' | 'action' | 'disabled' | 'error';
  sx?: SxProps<Theme>;
}

/**
 * ChannelIcon component following Mattermost patterns
 * Displays appropriate icon based on channel type
 */
export const ChannelIcon: React.FC<ChannelIconProps> = ({
  channel,
  size = 'medium',
  color = 'inherit',
  sx
}) => {
  // Icon size mapping
  const sizeMap = {
    small: 16,
    medium: 20,
    large: 24,
  };

  const iconSize = sizeMap[size];

  // Get appropriate icon based on channel type
  const getChannelIcon = () => {
    switch (channel.type) {
      case 'O': // Open/Public channel
        return PublicIcon;
      case 'P': // Private channel
        return PrivateIcon;
      case 'D': // Direct message
        return PersonIcon;
      case 'G': // Group message
        return GroupIcon;
      default:
        return ForumIcon; // Fallback
    }
  };

  const IconComponent = getChannelIcon();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...sx,
      }}
    >
      <SvgIcon
        component={IconComponent}
        sx={{
          fontSize: iconSize,
          color: color === 'inherit' ? 'text.secondary' : `${color}.main`,
        }}
      />
    </Box>
  );
};

export default ChannelIcon;