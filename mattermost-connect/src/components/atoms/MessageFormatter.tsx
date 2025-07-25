import React, { memo, useMemo } from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { formatMessage } from '../../utils/messageFormatUtils';
import { replaceCustomEmojis } from '../../utils/messageFormatUtils';
import { highlightMentions } from '../../utils/mentionUtils';
import { useAppSelector } from '../../hooks/useAppSelector';

/**
 * Composant pour formater et rendre le contenu d'un message avec markdown, mentions, emojis
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
  const users = useAppSelector((state) => state.entities.users.profiles);
  
  // Formatage du message en plusieurs étapes
  const formattedMessage = useMemo(() => {
    if (!message) return '';
    
    // 1. Convertir le markdown en HTML
    let html = formatMessage(message);
    
    // 2. Remplacer les emojis personnalisés
    html = replaceCustomEmojis(html, customEmojis);
    
    // 3. Surligner les mentions
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