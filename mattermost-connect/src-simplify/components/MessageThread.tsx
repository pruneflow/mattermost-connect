import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Divider,
  CircularProgress,
  Avatar,
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Comment as CommentIcon,
  InsertDriveFile
} from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import { useThreadMessages } from '../hooks/useMessages';
import { useUser } from '../hooks/useUsers';
import { formatRelativeTime, formatUserName, getUserInitials, formatFileSize } from '../utils/formatters';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import MessageAttachment from './MessageAttachment';
import AttachmentPreview from './AttachmentPreview';
import Markdown from './Markdown';
import { Message } from '../api/types';

export interface MessageThreadProps {
  rootMessageId: string;
  channelId: string;
  currentUserId?: string;
  onClose: () => void;
  isMobile?: boolean; // To determine mobile vs desktop layout
  onMessageSent?: (message?: any) => void; // Callback for when a message is sent in the thread
}

export function MessageThread({
  rootMessageId = '',
  channelId,
  currentUserId,
  onClose,
  isMobile = true, // Default to mobile layout
  onMessageSent,
}: MessageThreadProps) {
  // References for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Référence pour accéder à l'input des messages et réinitialiser son état
  const messageInputRef = useRef<any>(null);

  // Get query client for manual cache updates
  const queryClient = useQueryClient();

  // State
  const [parentMessage, setParentMessage] = useState<Message | null>(null);
  const [showingAttachments, setShowingAttachments] = useState<boolean>(false);
  
  // Use our new useThreadMessages hook specifically designed for thread views
  const {
    parentMessage: threadParentMessage,
    threadMessages = [], // Provide default empty array
    isLoading,
    createReply,
    isReplying,
    refetch,
    threadKey: threadQueryKey  // Get the query key used internally by the hook
  } = useThreadMessages(rootMessageId, channelId);
  
  // Set parent message when it's loaded
  useEffect(() => {
    if (threadParentMessage) {
      setParentMessage(threadParentMessage);
    }
  }, [threadParentMessage]);

  // Reset attachments when channel or rootMessageId changes
  useEffect(() => {
    // Clear any attachment previews when changing context
    if (messageInputRef.current && messageInputRef.current.resetAttachments) {
      messageInputRef.current.resetAttachments();
    }

    // Reset attachments display state and vider notre liste locale
    setShowingAttachments(false);
    setCurrentAttachments([]);
  }, [channelId, rootMessageId]);
  
  // Get parent message author
  const { user: parentAuthor } = useUser(parentMessage?.user_id);
  
  // Scroll to bottom when new messages arrive or thread is loaded
  useEffect(() => {
    // Tentative de scroll uniquement quand les messages sont chargés
    if (!isLoading && threadMessages.length > 0) {
      // Première tentative immédiate
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }

      // Plusieurs tentatives avec des délais croissants
      [100, 300, 800].forEach(delay => {
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: delay > 300 ? 'smooth' : 'auto', block: 'end' });
          }
        }, delay);
      });
    }
  }, [isLoading, threadMessages.length]);

  // Scroll spécifique pour le chargement initial du thread
  useEffect(() => {
    if (rootMessageId && !isLoading && parentMessage) {
      // Scroll après un court délai pour s'assurer que tout est rendu
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
      }, 250);
    }
  }, [rootMessageId, isLoading, parentMessage]);
  
  // Generate avatar color based on username
  const getAvatarColor = (username?: string): string => {
    if (!username) return '#909090';
    
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }
    
    return color;
  };

  // State pour suivre les pièces jointes en temps réel
  const [currentAttachments, setCurrentAttachments] = useState<any[]>([]);

  // Fonction pour surveiller les changements d'attachements
  const handleAttachmentsChange = (files: any[]) => {
    console.debug(`MessageThread: Attachments updated`, {
      count: files.length,
      uploading: files.some(f => f.uploading),
      fileNames: files.map(f => f.file.name)
    });

    // Mise à jour de notre liste locale de fichiers
    setCurrentAttachments(files);

    // Mise à jour de l'état d'affichage
    setShowingAttachments(files.length > 0);
  };

  // Handle new reply sent
  const handleReplySent = (newMessage?: any) => {
    // If we received the newly created message, add it to our thread messages
    if (newMessage) {
      console.debug(`MessageThread: Adding new message to thread`, {
        messageId: newMessage.id,
        rootId: rootMessageId,
        timestamp: new Date().toISOString()
      });

      // Notify parent container about the new message (to update thread counts in message list)
      if (onMessageSent) {
        onMessageSent(newMessage);
      }

      // Réinitialiser explicitement les pièces jointes via la référence
      if (messageInputRef.current) {
        messageInputRef.current.resetAttachments();
      }

      // Masquer la zone d'attachements après envoi et vider notre liste locale
      setShowingAttachments(false);
      setCurrentAttachments([]);

      // Manually update the threadMessages state to avoid refetching
      // This gives an instant response while waiting for cache update
      // Ensure new messages are added in the correct order (by creation date)
      const updatedThreadMessages = Array.isArray(threadMessages)
        ? [...threadMessages, newMessage].sort((a, b) => a.create_at - b.create_at)
        : [newMessage];

      // Update the parent message reply count
      if (parentMessage) {
        // Clone to avoid direct mutation
        const updatedParentMessage = { ...parentMessage };
        // @ts-ignore - Dynamic property
        updatedParentMessage.reply_count = (updatedParentMessage.reply_count || 0) + 1;
        // @ts-ignore - Dynamic property
        updatedParentMessage.has_replies = true;

        // Update the parent message in the React Query cache
        queryClient.setQueryData(threadQueryKey, {
          parentMessage: updatedParentMessage,
          threadMessages: updatedThreadMessages
        });
      }
      
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'end'
          });
        }
      });

 

    } else {
      // If no message object was provided, use a more fluid approach

      // First scroll immediately for responsiveness
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'end'
          });
        }
      });

      // Then refetch data
      refetch().catch(error => {
        console.error('Error refetching thread messages:', error);
      });
    }
  };

  return (
    <Box 
      sx={{ 
        position: isMobile ? 'fixed' : 'relative',
        top: isMobile ? 0 : 'auto',
        right: isMobile ? 0 : 'auto',
        bottom: isMobile ? 0 : 'auto',
        width: isMobile ? '100%' : '100%',
        height: '100%',
        bgcolor: 'background.paper',
        borderLeft: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isMobile ? 1200 : 1,
        boxShadow: '-4px 0px 10px rgba(0, 0, 0, 0.15)',
        boxSizing: 'border-box',
      }}
    >
      {/* Thread Header */}
      <Box sx={{ 
        px: 3, 
        py: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: 'background.paper',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            onClick={onClose} 
            sx={{ mr: 1, display: { xs: 'flex', sm: 'none' } }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CommentIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Thread</Typography>
          </Box>
        </Box>
        <IconButton 
          onClick={onClose}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Thread Messages Container - Scrollable Area */}
      <Box sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // Container doesn't scroll
        position: 'relative',
      }}>
        {/* Zone overlay pour les previews d'attachements - positionnée de manière absolue */}
        <Box
          id="thread-attachments-overlay"
          sx={{
            position: 'absolute',
            bottom: 76, // Juste au-dessus de l'input
            left: 0,
            right: 0,
            zIndex: 30, // Au-dessus des messages mais en-dessous des menus
            display: 'flex',
            justifyContent: 'center',
            visibility: showingAttachments ? 'visible' : 'hidden',
            maxWidth: '100%',
            px: 2,
          }}
        >
          {/* Conteneur avec arrière-plan pour les attachements */}
          <Paper
            elevation={8}
            sx={{
              width: '100%',
              maxWidth: '500px',
              maxHeight: '250px',
              overflowY: 'auto',
              p: 1,
              bgcolor: 'background.paper',
              borderRadius: '8px 8px 0 0',
              pointerEvents: 'auto', // Pour permettre l'interaction avec les attachements
              display: 'flex',
              flexDirection: 'column',
            }}
            id="thread-attachments-container"
          >
            {/* Nous récupérerons les attachements directement du input */}
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Pièces jointes
            </Typography>
            <Box sx={{ maxHeight: '200px', overflowY: 'auto' }}>
              {/* L'élément AttachmentPreview sera ajouté ici en relation avec le MessageInput */}
              <div id="thread-attachments-content">
                {/* On crée un AttachmentPreview ici */}
                {showingAttachments && currentAttachments.length > 0 && (
                  <AttachmentPreview
                    files={currentAttachments}
                    variant="list"
                    onRemove={(file) => {
                      // Supprimer via la référence pour mettre à jour les états réels
                      if (messageInputRef.current && messageInputRef.current.removeAttachment) {
                        console.debug(`MessageThread: Removing attachment`, {
                          fileName: file.name
                        });
                        messageInputRef.current.removeAttachment(file);
                      }

                      // Mettre à jour notre liste locale pour un feedback visuel immédiat
                      const updatedAttachments = currentAttachments.filter(a => a.file.name !== file.name);
                      setCurrentAttachments(updatedAttachments);

                      // Masquer le container si c'était le dernier fichier
                      if (updatedAttachments.length === 0) {
                        setShowingAttachments(false);
                      }
                    }}
                  />
                )}
              </div>
            </Box>
          </Paper>
        </Box>

        {/* Scrollable Area for Messages */}
        <Box 
          sx={{ 
            flexGrow: 1,
            overflow: 'auto', // This element handles scrolling
            display: 'flex',
            flexDirection: 'column',
            px: 3,
            pt: 2,
            pb: 2,
            height: 'calc(100% - 76px)', // Height minus the input height
          }}
        >
          {/* Parent message */}
          {parentMessage ? (
            <Paper
              elevation={0}
              sx={{
                px: 2,
                py: 2,
                mb: 2,
                bgcolor: 'action.hover',
                borderRadius: 2,
                borderLeft: '4px solid',
                borderColor: 'primary.main',
              }}
            >
              {/* Author info with avatar */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    mr: 1,
                    bgcolor: getAvatarColor(parentAuthor?.username)
                  }}
                  src={parentAuthor?.profile_picture}
                >
                  {getUserInitials(parentAuthor)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2">
                    {formatUserName(parentAuthor)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatRelativeTime(parentMessage.create_at)}
                  </Typography>
                </Box>
              </Box>

              {/* Message content */}
              <Box sx={{ wordBreak: 'break-word', pl: 0.5 }}>
                <Markdown content={parentMessage.message} />
              </Box>

              {/* File attachments */}
              {parentMessage.file_ids && parentMessage.file_ids.length > 0 && (
                <MessageAttachment fileIds={parentMessage.file_ids} />
              )}

              {/* Reply count */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                mt: 1.5,
                color: 'text.secondary'
              }}>
                <Typography variant="body2">
                  {threadMessages.length === 0
                    ? 'No replies yet'
                    : threadMessages.length === 1
                      ? '1 reply'
                      : `${threadMessages.length} replies`}
                </Typography>
              </Box>
            </Paper>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {/* Separator */}
          <Divider sx={{ my: 2 }} />

          {/* Thread messages */}
          {isLoading && !threadMessages.length ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : threadMessages.length === 0 ? (
            <Box sx={{
              p: 3,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexGrow: 1,
              opacity: 0.7
            }}>
              <CommentIcon sx={{ fontSize: 48, mb: 2, color: 'text.secondary' }} />
              <Typography color="text.secondary" variant="body1" gutterBottom>
                No replies yet
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Start the conversation
              </Typography>
            </Box>
          ) : (
            <>
              {/* Thread replies - sorted by creation date (oldest first) */}
              {[...threadMessages]
                .sort((a, b) => a.create_at - b.create_at) // Sort chronologically (oldest to newest)
                .map(message => (
                <MessageList.MessageItem
                  key={message.id}
                  messageId={message.id}
                  userId={message.user_id}
                  content={message.message}
                  timestamp={message.create_at}
                  channelId={channelId}
                  reactions={message.props?.reactions}
                  isCurrentUser={currentUserId === message.user_id}
                  fileIds={message.file_ids}
                  sx={{
                    maxWidth: '100%',
                    ml:  0,
                    mr:  0,
                  }}    
                />
              ))}
            </>
          )}

          {/* Scroll target */}
          <div ref={messagesEndRef} style={{ height: 1 }} />
        </Box>

        {/* Input Container - Fixed at bottom */}
        <Box sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          flexShrink: 0, // Prevent from shrinking
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 10,
        }}>
          {/* Loading indicator for replying */}
          {isReplying && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                bgcolor: 'primary.main',
                opacity: 0.7,
                zIndex: 15,
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: '30%',
                  bgcolor: 'primary.light',
                  animation: 'loading 1.5s infinite ease-in-out',
                  '@keyframes loading': {
                    '0%': { transform: 'translateX(-100%)' },
                    '50%': { transform: 'translateX(400%)' },
                    '100%': { transform: 'translateX(-100%)' },
                  },
                }}
              />
            </Box>
          )}

          {/* Actual input with fixed height for stability */}
          <Box sx={{ p: 2, height: '76px' }}>
            <MessageInput
              ref={messageInputRef}
              channelId={channelId}
              replyToMessageId={rootMessageId}
              placeholder="Reply to thread..."
              onMessageSent={handleReplySent}
              isInThread={true}
              onAttachmentsChange={handleAttachmentsChange}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default MessageThread;