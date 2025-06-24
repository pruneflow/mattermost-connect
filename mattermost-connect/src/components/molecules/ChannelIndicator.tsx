import React, { useMemo } from "react";
import { Box, SxProps, Theme } from '@mui/material';
import { TypingDots } from '../atoms/TypingDots';
import { UnreadBadge } from '../atoms/UnreadBadge';
import { useTypingEventsForChannel } from '../../hooks/useTypingEvents';

// Static styles extracted for performance
const STATIC_STYLES = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 'auto',
    height: '100%',
  } as const,
};

export interface ChannelIndicatorProps {
  channelId: string;
  hasUnreads?: boolean;
  unreadCount?: number;
  mentionCount?: number;
  sx?: SxProps<Theme>;
}
/**
 * ChannelIndicator component following Mattermost patterns
 * Shows either typing indicator or unread badge
 * Priority: typing indicator > unread badge
 * 
 * Based on the original ChannelIndicators from src-old-backup but adapted to new architecture
 */
export const ChannelIndicator: React.FC<ChannelIndicatorProps> = React.memo(({
  channelId,
  hasUnreads = false,
  unreadCount = 0,
  mentionCount = 0,
  sx
}) => {
  // Get typing status for this channel - ONLY typing events subscription
  const { isAnyoneTyping } = useTypingEventsForChannel(channelId);

  // Memoized styles with custom sx prop
  const containerStyles = useMemo(() => ({
    ...STATIC_STYLES.container,
    ...sx,
  }), [sx]);

  return (
    <Box sx={containerStyles}>
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
});

export default ChannelIndicator;