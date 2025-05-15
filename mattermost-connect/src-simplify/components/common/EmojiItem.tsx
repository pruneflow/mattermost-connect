import React, { memo, useState, useEffect } from 'react';
import { Box, Tooltip } from '@mui/material';
import { getEmojiStyle } from '../../utils/emojiMapping';
import { isSpriteSheetLoaded, addSpriteLoadedListener } from '../../utils/emojiCache';

// Constantes
const EMOJI_SIZE = 28; // Taille de chaque emoji dans l'UI

// Interface de propriétés du composant
interface EmojiItemProps {
  emoji: { 
    emoji?: string, 
    name: string, 
    unified: string,
    short_name?: string,
    short_names?: string[],
    sheet_x: number,
    sheet_y: number
  };
  onSelect: (emoji: string, name: string, unified: string) => void;
  size?: number;
}

// Composant optimisé pour afficher un emoji avec le sprite sheet
const EmojiItem = memo(({ emoji, onSelect, size = EMOJI_SIZE }: EmojiItemProps) => {
  const { unified, name, short_name, sheet_x, sheet_y } = emoji;
  const displayName = short_name || name;
  
  // État pour suivre si le sprite est chargé
  const [isSpriteLoaded, setIsSpriteLoaded] = useState(isSpriteSheetLoaded());
  
  // S'abonner aux événements de chargement du sprite
  useEffect(() => {
    if (!isSpriteLoaded) {
      const handleSpriteLoaded = () => {
        setIsSpriteLoaded(true);
      };
      
      addSpriteLoadedListener(handleSpriteLoaded);
    }
  }, [isSpriteLoaded]);
  
  // Calculer le style CSS pour l'emoji basé sur sa position dans le sprite
  // Utiliser l'URL du serveur fournie globalement (pas besoin de préciser à chaque fois)
  const emojiStyle = getEmojiStyle(sheet_x, sheet_y);
  
  // Scale factor pour adapter la taille
  const scaleFactor = size / 64; // Le sprite original fait 64px
  
  // Gérer le clic
  const handleClick = () => {
    // Déterminer le caractère emoji à partir du code unifié si disponible
    // Sinon, utiliser la propriété emoji si elle existe
    let emojiChar = '';
    if (unified) {
      try {
        // Convertir le code Unicode en caractère emoji
        emojiChar = String.fromCodePoint(...unified.split('-').map(u => parseInt(`0x${u}`, 16)));
      } catch (e) {
        // Fallback à la propriété emoji si disponible
        emojiChar = emoji.emoji || '';
      }
    }
    
    onSelect(
      emojiChar,
      displayName,
      unified
    );
  };
  
  return (
    <Tooltip title={displayName} placement="top">
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          width: `${size}px`,
          height: `${size}px`,
          m: 0.5,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'action.hover',
            borderRadius: '4px'
          }
        }}
        onClick={handleClick}
      >
        {isSpriteLoaded ? (
          <Box 
            sx={{ 
              ...emojiStyle,
              transform: `scale(${scaleFactor})`,
              transformOrigin: 'center',
              // Utiliser hardware acceleration pour de meilleures performances
              willChange: 'transform',
              backfaceVisibility: 'hidden'
            }}
            data-emoji-unified={unified}
          />
        ) : (
          <Box 
            component="span" 
            sx={{
              fontSize: `${size * 0.8}px`,
              lineHeight: 1
            }}
          >
            {/* Afficher l'emoji natif comme fallback */}
            {(() => {
              try {
                return String.fromCodePoint(...unified.split('-').map(u => parseInt(`0x${u}`, 16)));
              } catch (e) {
                return '?'; // Fallback si l'emoji ne peut pas être affiché
              }
            })()}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
});

export default EmojiItem;