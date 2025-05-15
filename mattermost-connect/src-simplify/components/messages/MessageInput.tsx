import React, { useState, useRef, useCallback } from 'react';
import { Box, IconButton, TextField, Popover } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { WebSocketSingleton } from '../../hooks/useWebSocket';
import { EmojiPickerMM } from '../common';
import SendIcon from '@mui/icons-material/Send';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import { preloadEmojiSpriteSheet, isSpriteSheetLoaded } from '../../utils/emojiCache';
import { EMOJI_SPRITE_URL } from '../../utils/emojiMapping';

// Précharger le sprite sheet des emojis au chargement du composant
if (typeof window !== 'undefined' && !isSpriteSheetLoaded()) {
  // Précharger le sprite sheet avec l'URL déjà configurée
  preloadEmojiSpriteSheet(EMOJI_SPRITE_URL);
}

export interface MessageInputProps {
  channelId: string;
  onSendMessage: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MessageInput = React.forwardRef<any, MessageInputProps>(({
  channelId,
  onSendMessage,
  placeholder = 'Écrivez un message...',
  disabled = false
}, ref) => {
  const [message, setMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isAuthenticated } = useAuth();

  // Handler pour l'envoi du message
  const handleSendMessage = useCallback(() => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && onSendMessage) {
      onSendMessage(trimmedMessage);
      setMessage('');
      
      // Reset typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [message, onSendMessage]);

  // Handler pour les changements dans l'input
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    // Envoyer événement de frappe seulement si authentifié et dans un canal
    if (isAuthenticated && channelId) {
      // Si premier caractère ou après un délai
      if (e.target.value.length === 1 || !typingTimeoutRef.current) {
        // Envoyer événement de frappe
        WebSocketSingleton.sendTypingEvent(channelId);
        
        // Configurer timeout pour éviter spam d'événements
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // Réinitialiser après 5 secondes
        typingTimeoutRef.current = setTimeout(() => {
          typingTimeoutRef.current = null;
        }, 5000);
      }
    }
  }, [isAuthenticated, channelId]);

  // Handler pour la touche Entrée
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Handler pour la sélection d'emoji
  const handleEmojiSelect = useCallback((emoji: string, emojiName: string) => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || 0;
      const end = inputRef.current.selectionEnd || 0;
      const newMessage = message.substring(0, start) + emoji + message.substring(end);
      
      setMessage(newMessage);
      
      // Focus l'input et positionne le curseur après l'emoji
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newCursorPos = start + emoji.length;
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 10);
    }
    
    // Fermer le picker
    setIsEmojiPickerOpen(false);
  }, [message]);

  // Toggle le picker d'emoji
  const toggleEmojiPicker = useCallback(() => {
    setIsEmojiPickerOpen(prev => !prev);
  }, []);

  // Exposer des méthodes via la ref
  React.useImperativeHandle(ref, () => ({
    resetAttachments: () => {
      // Méthode pour réinitialiser les pièces jointes (si besoin)
    },
    focusInput: () => {
      inputRef.current?.focus();
    }
  }));

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        width: '100%', 
        alignItems: 'center',
        p: 1,
        borderTop: '1px solid',
        borderColor: 'divider'
      }}
    >
      <TextField
        inputRef={inputRef}
        fullWidth
        multiline
        maxRows={3}
        placeholder={placeholder}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        variant="outlined"
        size="small"
        InputProps={{
          endAdornment: (
            <Box sx={{ display: 'flex' }}>
              <IconButton 
                ref={emojiButtonRef}
                onClick={toggleEmojiPicker}
                color={isEmojiPickerOpen ? 'primary' : 'default'}
                size="small"
              >
                <InsertEmoticonIcon />
              </IconButton>
            </Box>
          ),
        }}
        sx={{ mr: 1 }}
      />
      
      <IconButton 
        onClick={handleSendMessage} 
        color="primary"
        disabled={!message.trim() || disabled}
      >
        <SendIcon />
      </IconButton>
      
      <Popover
        open={isEmojiPickerOpen}
        anchorEl={emojiButtonRef.current}
        onClose={() => setIsEmojiPickerOpen(false)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <EmojiPickerMM onEmojiSelect={handleEmojiSelect} />
      </Popover>
    </Box>
  );
});

export { MessageInput };
export default MessageInput;