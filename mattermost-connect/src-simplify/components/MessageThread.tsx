import React, { useEffect, useRef, useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Divider, 
  CircularProgress,
  Button,
  Avatar,
  Tooltip
} from '@mui/material';
import { 
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Comment as CommentIcon
} from '@mui/icons-material';
import { useThreadMessages } from '../hooks/useMessages';
import { useUser } from '../hooks/useUsers';
import { formatRelativeTime, formatUserName, getUserInitials } from '../utils/formatters';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import MessageAttachment from './MessageAttachment';
import Markdown from './Markdown';
import { Message } from '../api/types';

export interface MessageThreadProps {
  rootMessageId: string;
  channelId: string;
  currentUserId?: string;
  onClose: () => void;
  isMobile?: boolean; // To determine mobile vs desktop layout
}

// Define the keyframes animation for the loading bar
const loadingAnimation = `
@keyframes loading {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(400%);
  }
  100% {
    transform: translateX(-100%);
  }
}
`;

export function MessageThread({ 
  rootMessageId = '', 
  channelId, 
  currentUserId,
  onClose,
  isMobile = true, // Default to mobile layout
}: MessageThreadProps) {
  // State
  const [parentMessage, setParentMessage] = useState<Message | null>(null);
  
  // Get thread messages - this will include both thread messages and parent message
  console.debug(`MessageThread: fetching thread for rootMessageId=${rootMessageId}, channelId=${channelId}`, {
    isMobile,
    currentTime: new Date().toISOString(),
    initialRender: true,
  });
  
  
  if (!rootMessageId) {
    console.error("MessageThread: No valid rootMessageId provided, thread loading will fail");
  }
  
  console.log(`MessageThread component rendering with rootId=${rootMessageId} channelId=${channelId}`, {
    isMobile,
    parentMessageInfo: 'Will be fetched from useThreadMessages',
  });

  // Use our new useThreadMessages hook specifically designed for thread views
  const { 
    parentMessage: threadParentMessage, 
    threadMessages = [], // Provide default empty array
    isLoading, 
    createReply,
    isReplying,
    refetch
  } = useThreadMessages(rootMessageId, channelId);
  
  // Set parent message when it's loaded
  useEffect(() => {
    console.debug(`MessageThread: Effect runs with threadParentMessage:`, threadParentMessage);
    if (threadParentMessage) {
      setParentMessage(threadParentMessage);
    }
  }, [threadParentMessage]);
  
  // Get parent message author
  const { user: parentAuthor } = useUser(parentMessage?.user_id);
  
  // UI references
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom on first load
  useEffect(() => {
    if (!isLoading && threadMessages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLoading, threadMessages.length]);
  
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

  const replyToThread = async (message: string) => {
    if (!message.trim()) return;
    
    try {
      console.debug(`MessageThread: Sending reply to thread`, {
        channelId,
        rootMessageId,
        messageLength: message.trim().length,
        timestamp: new Date().toISOString()
      });
      
      // Create the reply
      const newReply = await createReply({
        message: message.trim(),
        fileIds: []
      });
      
      console.debug(`MessageThread: Successfully sent thread reply`, {
        replyId: newReply?.id,
        timestamp: new Date().toISOString(),
        threadMessagesCount: threadMessages.length + 1
      });
      
      // Scroll to bottom after sending
      // Note: We no longer need to refetch since the cache is updated automatically
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      console.error('Failed to send reply:', error);
    }
  };

  // Handle new reply sent - called by MessageInput component when a message is sent
  const handleReplySent = () => {
    // Just scroll to bottom after message is sent - the cache is updated automatically
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <Box 
      sx={{ 
        // Different positioning based on mobile vs desktop
        position: isMobile ? 'fixed' : 'relative',
        top: isMobile ? 0 : 'auto',
        right: isMobile ? 0 : 'auto',
        bottom: isMobile ? 0 : 'auto',
        // Width constraints as required
        width: isMobile 
          ? { xs: '100%' }
          : { 
              xs: '100%',
              sm: '100%', // Use full width of container
            },
        height: isMobile ? '100%' : '100%',
        bgcolor: 'background.paper',
        borderLeft: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isMobile ? 1200 : 1, // Lower z-index for desktop as it's part of the normal flow
        boxShadow: '-4px 0px 10px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.3s ease', // Smooth transition when opening/closing
        pt: '64px', // Add padding top to prevent being hidden under the app bar
        boxSizing: 'border-box', // Ensure padding is included in the height calculation
      }}
      // Add the CSS keyframes animation
      component="div"
      sx={{
        '@global': {
          '@keyframes loading': {
            '0%': {
              transform: 'translateX(-100%)',
            },
            '50%': {
              transform: 'translateX(400%)',
            },
            '100%': {
              transform: 'translateX(-100%)',
            },
          },
        },
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
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)', // Subtle shadow for depth
        flexShrink: 0, // Don't allow the header to shrink
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

      {/* Main content container - exactly matches MessageList structure */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        height: 'calc(100% - 64px)', // Full height minus header
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Thread messages area - scrollable */}
        <Box 
          sx={{ 
            height: 'calc(100% - 76px)', // Full height minus input area
            overflowY: 'auto',
            px: 3,
            pt: 4,
            pb: 2,
            boxSizing: 'border-box',
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

          <Divider sx={{ my: 2 }} />

          {/* Thread messages */}
          <Box ref={threadContainerRef}>
            {/* Initial loading state */}
            {isLoading && !threadMessages.length && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            
            {/* No replies yet */}
            {!isLoading && threadMessages.length === 0 && (
              <Box sx={{
                p: 3,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
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
            )}

            {/* Thread messages */}
            {threadMessages.map(message => (
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
              />
            ))}

            <div ref={messagesEndRef} />
          </Box>
        </Box>

        {/* Message Input - Fixed at bottom */}
        <Box sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          height: '76px', // Fixed height
          boxSizing: 'border-box',
        }}>
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
                zIndex: 10
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: '30%',
                  bgcolor: 'primary.light',
                  animation: 'loading 1.5s infinite ease-in-out'
                }}
              />
            </Box>
          )}
          <MessageInput
            channelId={channelId}
            replyToMessageId={rootMessageId}
            placeholder="Reply to thread..."
            onMessageSent={handleReplySent}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default MessageThread;