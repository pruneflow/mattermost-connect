import React, { memo, useMemo } from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { replaceCustomEmojis, extractCustomEmojis } from '../../utils/messageFormatUtils';

/**
 * Composant pour rendre les emojis personnalisés dans un texte
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
  // Remplacer les emojis personnalisés par des images
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