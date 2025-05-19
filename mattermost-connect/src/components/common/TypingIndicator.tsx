import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTypingEventsForChannel } from '../../hooks/useTypingEventsForChannel';

export interface TypingIndicatorProps {
  channelId: string;
  typingUsers?: string[]; // Array of usernames who are typing
}

export function TypingIndicator({ channelId, typingUsers: typingUsersProp }: TypingIndicatorProps) {
  // State for typing status
  const [isVisible, setIsVisible] = useState(false);
  const [typingMessage, setTypingMessage] = useState('');
  

  // Get typing events for this channel
  const { typingEvents = []  } = useTypingEventsForChannel(channelId);
  const typingUsers = typingUsersProp || typingEvents.map(event => event.username);
    
  // Update typing state based on props
  useEffect(() => {
    if (typingUsers.length > 0) {
      setIsVisible(true);
      
      if (typingUsers.length === 1) {
        setTypingMessage(`${typingUsers[0]} is typing...`);
      } else if (typingUsers.length === 2) {
        setTypingMessage(`${typingUsers[0]} and ${typingUsers[1]} are typing...`);
      } else {
        setTypingMessage('Several people are typing...');
      }
      
      // Hide after a period of inactivity (5 seconds)
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [typingUsers]);
  
  // Mémoiser le filtrage des événements de saisie pour ce canal
  const uniqueUsernames = useMemo(() => {
    if (!typingEvents || !channelId) {
      return [];
    }
    
    // Convert channelId to string to ensure consistent comparison
    const channelIdStr = String(channelId);
    
    // Filter typing events for this channel
    const channelTypingEvents = typingEvents.filter(event => {
      const eventChannelId = String(event.channel_id);
      return eventChannelId === channelIdStr;
    });
    
    // Get unique usernames
    return Array.from(
      new Set(channelTypingEvents.map(event => event.username))
    );
  }, [typingEvents, channelId]);
  
  // Mettre à jour l'état de l'indicateur périodiquement plutôt qu'à chaque changement
  useEffect(() => {
    // Mettre à jour l'état seulement si nécessaire
    const updateTypingStatus = () => {
      if (uniqueUsernames.length > 0) {
        setIsVisible(true);
        
        if (uniqueUsernames.length === 1) {
          setTypingMessage(`${uniqueUsernames[0]} is typing...`);
        } else if (uniqueUsernames.length === 2) {
          setTypingMessage(`${uniqueUsernames[0]} and ${uniqueUsernames[1]} are typing...`);
        } else {
          setTypingMessage('Several people are typing...');
        }
      } else {
        setIsVisible(false);
      }
    };
    
    // Exécuter immédiatement
    updateTypingStatus();
    
    // Configurer un intervalle pour actualiser périodiquement, pas à chaque rendu
    const interval = setInterval(updateTypingStatus, 1000);
    
    return () => clearInterval(interval);
  }, [uniqueUsernames.length]);
  
  
  // Animation style for typing indicator
  const typingAnimation = {
    '@keyframes blink': {
      '0%': { opacity: 0.2 },
      '20%': { opacity: 1 },
      '100%': { opacity: 0.2 },
    },
    animation: 'blink 1s infinite ease-in-out',
  };
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <Box sx={{ position: 'relative', height: 30, mb: 0.5, width: '100%' }}>
      <Paper
        elevation={1}
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 16,
          right: 16,
          p: 1,
          borderRadius: '12px 12px 12px 4px',
          display: 'flex',
          alignItems: 'center',
          maxWidth: 'calc(100% - 32px)',
          transition: 'all 0.2s ease-in-out',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}
      >
        <Box sx={{ display: 'flex', mr: 1 }}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              mx: 0.25,
              ...typingAnimation,
              animationDelay: '0s',
            }}
          />
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              mx: 0.25,
              ...typingAnimation,
              animationDelay: '0.2s',
            }}
          />
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              mx: 0.25,
              ...typingAnimation,
              animationDelay: '0.4s',
            }}
          />
        </Box>
        <Typography 
          variant="body2" 
          color="primary"
          sx={{ 
            fontWeight: 500,
            fontSize: '0.85rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease'
          }}
        >
          {typingMessage}
        </Typography>
      </Paper>
    </Box>
  );
}

export default TypingIndicator;