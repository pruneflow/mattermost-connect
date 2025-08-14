import React, { memo, useMemo } from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { formatMessage } from '../../utils/messageFormatUtils';
import { highlightMentions } from '../../utils/mentionUtils';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectCurrentUserId, selectUserProfiles } from "../../store/selectors";

/**
 * Message formatter component for rendering message content
 * Handles markdown, mentions, emojis, and other message formatting
 */

interface MessageFormatterProps {
  message: string;
  sx?: SxProps<Theme>;
}

export const MessageFormatter: React.FC<MessageFormatterProps> = memo(({
  message,
  sx,
}) => {
  const users = useAppSelector(selectUserProfiles);
  const currentUserId = useAppSelector(selectCurrentUserId);
  
  const formattedMessage = useMemo(() => {
    if (!message) return '';
    
    let html = formatMessage(message);
    html = highlightMentions(html, currentUserId || '', users, []);
    
    return html;
  }, [message, currentUserId, users]);
  
  return (
    <Box
      className="message-formatter"
      sx={{
        ...sx,
        // Ensure proper containment and styling for code blocks
        '& pre': {
          backgroundColor: 'action.hover',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          padding: 1,
          margin: '8px 0',
          overflow: 'auto',
          maxWidth: '100%',
          position: 'relative',
          zIndex: 1,
        },
        '& code': {
          backgroundColor: 'action.hover',
          borderRadius: 0.5,
          padding: '2px 4px',
          fontSize: '0.875em',
          fontFamily: 'monospace',
        },
        '& pre code': {
          backgroundColor: 'transparent',
          padding: 0,
          borderRadius: 0,
        },
        '& a': {
          textDecoration: 'underline',
          fontWeight: 500,
          '&:hover': {
            opacity: 0.8,
          },
        },
        // Prevent content overflow
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      }}
      dangerouslySetInnerHTML={{ __html: formattedMessage }}
    />
  );
});

MessageFormatter.displayName = 'MessageFormatter';