import React from 'react';
import { Box, Typography } from '@mui/material';
import { useWebSocket } from '../../hooks/useWebSocket';

interface ChannelTypingIndicatorProps {
  channelId: string;
  compact?: boolean;
}

/**
 * Indicateur de saisie compact pour être affiché dans la liste des canaux
 */
export function ChannelTypingIndicator({ channelId, compact = true }: ChannelTypingIndicatorProps) {
  // WebSocket hook pour récupérer les événements de saisie (utilisation du singleton partagé)
  const { typingEvents } = useWebSocket();
  console.debug("ChannelTypingIndicator: typingEvents reçus", typingEvents, "pour le canal", channelId);

  // Animation pour l'indicateur de saisie
  const typingAnimation = {
    '@keyframes blink': {
      '0%': { opacity: 0.2 },
      '20%': { opacity: 1 },
      '100%': { opacity: 0.2 },
    },
    animation: 'blink 1s infinite ease-in-out',
  };

  // Convertir channelId en string pour assurer une comparaison cohérente
  const channelIdStr = String(channelId);

  // Filtrer les événements de saisie pour ce canal
  const channelTypingEvents = typingEvents?.filter(event => {
    const eventChannelId = String(event.channel_id);
    return eventChannelId === channelIdStr;
  }) || [];

  // Si personne ne tape, ne rien afficher
  if (channelTypingEvents.length === 0) {
    return null;
  }

  // Récupérer les noms d'utilisateurs uniques qui tapent
  const uniqueUsernames = Array.from(
    new Set(channelTypingEvents.map(event => event.username))
  );

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