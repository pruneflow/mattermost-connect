import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Divider, Paper, Button, IconButton, Menu, MenuItem } from '@mui/material';
import { MoreVert as MoreVertIcon, Reply as ReplyIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useMessages } from '../hooks/useMessages';
import { useUser } from '../hooks/useUsers';
import { formatRelativeTime, formatUserName } from '../utils/formatters';
import Message from './Message';
import MessageReactions from './MessageReactions';
import MessageAttachment from './MessageAttachment';
import Markdown from './Markdown';

export interface MessageListProps {
  channelId: string;
  currentUserId?: string;
  onReplyMessage?: (messageId: string) => void;
  onOpenThread?: (messageId: string) => void;
}

export function MessageList({ channelId, currentUserId, onReplyMessage, onOpenThread }: MessageListProps) {
  // State and refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(null);
  
  // Get messages for this channel
  const { 
    messages, 
    isLoading,
    hasMore,
    loadingMore,
    loadMore, 
    refetch,
    updateMessage,
    deleteMessage
  } = useMessages(channelId);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);
  
  // Group messages by date for better UI presentation
  const groupedMessages = React.useMemo(() => {
    const groups: Record<string, typeof messages> = {};
    
    // Make sure messages is an array before using forEach
    if (!Array.isArray(messages)) {
      return groups;
    }
    
    messages.forEach(message => {
      // Use create_at to group by date (ignoring time)
      const date = new Date(message.create_at);
      const dateString = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      ).toISOString();
      
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      
      groups[dateString].push(message);
    });
    
    return groups;
  }, [messages]);
  
  // Sort dates for rendering (chronological order - oldest first)
  const sortedDates = React.useMemo(() => {
    return Object.keys(groupedMessages).sort();
  }, [groupedMessages]);
  
  // Format date for display
  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if date is today
    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return 'Today';
    }
    
    // Check if date is yesterday
    if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return 'Yesterday';
    }
    
    // Otherwise, format the date
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Handle scroll to top to load more messages
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    
    // Load more when scrolled near the top
    if (scrollTop < 50 && hasMore && !loadingMore && !isLoading) {
      void loadMore();
    }
  };

  return (
    <Box 
      sx={{ 
        height: '100%', 
        width: '100%', // Ensure full width
        overflowY: 'auto', 
        px: 3, // Changed from p: 2 to reduce left/right margin to 24px
        pt: 4, // Added top margin to prevent messages from being cut off
        pb: 2,
        boxSizing: 'border-box',
      }} 
      onScroll={handleScroll}
    >
      {/* Loading more indicator at top */}
      {loadingMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      
      {/* Load More button */}
      {hasMore && !loadingMore && messages.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => loadMore()}
          >
            Load More Messages
          </Button>
        </Box>
      )}
      
      {/* Initial loading state */}
      {isLoading && !loadingMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Empty state */}
      {!isLoading && !loadingMore && messages.length === 0 && (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No messages yet. Start the conversation!
          </Typography>
        </Box>
      )}
      
      {/* Messages grouped by date */}
      {sortedDates.map(date => (
        <Box key={date} sx={{ mb: 2 }}>
          {/* Date header */}
          <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
            <Divider sx={{ flex: 1, mr: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {formatDateHeader(date)}
            </Typography>
            <Divider sx={{ flex: 1, ml: 2 }} />
          </Box>
          
          {/* Messages for this date - sorted in chronological order (oldest to newest) */}
          {groupedMessages[date]
            .sort((a, b) => a.create_at - b.create_at) // Sort by create_at in ascending order
            .map(message => (
            <>
              <MessageItem 
                key={message.id} 
                messageId={message.id} 
                userId={message.user_id} 
                content={message.message}
                timestamp={message.create_at}
                channelId={channelId}
                reactions={message.metadata?.reactions ? 
                  // Convert from metadata.reactions array to Record<string, string[]> format
                  message.metadata.reactions.reduce((acc, reaction) => {
                    if (!acc[reaction.emoji_name]) {
                      acc[reaction.emoji_name] = [];
                    }
                    if (!acc[reaction.emoji_name].includes(reaction.user_id)) {
                      acc[reaction.emoji_name].push(reaction.user_id);
                    }
                    return acc;
                  }, {} as Record<string, string[]>)
                  : message.props?.reactions || {}
                }
                isCurrentUser={currentUserId === message.user_id}
                hasReplies={messages.some(m => m.root_id === message.id && m.id !== message.id) || 
                  // Also check if message has replies count in its metadata/props
                  (message.reply_count && message.reply_count > 0)}
                replyCount={
                  // First try to use the known reply_count from message metadata if available
                  message.reply_count || 
                  // Otherwise, count replies manually from the messages array
                  messages.reduce((count, m) => (m.root_id === message.id && m.id !== message.id) ? count + 1 : count, 0)
                }
                fileIds={message.file_ids}
                onReply={onReplyMessage ? () => onReplyMessage(message.id) : undefined}
                onOpenThread={onOpenThread ? () => onOpenThread(message.id) : undefined}
                onEdit={async (messageId, newContent) => {
                  try {
                    await updateMessage({
                      id: messageId,
                      message: newContent
                    });
                    return Promise.resolve();
                  } catch (error) {
                    console.error('Failed to update message:', error);
                    return Promise.reject(error);
                  }
                }}
                onDelete={async (messageId) => {
                  try {
                    await deleteMessage(messageId);
                    return Promise.resolve();
                  } catch (error) {
                    console.error('Failed to delete message:', error);
                    return Promise.reject(error);
                  }
                }}
              />
            </>
          ))}
        </Box>
      ))}
      
      {/* Ref for auto-scrolling */}
      <div ref={messagesEndRef} />
    </Box>
  );
}

// Message edit state
interface EditingMessage {
  id: string;
  content: string;
}

// Individual message item component
interface MessageItemProps {
  messageId: string;
  userId: string;
  content: string;
  timestamp: number;
  channelId: string;
  reactions?: Record<string, string[]>;
  isCurrentUser?: boolean;
  hasReplies?: boolean;
  replyCount?: number;
  fileIds?: string[];
  onReply?: () => void;
  onOpenThread?: () => void;
  onEdit?: (messageId: string, content: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
}

function MessageItem({ 
  messageId, 
  userId, 
  content, 
  timestamp, 
  channelId, 
  reactions, 
  isCurrentUser,
  hasReplies,
  replyCount = 0,
  fileIds = [],
  onReply,
  onOpenThread,
  onEdit,
  onDelete,
}: MessageItemProps) {
  // Get user data for the message author
  const { user, isLoading } = useUser(userId);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // Handle menu open/close
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle edit mode
  const handleEditClick = () => {
    setIsEditing(true);
    setEditedContent(content);
    handleMenuClose();
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(content);
  };
  
  const handleSaveEdit = async () => {
    if (onEdit && editedContent.trim() !== '') {
      try {
        await onEdit(messageId, editedContent);
        setIsEditing(false);
      } catch (error) {
        console.error('Failed to update message:', error);
      }
    }
  };
  
  // Handle delete
  const handleDeleteClick = async () => {
    if (onDelete) {
      try {
        await onDelete(messageId);
        handleMenuClose();
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    }
  };
  
  // Handle key press in edit mode
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };
  
  return (
    <Box
      sx={{
        maxWidth: '80%',
        ml: isCurrentUser ? 'auto' : 0,
        mr: isCurrentUser ? 0 : 'auto',
        mb: 2,
      }}
    >
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          maxWidth: '100%', 
          bgcolor: isCurrentUser ? 'rgba(140, 180, 255, 0.15)' : 'rgba(0, 0, 0, 0.03)',
          borderRadius: 2,
        }}
      >
        {/* Message header with author and time */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2">
            {isLoading ? 'Loading...' : formatUserName(user)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {formatRelativeTime(timestamp)}
            </Typography>
            
            {/* Menu button */}
            {(onReply || (isCurrentUser && (onEdit || onDelete))) && (
              <IconButton size="small" onClick={handleMenuClick} sx={{ ml: 1 }}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
            )}
            
            {/* Action menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              {onReply && (
                <MenuItem onClick={() => { onReply(); handleMenuClose(); }}>
                  <ReplyIcon fontSize="small" sx={{ mr: 1 }} />
                  Reply
                </MenuItem>
              )}
              {isCurrentUser && onEdit && (
                <MenuItem onClick={handleEditClick}>
                  <EditIcon fontSize="small" sx={{ mr: 1 }} />
                  Edit
                </MenuItem>
              )}
              {isCurrentUser && onDelete && (
                <MenuItem onClick={handleDeleteClick}>
                  <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                  Delete
                </MenuItem>
              )}
            </Menu>
          </Box>
        </Box>
        
        {/* Message content - editable or readonly */}
        {isEditing ? (
          <Box sx={{ mt: 1 }}>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyDown={handleKeyPress}
              autoFocus
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                resize: 'vertical',
                fontFamily: 'inherit',
                fontSize: 'inherit',
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 1 }}>
              <Button 
                size="small" 
                onClick={handleCancelEdit}
                variant="outlined"
              >
                Cancel
              </Button>
              <Button 
                size="small" 
                onClick={handleSaveEdit}
                variant="contained"
                disabled={editedContent.trim() === ''}
              >
                Save
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ wordBreak: 'break-word' }}>
            <Markdown content={content} />
          </Box>
        )}
      </Paper>
      
      {/* Interactive elements outside message container */}
      {!isEditing && (
        <Box 
          sx={{ 
            mt: 1, 
            ml: isCurrentUser ? 'auto' : '0.5rem',
            mr: isCurrentUser ? '0.5rem' : 'auto',
            width: 'calc(100% - 1rem)',
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {/* Thread button and reactions on the same row */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}>
            {/* Thread button - only visible when there are replies or onOpenThread handler exists */}
            {onOpenThread && (hasReplies || replyCount > 0) ? (
              <Button
                onClick={onOpenThread}
                variant="outlined"
                size="small"
                startIcon={<ReplyIcon fontSize="small" />}
                sx={{ 
                  borderRadius: '16px',
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  p: '4px 12px',
                  minWidth: 'auto',
                }}
              >
                {replyCount === 1 ? '1 reply' : `${replyCount} replies`}
              </Button>
            ) : (
              <Box /> 
            )}

            {/* Message reactions - aligned right on the same row as thread button */}
            {messageId && channelId && (
              <Box>
                <MessageReactions
                  messageId={messageId}
                  channelId={channelId}
                  reactions={reactions || {}}
                  compact={true}
                />
              </Box>
            )}
          </Box>

          {/* File attachments - always below thread button and reactions */}
          {fileIds && fileIds.length > 0 && (
            <Box sx={{ 
              width: '100%',
            }}>
              <MessageAttachment fileIds={fileIds} />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

// Export MessageItem to be used in MessageThread
MessageList.MessageItem = MessageItem;

export default MessageList;