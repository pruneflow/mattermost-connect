import React, { memo, useEffect, useState } from 'react';
import { Box, Tooltip } from '@mui/material';

// Types
interface EmojiCssProps {
  unified: string;
  shortName: string;
  category: string;
  size?: number;
  onSelect?: (unified: string, shortName: string) => void;
}

/**
 * Composant optimisé pour afficher un emoji en utilisant les classes CSS de Mattermost
 * Basé sur l'approche CSS utilisée par Mattermost
 */
const EmojiCss = memo(({
  unified,
  shortName,
  category,
  size = 32, // Taille par défaut dans l'UI
  onSelect
}: EmojiCssProps) => {
  const [loaded, setLoaded] = useState(false);
  
  // S'assurer que le fichier CSS est chargé
  useEffect(() => {
    // Vérifier si le lien CSS est déjà présent
    const cssId = 'emoji-sprite-styles';
    if (!document.getElementById(cssId) && typeof window !== 'undefined') {
      const head = document.getElementsByTagName('head')[0];
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.type = 'text/css';
      // Utiliser le chemin absolu à partir de la racine pour la compatibilité avec les différents environnements
      link.href = '/assets/emoji-sprites/emoji-styles.css';
      link.onload = () => setLoaded(true);
      head.appendChild(link);
    } else {
      setLoaded(true);
    }
  }, []);
  
  // Convertir l'emoji unifié en caractère emoji pour le fallback
  const getEmojiChar = () => {
    try {
      return String.fromCodePoint(...unified.split('-').map(u => parseInt(`0x${u}`, 16)));
    } catch (e) {
      console.warn(`Erreur lors de la conversion du code emoji ${unified}:`, e);
      return '?';
    }
  };
  
  // Gérer le clic sur l'emoji
  const handleClick = () => {
    if (onSelect) {
      onSelect(unified, shortName);
    }
  };
  
  // Construire les classes CSS
  const emojiClasses = [
    'emojisprite',
    `emoji-category-${category}`,
    `emoji-${unified.toLowerCase()}`
  ].join(' ');
  
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
        {loaded ? (
          <div 
            className={emojiClasses}
            data-emoji-unified={unified}
            style={{
              transformOrigin: 'center',
              // Ajuster l'échelle pour la taille souhaitée
              transform: `scale(${size / 66})` // 66px est la taille de base dans le CSS
            }}
          />
        ) : (
          // Fallback si le CSS n'est pas chargé
          <Box
            component="span"
            sx={{
              fontSize: `${size * 0.8}px`, // Légèrement plus petit que le conteneur
              lineHeight: 1
            }}
          >
            {getEmojiChar()}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
});

export default EmojiCss;