import React, { memo, useMemo } from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { highlightMentions, extractMentions } from '../../utils/mentionUtils';
import { useAppSelector } from '../../hooks/useAppSelector';

/**
 * Composant pour surligner les mentions dans un texte
 */

interface MentionHighlighterProps {
  text: string;
  currentUserId: string;
  channelMemberIds?: string[];
  sx?: SxProps<Theme>;
}

export const MentionHighlighter: React.FC<MentionHighlighterProps> = memo(({
  text,
  currentUserId,
  channelMemberIds = [],
  sx,
}) => {
  const users = useAppSelector((state) => state.entities.users.profiles);
  
  // Extraire et traiter les mentions
  const processedText = useMemo(() => {
    if (!text) return '';
    
    const mentions = extractMentions(text);
    if (mentions.length === 0) return text;
    
    return highlightMentions(text, currentUserId, users, channelMemberIds);
  }, [text, currentUserId, users, channelMemberIds]);
  
  return (
    <Box
      className="mention-highlighter"
      sx={sx}
      dangerouslySetInnerHTML={{ __html: processedText }}
    />
  );
});

MentionHighlighter.displayName = 'MentionHighlighter';