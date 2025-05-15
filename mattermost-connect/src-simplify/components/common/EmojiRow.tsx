import React, { memo } from 'react';
import { Box } from '@mui/material';
import { EmojiData } from '../../utils/emojiData';
import EmojiCss from './EmojiCss';

interface EmojiRowProps { 
  emojis: EmojiData[], 
  onEmojiSelect: (emoji: string, name: string, unified: string) => void
}

/**
 * Composant optimisé pour afficher une ligne d'émojis dans le picker
 * Utilise l'approche CSS pour les sprites d'emoji
 */
const EmojiRow = memo(({ emojis, onEmojiSelect }: EmojiRowProps) => {
  const handleSelect = (unified: string, shortName: string) => {
    // Convertir le code unifié en emoji unicode
    try {
      const emojiChar = String.fromCodePoint(...unified.split('-').map(u => parseInt(`0x${u}`, 16)));
      onEmojiSelect(emojiChar, shortName, unified);
    } catch (e) {
      console.warn(`Erreur lors de la conversion de l'emoji ${unified}:`, e);
      onEmojiSelect('?', shortName, unified);
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'row',
        px: 1,
        justifyContent: 'flex-start'
      }}
    >
      {emojis.map((emoji, i) => (
        <EmojiCss
          key={`emoji-${emoji.unified}-${i}`}
          unified={emoji.unified}
          shortName={emoji.short_name}
          category={emoji.category}
          size={28} // Taille adaptée au picker
          onSelect={handleSelect}
        />
      ))}
    </Box>
  );
});

export default EmojiRow;