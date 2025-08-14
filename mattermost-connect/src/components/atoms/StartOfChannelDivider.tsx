import React, { memo, useMemo } from 'react';
import { Box, Typography, SxProps, Theme, useTheme } from '@mui/material';
import { Channel } from '../../api/types';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectCurrentChannel } from '../../store/selectors';

/**
 * Start of channel divider component showing channel beginning marker
 * Displays channel icon, name, description following Mattermost patterns
 */

interface StartOfChannelDividerProps {
  sx?: SxProps<Theme>;
}

// Static styles extracted outside component for performance
const STATIC_STYLES = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  } as const,
  
  channelIcon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
  } as const,
  
  channelName: {
    fontSize: '1.25rem',
    fontWeight: 600,
  } as const,
  
  channelDescription: {
    fontSize: '0.875rem',
    maxWidth: 400,
    lineHeight: 1.5,
  } as const,
} as const;

const getChannelIcon = (channelType: string): string => {
  switch (channelType) {
    case 'O': // Open channel
      return '#';
    case 'P': // Private channel
      return '🔒';
    case 'D': // Direct message
      return '@';
    case 'G': // Group message
      return '👥';
    default:
      return '#';
  }
};

const getChannelTypeDescription = (channelType: string, displayName: string): string => {
  switch (channelType) {
    case 'O':
      return `This is the beginning of the ${displayName} channel.`;
    case 'P':
      return `This is the beginning of the private ${displayName} channel.`;
    case 'D':
      return `This is the beginning of your direct message history with ${displayName}.`;
    case 'G':
      return `This is the beginning of your group message history.`;
    default:
      return `This is the beginning of the ${displayName} channel.`;
  }
};

export const StartOfChannelDivider: React.FC<StartOfChannelDividerProps> = memo(({
  sx,
}) => {
  const theme = useTheme();
  const channel = useAppSelector(selectCurrentChannel);
  
  // Return null if no channel (shouldn't happen but safety check)
  if (!channel) return null;
  
  const channelIcon = getChannelIcon(channel.type);
  const description = getChannelTypeDescription(channel.type, channel.display_name);
  
  // Memoized dynamic styles
  const dynamicStyles = useMemo(() => ({
    container: {
      ...STATIC_STYLES.container,
      padding: theme.spacing(4, 2),
      margin: theme.spacing(2, 0),
      
      // Responsive padding
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(3, 1.5),
        margin: theme.spacing(1.5, 0),
      },
      
      ...sx,
    },
    
    channelIcon: {
      ...STATIC_STYLES.channelIcon,
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      marginBottom: theme.spacing(2),
      
      // Responsive size
      [theme.breakpoints.down('sm')]: {
        width: 48,
        height: 48,
        fontSize: '1.5rem',
        marginBottom: theme.spacing(1.5),
      },
    },
    
    channelName: {
      ...STATIC_STYLES.channelName,
      color: theme.palette.text.primary,
      marginBottom: theme.spacing(1),
      
      // Responsive font size
      [theme.breakpoints.down('sm')]: {
        fontSize: '1.125rem',
      },
    },
    
    channelDescription: {
      ...STATIC_STYLES.channelDescription,
      color: theme.palette.text.secondary,
      
      // Responsive font size
      [theme.breakpoints.down('sm')]: {
        fontSize: '0.8125rem',
        maxWidth: 300,
      },
    },
    
    channelPurpose: {
      ...STATIC_STYLES.channelDescription,
      color: theme.palette.text.secondary,
      marginTop: theme.spacing(1),
      fontStyle: 'italic',
      
      // Responsive font size
      [theme.breakpoints.down('sm')]: {
        fontSize: '0.8125rem',
        maxWidth: 300,
      },
    },
  }), [theme, sx]);
  
  return (
    <Box
      className="start-of-channel-divider"
      sx={dynamicStyles.container}
      role="separator"
      aria-label={`Beginning of ${channel.display_name} channel`}
    >
      <Box sx={dynamicStyles.channelIcon}>
        {channelIcon}
      </Box>
      
      {/* Channel name */}
      <Typography
        variant="h6"
        sx={dynamicStyles.channelName}
      >
        {channel.display_name}
      </Typography>
      
      {/* Description */}
      <Typography
        variant="body2"
        sx={dynamicStyles.channelDescription}
      >
        {description}
      </Typography>
      
      {channel.purpose && (
        <Typography
          variant="body2"
          sx={dynamicStyles.channelPurpose}
        >
          {channel.purpose}
        </Typography>
      )}
    </Box>
  );
});

StartOfChannelDivider.displayName = 'StartOfChannelDivider';