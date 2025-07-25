import React, { memo, useState, useCallback } from 'react';
import { Box, Typography, Paper, useTheme, SxProps, Theme } from '@mui/material';
import { Post } from '../../api/types';
import { MessageHeader } from './MessageHeader';
import { MessageActions } from './MessageActions';
import { MessageReactions } from './MessageReactions';
import { EditMessage } from './EditMessage';
import { FileAttachmentList } from './FileAttachmentList';
import { isSystemMessage, isConsecutivePost } from "../../utils/messageUtils";
import { useAppSelector } from "../../hooks";
import { getPost } from "../../store/selectors";

interface MessageProps {
  post: Post;
  previousPostId?: string;
  isCompact?: boolean;
  isFocused?: boolean;
  onReply?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onOpenThread?: (postId: string) => void;
  onFileDownload?: (fileId: string) => void;
  onFilePreview?: (fileId: string) => void;
  sx?: SxProps<Theme>;
}

const systemMessageStyles: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  my: 1,
  opacity: 0.7,
};

// Styles will be applied dynamically based on showHeader

const messageTextStyles: SxProps<Theme> = {
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.4,
};

const threadRepliesStyles: SxProps<Theme> = {
  mt: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  cursor: 'pointer',
  '&:hover': {
    textDecoration: 'underline',
  },
};

const reactionStyles: SxProps<Theme> = {
  mt: 1,
};

export const Message: React.FC<MessageProps> = memo(({
  post,
  previousPostId = "",
  isCompact = false,
  isFocused = false,
  onReply,
  onDelete,
  onOpenThread,
  onFileDownload,
  onFilePreview,
  sx,
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Get previous post directly - stable selector call
  const previousPost = useAppSelector(state => 
    previousPostId ? getPost(state, previousPostId) : null
  );
  // For compact mode, never show header. Otherwise use the normal logic
  const showHeader = !isConsecutivePost(post, previousPost || "");
  const isSystem = isSystemMessage(post);
  
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);
  
  const handleReply = useCallback(() => {
    onReply?.(post.id);
  }, [onReply, post.id]);
  
  const handleDelete = useCallback(() => {
    onDelete?.(post.id);
  }, [onDelete, post.id]);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleEditSave = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleOpenThread = useCallback(() => {
    if (onOpenThread) {
      onOpenThread(post.id);
    }
  }, [onOpenThread, post.id]);
  
  if (isSystem) {
    return (
      <Box sx={systemMessageStyles}>
        <Typography variant="body2" color="textSecondary">
          {post.message}
        </Typography>
      </Box>
    );
  }
  
  const paperStyles: SxProps<Theme> = {
    backgroundColor: isFocused 
      ? theme.palette.action.selected 
      : 'transparent',
    p: isCompact ? 1 : 2,
    mb: 0.25,
    borderRadius: 1,
    border: isFocused ? `1px solid ${theme.palette.primary.main}` : 'none',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    ...sx,
  };
  
  const containerStyles: SxProps<Theme> = {
    display: 'flex',
    gap: 2,
    alignItems: 'flex-start',
  };
  
  return (
    <Paper
      elevation={isFocused ? 1 : 0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={paperStyles}
    >
      <Box sx={containerStyles}>
        {/* Message Content with proper header */}
        <Box sx={{ 
          flex: 1, 
          minWidth: 0,
          ml: showHeader ? 0 : 5 // Align with header when not showing avatar
        }}>
          {/* Header with avatar, username and timestamp (only when showing header) */}
          {showHeader && (
            <MessageHeader
              userId={post.user_id}
              timestamp={post.create_at}
              showAvatar={true}
            />
          )}
          
          {/* Message Text or Edit Mode */}
          {isEditing ? (
            <EditMessage
              postId={post.id}
              initialMessage={post.message}
              onCancel={handleEditCancel}
              onSave={handleEditSave}
              sx={{ mt: 1 }}
            />
          ) : (
            <Typography
              variant="body2"
              color="text.primary"
              sx={messageTextStyles}
            >
              {post.message}
            </Typography>
          )}
          
          {/* Reactions */}
          {post.metadata?.reactions && post.metadata.reactions.length > 0 && (
            <MessageReactions
              postId={post.id}
              reactions={post.metadata.reactions}
              sx={reactionStyles}
            />
          )}
          
          {/* File attachments */}
          {post.file_ids && post.file_ids.length > 0 && (
            <FileAttachmentList
              fileIds={post.file_ids}
              onDownload={onFileDownload}
              onPreview={onFilePreview}
            />
          )}
          
          {/* Thread replies indicator */}
          {post.reply_count > 0 && (
            <Box sx={threadRepliesStyles} onClick={handleOpenThread}>
              <Typography 
                variant="caption" 
                color="primary"
              >
                {post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
      
      {/* Message Actions */}
      <MessageActions
        postId={post.id}
        visible={isHovered}
        onReply={handleReply}
        onEdit={handleStartEdit}
        onDelete={handleDelete}
      />
    </Paper>
  );
});

Message.displayName = 'Message';