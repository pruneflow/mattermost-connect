import React, { useMemo } from 'react';
import { Box, SvgIcon, SxProps, Theme } from '@mui/material';
import {
  Public as PublicIcon,
  Lock as PrivateIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Forum as ForumIcon,
} from '@mui/icons-material';
import type { Channel } from '../../api/types';

// Static configuration extracted for performance  
const SIZE_MAP = {
  small: 16,
  medium: 20,
  large: 24,
} as const;

const CHANNEL_ICON_MAP: Record<string, typeof PublicIcon> = {
  'O': PublicIcon,   // Open/Public channel
  'P': PrivateIcon,  // Private channel
  'D': PersonIcon,   // Direct message
  'G': GroupIcon,    // Group message
};

const STATIC_STYLES = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
};

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
  // Memoized icon component and styles
  const { IconComponent, styles } = useMemo(() => {
    const iconSize = SIZE_MAP[size];
    const IconComponent = CHANNEL_ICON_MAP[channel.type] || ForumIcon;
    
    return {
      IconComponent,
      styles: {
        container: {
          ...STATIC_STYLES.container,
          ...sx,
        },
        icon: {
          fontSize: iconSize,
          color: color === 'inherit' ? 'text.secondary' : `${color}.main`,
        },
      },
    };
  }, [channel.type, size, color, sx]);

  return (
    <Box sx={styles.container}>
      <SvgIcon component={IconComponent} sx={styles.icon} />
    </Box>
  );
};

export default ChannelIcon;