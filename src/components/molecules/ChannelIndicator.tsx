/**
 * Channel indicator components for showing typing status and unread counts
 * Manages priority display: typing indicators > unread badges > muted states
 */
import React, { useMemo } from "react";
import { Box, SxProps, Theme } from '@mui/material';
import { NotificationsOff } from '@mui/icons-material';
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

interface IndicatorProps {
  channelId: string;
  hasUnreads?: boolean;
  unreadCount?: number;
  mentionCount?: number;
  sx?: SxProps<Theme>;
}

/**
 * Indicator component - the original logic for typing/unread badges
 * Shows either typing indicator or unread badge
 * Priority: typing indicator > unread badge
 */
const Indicator: React.FC<IndicatorProps> = React.memo(({
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

export interface ChannelIndicatorProps {
  channelId: string;
  hasUnreads?: boolean;
  unreadCount?: number;
  mentionCount?: number;
  isMuted?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * ChannelIndicator component - wrapper that handles muted state
 * If muted: shows mention badge (if any) with disabled styling
 * If not muted: shows normal Indicator (typing/unread badges)
 */
export const ChannelIndicator: React.FC<ChannelIndicatorProps> = React.memo(({
  channelId,
  hasUnreads = false,
  unreadCount = 0,
  mentionCount = 0,
  isMuted = false,
  sx
}) => {
  // Memoized styles with custom sx prop
  const containerStyles = useMemo(() => ({
    ...STATIC_STYLES.container,
    ...sx,
  }), [sx]);

  if (isMuted) {
    return (
      <Box sx={containerStyles}>
        {/* If muted with mentions: show disabled mention badge */}
        {mentionCount > 0 && (
          <UnreadBadge 
            count={0} 
            mentions={mentionCount}
            size="sm"
            disabled={true}
          />
        )}
      </Box>
    );
  }

  // Not muted: show normal Indicator (typing priority, then badges)
  return (
    <Indicator
      channelId={channelId}
      hasUnreads={hasUnreads}
      unreadCount={unreadCount}
      mentionCount={mentionCount}
      sx={sx}
    />
  );
});

export default ChannelIndicator;