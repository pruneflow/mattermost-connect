import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { TypingDots } from '../atoms/TypingDots';
import { UnreadBadge } from '../atoms/UnreadBadge';
import { useTypingEventsForChannel } from '../../hooks/useTypingEvents';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectChannelById } from '../../store/selectors';
import type { EnrichedChannel } from '../../store/selectors';

export interface ChannelIndicatorProps {
  channelId: string;
  sx?: SxProps<Theme>;
}

/**
 * ChannelIndicator component following Mattermost patterns
 * Shows either typing indicator or unread badge
 * Priority: typing indicator > unread badge
 * 
 * Based on the original ChannelIndicators from src-old-backup but adapted to new architecture
 */
export const ChannelIndicator: React.FC<ChannelIndicatorProps> = ({
  channelId,
  sx
}) => {
  // Get typing status for this channel
  const { isAnyoneTyping } = useTypingEventsForChannel(channelId);
  
  // Get channel with all data
  const channel: EnrichedChannel | null = useAppSelector(selectChannelById(channelId));
  const hasUnreads = channel?.hasUnreads || false;
  const unreadCount = channel?.unreadCount || 0;
  const mentionCount = channel?.mentionCount || 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 'auto',
        height: '100%',
        ...sx,
      }}
    >
      {/* Priority 1: If someone is typing, show typing indicator */}
      {isAnyoneTyping && (
        <TypingDots size="small" />
      )}
      
      {/* Priority 2: If no typing and has unreads, show unread badge */}
      {!isAnyoneTyping && hasUnreads && (
        <UnreadBadge 
          count={unreadCount} 
          mentions={mentionCount}
          size="sm"
        />
      )}
    </Box>
  );
};

export default ChannelIndicator;