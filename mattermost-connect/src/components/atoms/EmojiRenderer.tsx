import React, { memo, useMemo } from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { replaceCustomEmojis, extractCustomEmojis } from '../../utils/messageFormatUtils';

/**
 * Emoji renderer component for processing and displaying custom emojis
 * Replaces emoji syntax in text with actual emoji images
 */

interface EmojiRendererProps {
  text: string;
  customEmojis?: Record<string, string>;
  sx?: SxProps<Theme>;
}

export const EmojiRenderer: React.FC<EmojiRendererProps> = memo(({
  text,
  customEmojis = {},
  sx,
}) => {
  const processedText = useMemo(() => {
    if (!text) return '';
    
    const customEmojiNames = extractCustomEmojis(text);
    if (customEmojiNames.length === 0) return text;
    
    return replaceCustomEmojis(text, customEmojis);
  }, [text, customEmojis]);
  
  return (
    <Box
      className="emoji-renderer"
      sx={sx}
      dangerouslySetInnerHTML={{ __html: processedText }}
    />
  );
});

EmojiRenderer.displayName = 'EmojiRenderer';