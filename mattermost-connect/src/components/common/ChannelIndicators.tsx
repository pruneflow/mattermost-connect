import React from 'react';
import { Box } from '@mui/material';
import ChannelTypingIndicator from './ChannelTypingIndicator';
import { UnreadBadge } from './UnreadBadge';
import { useTypingEventsForChannel } from '../../hooks/useTypingEventsForChannel';

interface ChannelIndicatorsProps {
  channelId: string;
  unreadCount: number;
}

/**
 * Composant qui affiche soit l'indicateur de frappe, soit le badge de messages non lus
 * Priorité : typing indicator > unread badge
 */
export function ChannelIndicators({ channelId, unreadCount }: ChannelIndicatorsProps) {
  const { typingEvents } = useTypingEventsForChannel(channelId);
  
  // Vérifier s'il y a une activité de frappe
  const hasTypingActivity = typingEvents.length > 0;

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      minWidth: 'auto',
      height: '100%'
    }}>
      {/* Si quelqu'un tape, afficher l'indicateur de frappe */}
      {hasTypingActivity && <ChannelTypingIndicator channelId={channelId} />}
      
      {/* Sinon, si il y a des messages non lus, afficher le badge */}
      {!hasTypingActivity && unreadCount > 0 && (
        <UnreadBadge count={unreadCount} />
      )}
    </Box>
  );
}

export default ChannelIndicators;