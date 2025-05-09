import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import MessageThread from './MessageThread';
import { useMessages } from '../hooks/useMessages';

export interface MessageContainerProps {
  channelId: string;
  currentUserId?: string;
  showInput?: boolean;
  showThread?: boolean;
  threadMessageId?: string;
  onThreadClose?: () => void;
}

/**
 * A unified container component that manages message list, input, and thread views
 * with responsive layout handling between desktop and mobile
 */
export function MessageContainer({
  channelId,
  currentUserId,
  showInput = true,
  showThread = true,
  threadMessageId: externalThreadMessageId,
  onThreadClose
}: MessageContainerProps) {
  // Theme for responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Internal state
  const [replyToMessageId, setReplyToMessageId] = useState<string | undefined>(undefined);
  const [threadMessageId, setThreadMessageId] = useState<string | undefined>(externalThreadMessageId);
  const containerRef = useRef<HTMLDivElement>(null);
  const mainInputRef = useRef<any>(null);
  
  // View channel service call
  const { viewChannel } = useMessages(channelId);
  
  // Get message service for the current channel
  const messageService = useMessages(channelId);

  // Handle reply to message
  const handleReplyMessage = useCallback((messageId: string) => {
    setReplyToMessageId(messageId);
  }, []);

  // Handle cancel reply
  const handleCancelReply = useCallback(() => {
    setReplyToMessageId(undefined);
  }, []);

  // Handle thread message sent - refresh main message list to update thread counts
  const handleThreadMessageSent = useCallback((message?: any) => {
    // Refresh the main channel messages to update thread reply counts
    if (message && message.root_id) {
      console.debug(`MessageContainer: Thread reply sent, refreshing message list`, {
        messageId: message.id,
        rootId: message.root_id
      });

      // Trigger a message list refresh
      messageService.refetch();
    }
  }, [messageService]);
  
  // Handle opening thread
  const handleOpenThread = useCallback((messageId: string) => {
    setThreadMessageId(messageId);
  }, []);
  
  // Handle closing thread, with optional external handler
  const handleCloseThread = useCallback(() => {
    setThreadMessageId(undefined);
    if (onThreadClose) {
      onThreadClose();
    }
  }, [onThreadClose]);

  // Handle external thread ID changes
  useEffect(() => {
    setThreadMessageId(externalThreadMessageId);
  }, [externalThreadMessageId]);
  
  // Mark channel as viewed when component mounts
  useEffect(() => {
    if (channelId) {
      viewChannel();

      // Clear any attachment previews when changing channels
      if (mainInputRef.current && mainInputRef.current.resetAttachments) {
        mainInputRef.current.resetAttachments();
      }
    }
  }, [channelId, viewChannel]);

  // Calculate if thread is visible (either internally or externally managed)
  const isThreadVisible = showThread && threadMessageId !== undefined;
  
  // Apply different layouts for desktop vs mobile
  const isThreadFullscreen = isMobile && isThreadVisible;
  
  return (
    <Box 
      ref={containerRef}
      sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: isThreadVisible ? 'row' : 'column' },
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative', // Added to ensure proper positioning of children
        pt: '0px', // Ensure no top padding so we fill available space
      }}
    >
      {/* Message list area - hidden on mobile when thread is visible */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          flexBasis: { xs: '100%', md: isThreadVisible ? '75%' : '100%' },
          display: isThreadFullscreen ? 'none' : 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%', // Ensure full width
          position: 'relative', // Needed for absolutely positioned input
          transition: theme.transitions.create('flex-basis', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          pb: '76px', // Space for absolutely positioned input
        }}
      >
        {/* Message list with scrolling */}
        <MessageList
          channelId={channelId}
          currentUserId={currentUserId}
          onReplyMessage={handleReplyMessage}
          onOpenThread={showThread ? handleOpenThread : undefined}
        />
        
        {/* Message input - absolutely positioned at bottom */}
        {showInput && (
          <Box sx={{ 
            p: 2, 
            pt: 1, 
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            zIndex: 10,
          }}>
            <MessageInput
              ref={mainInputRef}
              channelId={channelId}
              replyToMessageId={replyToMessageId}
              placeholder={`Type a message...`}
              onMessageSent={handleCancelReply}
              onCancelReply={handleCancelReply}
            />
          </Box>
        )}
      </Box>
      
      {/* Thread area - conditionally displayed */}
      {isThreadVisible && threadMessageId && (
        <Box
          sx={{
            flexBasis: { xs: '100%', md: '25%' },
            minWidth: { md: '350px' },
            maxWidth: { md: '450px' },
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: { md: '1px solid' },
            borderColor: 'divider',
            transition: theme.transitions.create(['width', 'flex-basis'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflow: 'hidden', // Ensure the thread doesn't overflow
          }}
        >
          <MessageThread
            rootMessageId={threadMessageId}
            channelId={channelId}
            currentUserId={currentUserId}
            onClose={handleCloseThread}
            isMobile={isMobile}
            onMessageSent={handleThreadMessageSent}
          />
        </Box>
      )}
    </Box>
  );
}

export default MessageContainer;