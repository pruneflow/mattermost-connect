import React, { memo } from 'react';
import { Box, Tooltip } from '@mui/material';
import { getEmojiStyle } from '../../utils/emojiMapping';
import { isSpriteSheetLoaded } from '../../utils/emojiCache';

interface EmojiSpriteProps {
  unified: string;
  shortName: string;
  sheetX: number;
  sheetY: number;
  size?: number;
  onSelect?: (unified: string, shortName: string) => void;
}

/**
 * Composant optimisé pour afficher un emoji à partir d'un sprite sheet
 * Basé sur l'approche utilisée par Mattermost
 */
const EmojiSprite = memo(({
  unified,
  shortName,
  sheetX,
  sheetY,
  size = 32, // Taille par défaut dans l'UI
  onSelect
}: EmojiSpriteProps) => {
  // Calculer le style CSS pour l'emoji avec l'URL du serveur en cours
  const emojiStyle = getEmojiStyle(sheetX, sheetY);
  
  // Scale factor pour adapter la taille originale du sprite à la taille demandée
  const scaleFactor = size / 64; // 64px est la taille originale dans le sprite
  
  // Vérifier si le sprite est chargé
  const isSpriteLoaded = true; // Forcer chargement
  
  // Gérer le clic sur l'emoji
  const handleClick = () => {
    if (onSelect) {
      // Convertir le code Unicode en caractère emoji
      try {
        const emojiChar = String.fromCodePoint(...unified.split('-').map(u => parseInt(`0x${u}`, 16)));
        onSelect(unified, shortName);
      } catch (e) {
        console.warn(`Erreur lors de la conversion du code emoji ${unified}:`, e);
        onSelect(unified, shortName);
      }
    }
  };
  
  return (
    <Tooltip title={shortName} placement="top">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: `${size}px`,
          height: `${size}px`,
          margin: '2px',
          cursor: onSelect ? 'pointer' : 'default',
          '&:hover': onSelect ? {
            backgroundColor: 'action.hover',
            borderRadius: '4px'
          } : {},
        }}
        onClick={handleClick}
      >
        <Box
          sx={{
            ...(isSpriteLoaded ? {
              backgroundImage: emojiStyle.backgroundImage,
              backgroundPosition: emojiStyle.backgroundPosition,
              backgroundSize: emojiStyle.backgroundSize,
              backgroundRepeat: 'no-repeat',
              width: `${EMOJI_SIZE}px`,
              height: `${EMOJI_SIZE}px`,
            } : { 
              width: `${size}px`, 
              height: `${size}px`,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }),
            // Appliquer le transform pour adapter la taille
            transform: isSpriteLoaded ? `scale(${scaleFactor})` : 'none',
            transformOrigin: 'center',
            // Utiliser le hardware acceleration pour une meilleure performance
            willChange: 'transform',
            backfaceVisibility: 'hidden'
          }}
          data-emoji-unified={unified}
        >
          {/* Fallback si le sprite n'est pas chargé */}
          {!isSpriteLoaded && (
            <Box
              component="span"
              sx={{
                fontSize: `${size * 0.8}px`, // Légèrement plus petit que le conteneur
                lineHeight: 1
              }}
            >
              {/* Essayer d'afficher l'emoji natif comme fallback */}
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
      </Box>
    </Tooltip>
  );
});

export default EmojiSprite;