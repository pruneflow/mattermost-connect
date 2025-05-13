import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTypingEventsForChannel } from '../../hooks/useTypingEventsForChannel';

interface ChannelTypingIndicatorProps {
  channelId: string;
  compact?: boolean;
}

/**
 * Indicateur de saisie compact pour être affiché dans la liste des canaux
 */
export function ChannelTypingIndicator({ channelId, compact = true }: ChannelTypingIndicatorProps) {
  // Hook spécialisé qui ne récupère et ne s'abonne qu'aux événements de ce canal spécifique
  const { typingEvents } = useTypingEventsForChannel(channelId);
  
  // Log seulement quand il y a des événements (pour éviter les logs constants)
  if (typingEvents.length > 0) {
    console.debug("ChannelTypingIndicator: événements de frappe détectés pour le canal", channelId, typingEvents);
  }

  // Animation pour l'indicateur de saisie
  const typingAnimation = {
    '@keyframes blink': {
      '0%': { opacity: 0.2 },
      '20%': { opacity: 1 },
      '100%': { opacity: 0.2 },
    },
    animation: 'blink 1s infinite ease-in-out',
  };

  // Récupérer les noms d'utilisateurs uniques qui tapent
  // Plus besoin de filtrer car le hook ne retourne déjà que les événements pour ce canal
  const uniqueUsernames = Array.from(
    new Set(typingEvents.map(event => event.username))
  );

  // Si personne ne tape, ne rien afficher
  if (uniqueUsernames.length === 0) {
    return null;
  }

  return (
    <Box 
      sx={{ 
        display: 'flex',
        alignItems: 'center',
        ml: 1,
        height: compact ? 16 : 24
      }}
    >
      {/* Indicateur visuel (points animés) */}
      <Box sx={{ display: 'flex', mr: 0.5 }}>
        <Box
          sx={{
            width: compact ? 3 : 4,
            height: compact ? 3 : 4,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            mx: '1px',
            ...typingAnimation,
            animationDelay: '0s',
          }}
        />
        <Box
          sx={{
            width: compact ? 3 : 4,
            height: compact ? 3 : 4,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            mx: '1px',
            ...typingAnimation,
            animationDelay: '0.2s',
          }}
        />
        <Box
          sx={{
            width: compact ? 3 : 4,
            height: compact ? 3 : 4,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            mx: '1px',
            ...typingAnimation,
            animationDelay: '0.4s',
          }}
        />
      </Box>

      {/* Texte uniquement si ce n'est pas le mode compact */}
      {!compact && (
        <Typography
          variant="caption"
          color="primary"
          noWrap
          sx={{
            fontSize: '0.7rem',
            maxWidth: 80,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {uniqueUsernames.length === 1
            ? `${uniqueUsernames[0]} is typing...`
            : `${uniqueUsernames.length} people typing...`}
        </Typography>
      )}
    </Box>
  );
}

export default ChannelTypingIndicator;