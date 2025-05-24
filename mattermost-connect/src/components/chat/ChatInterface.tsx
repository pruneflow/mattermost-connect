import React, { useState, useCallback } from 'react';
import { Box, Grid, Paper, Typography, Divider, CircularProgress } from '@mui/material';
import { ChannelList } from '../channels/ChannelList';
import { MessageList } from '../messages/MessageList';
import MessageInput from '../messages/MessageInput';
import { MessageThread } from '../messages/MessageThread';
import { useAuth } from '../../context/AuthContext';
import { Channel, Message } from '../../api/types';
import { useMessages } from '../../hooks/useMessages';

export interface ChatInterfaceProps {
  teamId: string;
}

/**
 * ChatInterface component combines ChannelList, MessageList, and MessageInput
 * to create a complete chat experience for a team
 */
export function ChatInterface({ teamId }: ChatInterfaceProps) {
  // Authentication context for current user
  const { user } = useAuth();
  
  // Local state
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [replyToMessageId, setReplyToMessageId] = useState<string | undefined>(undefined);
  const [openThreadId, setOpenThreadId] = useState<string | undefined>(undefined);
  
  // Handle channel selection
  const handleChannelSelect = useCallback((channel: Channel) => {
    setSelectedChannel(channel);
    // Clear any active reply and thread when changing channels
    setReplyToMessageId(undefined);
    setOpenThreadId(undefined);
  }, []);
  
  // Handle reply to message
  const handleReplyMessage = useCallback((message: Message) => {
    setReplyToMessageId(message.id);
  }, []);
  
  // Handle cancel reply
  const handleCancelReply = useCallback(() => {
    setReplyToMessageId(undefined);
  }, []);
  
  // Get messaging service for this channel
  const { createMessage } = useMessages(selectedChannel?.id);
  
  // Handle sending a message
  const handleSendMessage = useCallback((message: string) => {
    if (!selectedChannel) return;
    
    console.log(`Sending message to channel ${selectedChannel.id}: ${message}`);
    createMessage({
      channel_id: selectedChannel.id,
      message: message,
      root_id: replyToMessageId // Include root_id if replying to a message
    }).then(() => {
      // Clear reply after sending
      handleCancelReply();
    }).catch(error => {
      console.error('Error sending message:', error);
    });
  }, [selectedChannel, createMessage, replyToMessageId, handleCancelReply]);
  
  // Handle opening thread
  const handleOpenThread = useCallback((messageId: string) => {
    if (!messageId) {
      console.error("Cannot open thread: No message ID provided");
      return;
    }
    
    // Enhanced debug for thread opening
    console.debug(`Opening thread for message ${messageId}`, {
      channelId: selectedChannel?.id,
      messageId: messageId,
      currentUserId: user?.id
    });
    
    // Set the thread ID after a small delay to ensure state updates properly
    setTimeout(() => {
      setOpenThreadId(messageId);
    }, 0);
  }, [selectedChannel, user]);
  
  // Handle closing thread
  const handleCloseThread = useCallback(() => {
    setOpenThreadId(undefined);
  }, []);
  
  return (
    <Grid container sx={{ height: '100vh' }}>
      {/* Channels sidebar */}
      <Grid size={{ xs: 12, sm: 3, md: 3, lg: 3 }} sx={{ borderRight: 1, borderColor: 'divider' }}>
        <Paper 
          elevation={0} 
          square 
          sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            bgcolor: 'background.default'
          }}
        >
          <Typography variant="h6" sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            Channels
          </Typography>
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            <ChannelList
              teamId={teamId}
              onSelectChannel={handleChannelSelect}
              selectedChannelId={selectedChannel?.id}
            />
          </Box>
        </Paper>
      </Grid>
      
      {/* Chat area */}
      <Grid size={{ xs: 12, sm: 9, md: 9, lg: 9 }} sx={{ height: '100%' }}>
        {!selectedChannel ? (
          // No channel selected state
          <Box 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: 'background.default' 
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Select a channel to start chatting
            </Typography>
          </Box>
        ) : (
          // Channel selected - show messages with flex row layout for desktop
          <Box 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' }, // Column on mobile, row on desktop
              bgcolor: 'background.default',
              position: 'relative',
            }}
          >
            {/* Main chat area container - grows to fill available space */}
            <Box 
              sx={{ 
                height: '100%',
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                width: { xs: '100%', sm: openThreadId ? 'calc(100% - 304px)' : '100%' }, // Adapt width when thread is open
                transition: 'width 0.3s ease', // Smooth transition for width changes
              }}
            >
              {/* Channel header */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">
                  {selectedChannel.display_name || selectedChannel.name}
                </Typography>
                {selectedChannel.purpose && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedChannel.purpose}
                  </Typography>
                )}
              </Box>
              
              {/* Message list area - scrollable */}
              <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2 }}>
                <MessageList
                  channelId={selectedChannel.id}
                  currentUserId={user?.id}
                  onReplyMessage={handleReplyMessage}
                  onOpenThread={handleOpenThread}
                />
              </Box>
              
              {/* Reply context display if replying to a message */}
              {replyToMessageId && (
                <Box sx={{ p: 1, borderTop: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">
                      Replying to a message
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="primary" 
                      sx={{ cursor: 'pointer' }}
                      onClick={handleCancelReply}
                    >
                      Cancel
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {/* Message input area */}
              <Box sx={{ p: 2 }}>
                <MessageInput
                  channelId={selectedChannel.id}
                  replyToMessageId={replyToMessageId}
                  placeholder={`Message ${selectedChannel.display_name || selectedChannel.name}`}
                  onSendMessage={handleSendMessage}
                  onMessageSent={handleCancelReply}
                  onCancelReply={handleCancelReply}
                />
              </Box>
            </Box>
            
            {/* Thread panel - positioned using flexbox on desktop, fixed on mobile */}
            {openThreadId && selectedChannel && (
              <MessageThread
                rootMessageId={openThreadId}
                channelId={selectedChannel.id}
                currentUserId={user?.id}
                onClose={handleCloseThread}
                isMobile={false} // Desktop mode setting
              />
            )}
          </Box>
        )}
      </Grid>
    </Grid>
  );
}

export default ChatInterface;