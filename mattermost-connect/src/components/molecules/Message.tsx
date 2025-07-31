import React, { memo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  useTheme,
  SxProps,
  Theme,
} from "@mui/material";
import { Post } from "../../api/types";
import { MessageHeader } from "./MessageHeader";
import { MessageActions } from "./MessageActions";
import { MessageReactions } from "./MessageReactions";
import { EditMessage } from "./EditMessage";
import { FileAttachmentList } from "./FileAttachmentList";
import { isSystemMessage } from "../../utils/messageUtils";

interface MessageProps {
  post: Post;
  channelId: string;
  isFocused?: boolean;
  showHeader?: boolean;
  onReply?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onOpenThread?: (postId: string) => void;
  onFileDownload?: (fileId: string) => void;
  onFilePreview?: (fileId: string) => void;
  sx?: SxProps<Theme>;
}

const systemMessageStyles: SxProps<Theme> = {
  display: "flex",
  justifyContent: "center",
  my: 1,
  opacity: 0.7,
};

// Styles will be applied dynamically based on showHeader

const messageTextStyles: SxProps<Theme> = {
  wordBreak: "break-word",
  whiteSpace: "pre-wrap",
  lineHeight: 1.4,
};

const threadRepliesStyles: SxProps<Theme> = {
  mt: 1,
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  cursor: "pointer",
  "&:hover": {
    textDecoration: "underline",
  },
};

const reactionStyles: SxProps<Theme> = {
  mt: 1,
};

export const Message: React.FC<MessageProps> = memo(
  ({
    post,
    channelId,
    isFocused = false,
    showHeader = true,
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
        : "transparent",
      p: 1,
      mb: 2,
      borderRadius: 1,
      border: isFocused ? `1px solid ${theme.palette.primary.main}` : "none",
      "&:hover": {
        backgroundColor: theme.palette.action.hover,
      },
      ...sx,
    };

    const containerStyles: SxProps<Theme> = {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
    };

    return (
      <Paper
        elevation={isFocused ? 1 : 0}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={paperStyles}
      >
        <Box sx={containerStyles}>
          {/* Header with avatar, username and timestamp (only when showing header) */}
          {showHeader && (
            <MessageHeader
              userId={post.user_id}
              timestamp={post.create_at}
              showAvatar={true}
            />
          )}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              ml: 5, // Align with header when not showing avatar
            }}
          >
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
                <Typography variant="caption" color="primary">
                  {post.reply_count}{" "}
                  {post.reply_count === 1 ? "reply" : "replies"}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Message Actions */}
        {isHovered && (
          <MessageActions
            post={post}
            visible={isHovered}
            onReply={handleReply}
            onEdit={handleStartEdit}
            onDelete={handleDelete}
          />
        )}
      </Paper>
    );
  },
);

Message.displayName = "Message";
