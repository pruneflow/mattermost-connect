import React, { memo, useMemo } from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { formatMessage } from '../../utils/messageFormatUtils';
import { replaceCustomEmojis } from '../../utils/messageFormatUtils';
import { highlightMentions } from '../../utils/mentionUtils';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectUserProfiles } from '../../store/selectors';

/**
 * Message formatter component for rendering message content
 * Handles markdown, mentions, emojis, and other message formatting
 */

interface MessageFormatterProps {
  message: string;
  currentUserId: string;
  channelMemberIds?: string[];
  customEmojis?: Record<string, string>;
  sx?: SxProps<Theme>;
}

export const MessageFormatter: React.FC<MessageFormatterProps> = memo(({
  message,
  currentUserId,
  channelMemberIds = [],
  customEmojis = {},
  sx,
}) => {
  const users = useAppSelector(selectUserProfiles);
  
  const formattedMessage = useMemo(() => {
    if (!message) return '';
    
    // 1. Convert markdown to HTML
    let html = formatMessage(message);
    
    html = replaceCustomEmojis(html, customEmojis);
    
    // 3. Highlight mentions
    html = highlightMentions(html, currentUserId, users, channelMemberIds);
    
    return html;
  }, [message, currentUserId, users, channelMemberIds, customEmojis]);
  
  return (
    <Box
      className="message-formatter"
      sx={sx}
      dangerouslySetInnerHTML={{ __html: formattedMessage }}
    />
  );
});

MessageFormatter.displayName = 'MessageFormatter';