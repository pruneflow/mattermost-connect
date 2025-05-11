import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useWebSocket } from '../../hooks/useWebSocket';

export interface TypingIndicatorProps {
  channelId: string;
  typingUsers?: string[]; // Array of usernames who are typing
}

export function TypingIndicator({ channelId, typingUsers = [] }: TypingIndicatorProps) {
  // State for typing status
  const [isVisible, setIsVisible] = useState(false);
  const [typingMessage, setTypingMessage] = useState('');
  
  // WebSocket hook
  const { typingEvents, sendTypingEvent } = useWebSocket();
  
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
  
  // Update typing state based on WebSocket events
  useEffect(() => {
    if (!typingEvents || !channelId) return;
    
    // Filter typing events for this channel
    const channelTypingEvents = typingEvents.filter(event => 
      event.channel_id === channelId
    );
    
    // Get unique usernames
    const uniqueUsernames = Array.from(
      new Set(channelTypingEvents.map(event => event.username))
    );
    
    if (uniqueUsernames.length > 0) {
      setIsVisible(true);
      
      if (uniqueUsernames.length === 1) {
        setTypingMessage(`${uniqueUsernames[0]} is typing...`);
      } else if (uniqueUsernames.length === 2) {
        setTypingMessage(`${uniqueUsernames[0]} and ${uniqueUsernames[1]} are typing...`);
      } else {
        setTypingMessage('Several people are typing...');
      }
      
      // Hide after a period of inactivity (2.5 seconds)
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, [typingEvents, channelId]);
  
  // Send typing event when user is typing in this channel
  const notifyTyping = () => {
    if (channelId && sendTypingEvent) {
      sendTypingEvent(channelId);
    }
  };
  
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
    <Box sx={{ position: 'relative', height: 30, mb: 0.5 }}>
      <Paper
        elevation={0}
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 16,
          p: 1,
          borderRadius: 2,
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          maxWidth: '80%',
        }}
      >
        <Box sx={{ display: 'flex', mr: 1 }}>
          <Box
            sx={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              bgcolor: 'text.secondary',
              mx: 0.25,
              ...typingAnimation,
              animationDelay: '0s',
            }}
          />
          <Box
            sx={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              bgcolor: 'text.secondary',
              mx: 0.25,
              ...typingAnimation,
              animationDelay: '0.2s',
            }}
          />
          <Box
            sx={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              bgcolor: 'text.secondary',
              mx: 0.25,
              ...typingAnimation,
              animationDelay: '0.4s',
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {typingMessage}
        </Typography>
      </Paper>
    </Box>
  );
}

export default TypingIndicator;