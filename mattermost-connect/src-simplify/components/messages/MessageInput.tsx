import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, InputBase, IconButton, CircularProgress, Tooltip } from '@mui/material';
import { Send as SendIcon, AttachFile as AttachFileIcon, EmojiEmotions as EmojiIcon } from '@mui/icons-material';
import { useMessages } from '../../hooks/useMessages';
import { useWebSocket } from '../../hooks/useWebSocket';
import TypingIndicator from '../common/TypingIndicator';
import AttachmentPreview from './AttachmentPreview';

export interface MessageInputProps {
  channelId: string;
  replyToMessageId?: string;
  placeholder?: string;
  onMessageSent?: (message?: any) => void;
  onCancelReply?: () => void;
  isInThread?: boolean; // Pour appliquer des styles spécifiques en contexte de thread
  onAttachmentsChange?: (files: FileStatus[]) => void; // Pour informer le parent des changements d'attachements
}

interface FileStatus {
  file: File;
  uploading: boolean;
  uploaded: boolean;
  fileId?: string;
  url?: string;
}

export const MessageInput = React.forwardRef(({
  channelId,
  replyToMessageId,
  placeholder = 'Type a message...',
  onMessageSent,
  onCancelReply,
  isInThread = false,
  onAttachmentsChange
}: MessageInputProps, ref: React.ForwardedRef<{
  resetAttachments: () => void;
  getCurrentAttachments: () => FileStatus[];
  removeAttachment: (file: File) => void;
}>) => {
  // Local state
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<FileStatus[]>([]);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expose des méthodes pour manipuler les pièces jointes
  React.useImperativeHandle(ref, () => ({
    resetAttachments: () => {
      setUploadedFileIds([]);
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      console.debug('MessageInput: Attachments reset via ref');

      // Informer le parent du changement
      if (onAttachmentsChange) {
        onAttachmentsChange([]);
      }
    },
    getCurrentAttachments: () => {
      return attachments;
    },
    removeAttachment: (file: File) => {
      handleRemoveAttachment(file);
    }
  }));

  // Notifier le parent quand l'état des attachements change
  useEffect(() => {
    if (onAttachmentsChange) {
      onAttachmentsChange(attachments);
    }
  }, [attachments, onAttachmentsChange]);
  
  // Get message actions
  const { createMessage, uploadFile, isCreating } = useMessages(channelId);
  
  // Get WebSocket for typing indicators (utilisation du singleton partagé)
  const { typingEvents, sendTypingEvent } = useWebSocket();
  
  // Get typing users for this channel
  const typingUsers = typingEvents
    ? typingEvents
        .filter(event => event.channel_id === channelId)
        .map(event => event.username)
    : [];
  
  // Handle text input change
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };
  
  // Debounce typing notifications to avoid spamming
  useEffect(() => {
    let typingTimer: NodeJS.Timeout;
    let debounceTimer: NodeJS.Timeout;
    
    // Fonction pour envoyer l'événement de saisie avec debounce
    const notifyTyping = () => {
      if (sendTypingEvent && channelId) {
        // Annuler le timer précédent
        if (debounceTimer) clearTimeout(debounceTimer);
        
        // Créer un nouveau timer debounce pour limiter les événements
        debounceTimer = setTimeout(() => {
          sendTypingEvent(channelId);
        }, 300); // Debounce de 300ms pour réduire les notifications
      }
    };
    
    if (message.trim().length > 0) {
      // Envoyer la notification avec debounce
      notifyTyping();
      
      // Configurer un intervalle pour envoyer périodiquement des événements
      typingTimer = setInterval(() => {
        if (message.trim().length > 0) {
          notifyTyping();
        }
      }, 3000); // Réduire la fréquence des mises à jour
    }
    
    return () => {
      // Nettoyer tous les timers
      if (typingTimer) clearInterval(typingTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [message, channelId, sendTypingEvent]);
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!message.trim() && uploadedFileIds.length === 0) return;
    
    try {
      const messageText = message.trim();
      const fileIds = uploadedFileIds.length > 0 ? uploadedFileIds : undefined;
      
      // Debug message sending, especially for thread replies
      if (replyToMessageId) {
        console.debug(`MessageInput: Sending reply to thread`, {
          channelId,
          replyToMessageId,
          messageLength: messageText.length,
          hasAttachments: !!fileIds
        });
      }
      
      // Store message before clearing to avoid state issues
      const messageToSend = messageText;
      const fileIdsToSend = fileIds;
      
      // Clear input before sending to avoid state issues
      // when quickly sending messages in a thread
      setMessage('');
      
      // Create the message with the correct parameters
      const createdMessage = await createMessage({
        channel_id: channelId,
        message: messageToSend,
        root_id: replyToMessageId,
        file_ids: fileIdsToSend,
      });

      // Log successful message send
      console.debug(`MessageInput: Message sent successfully`, {
        channelId,
        wasThreadReply: !!replyToMessageId,
        timestamp: new Date().toISOString()
      });

      // Reset all related states
      setUploadedFileIds([]);
      setAttachments([]);

      // Notify parent that message was sent with a slight delay to ensure all cache updates are complete
      if (onMessageSent) {
        // Add a short delay to ensure state is updated properly
        setTimeout(() => {
          console.debug(`MessageInput: Calling onMessageSent after delay`, {
            timestamp: new Date().toISOString(),
            isThreadReply: !!replyToMessageId
          });
          onMessageSent(createdMessage);
        }, 50);
      }
      
      // If was a reply, clear the reply context with a slight delay to prevent race conditions
      if (replyToMessageId && onCancelReply) {
        setTimeout(() => {
          onCancelReply();
        }, 100);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };
  
  // Handle file selection button click
  const handleFileButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      const fileIds: string[] = [];
      const newAttachments: FileStatus[] = [];
      
      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Add to attachments with uploading status
        const fileStatus: FileStatus = {
          file,
          uploading: true,
          uploaded: false
        };
        
        newAttachments.push(fileStatus);
        setAttachments(prev => [...prev, fileStatus]);
        
        // Upload the file
        const fileInfo = await uploadFile(file);
        fileIds.push(fileInfo.id);
        
        // Update attachment status
        setAttachments(prev => 
          prev.map(item => 
            item.file === file 
              ? { ...item, uploading: false, uploaded: true, fileId: fileInfo.id } 
              : item
          )
        );
      }
      
      // Store uploaded file IDs
      setUploadedFileIds(prev => [...prev, ...fileIds]);
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setIsUploading(false);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle removing an attachment
  const handleRemoveAttachment = (file: File) => {
    // Find the attachment to remove
    const attachmentToRemove = attachments.find(a => a.file === file);
    
    if (attachmentToRemove) {
      // Remove from uploadedFileIds if it was uploaded
      if (attachmentToRemove.uploaded && attachmentToRemove.fileId) {
        setUploadedFileIds(prev => prev.filter(id => id !== attachmentToRemove.fileId));
      }
      
      // Remove from attachments list
      setAttachments(prev => prev.filter(a => a.file !== file));
    }
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Show typing indicator if anyone is typing */}
      <TypingIndicator
        channelId={channelId}
        typingUsers={typingUsers}
      />

      {/* Show attachment previews if there are any - différents affichages selon le contexte */}
      {attachments.length > 0 && !isInThread && (
        <Box
          sx={{
            width: '100%',
            maxHeight: '200px',
            overflowY: 'auto',
            mb: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper'
          }}
        >
          <AttachmentPreview
            files={attachments}
            onRemove={handleRemoveAttachment}
            variant="grid" // Utilisation de la variante en grille pour l'affichage normal
          />
        </Box>
      )}

      {/* Pour le thread, nous utilisons la zone spéciale d'overlay */}
      {attachments.length > 0 && isInThread && document.getElementById('thread-attachments-content') && (
        <>{/* L'affichage des attachements est géré par le parent */}</>
      )}

      <Paper
        elevation={3}
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 2,
        }}
      >
      {/* File upload button */}
      <Tooltip title="Attach files">
        <IconButton 
          color="primary" 
          onClick={handleFileButtonClick}
          disabled={isUploading || isCreating}
        >
          {isUploading ? <CircularProgress size={24} /> : <AttachFileIcon />}
        </IconButton>
      </Tooltip>
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        multiple
      />
      
      {/* Emoji button (placeholder) */}
      <Tooltip title="Add emoji">
        <IconButton color="primary">
          <EmojiIcon />
        </IconButton>
      </Tooltip>
      
      {/* Message input */}
      <InputBase
        sx={{ ml: 1, flex: 1 }}
        placeholder={placeholder}
        value={message}
        onChange={handleMessageChange}
        onKeyPress={handleKeyPress}
        multiline
        maxRows={4}
        disabled={isCreating}
      />
      
      {/* Send button */}
      <Tooltip title="Send message">
        <IconButton 
          color="primary" 
          onClick={handleSendMessage}
          disabled={(!message.trim() && uploadedFileIds.length === 0) || isCreating}
        >
          {isCreating ? <CircularProgress size={24} /> : <SendIcon />}
        </IconButton>
      </Tooltip>
    </Paper>
  </Box>
  );
});

export default MessageInput;