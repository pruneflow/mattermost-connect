import React, { memo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  useTheme,
  SxProps,
  Theme,
  useMediaQuery,
} from "@mui/material";
import { Reply as ReplyIcon } from "@mui/icons-material";
import { formatMessageTime } from "../../utils/dateUtils";
import { Post, User } from "../../api/types";
import { MessageHeader } from "./MessageHeader";
import { MessageActions } from "./MessageActions";
import { UserAvatar } from "../atoms/UserAvatar";
import { MessageReactions } from "./MessageReactions";
import { EditMessage } from "./EditMessage";
import { FileAttachmentList } from "./FileAttachmentList";
import { isSystemMessage } from "../../utils/messageUtils";

interface MessageProps {
  post: Post;
  channelId: string;
  isFocused?: boolean;
  showHeader?: boolean;
  isOwnMessage?: boolean;
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
  display: "flex",
  alignItems: "center",
  gap: 1,
  px: 1,
  py: 0.5,
  borderRadius: 1,
  cursor: "pointer",
  "&:hover": {
    bgcolor: "action.hover",
  },
};

// Composant pour les avatars des répondants (style GroupAvatar)
const ThreadReplierAvatars: React.FC<{ userIds?: string[] }> = ({ userIds = [] }) => {
  if (userIds.length === 0) return null;
  
  const displayUsers = userIds.slice(0, 3);
  const avatarSize = 20;
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
      {displayUsers.map((userId, index) => (
        <Box
          key={userId}
          sx={{
            position: 'relative',
            zIndex: 3 - index,
            marginLeft: index > 0 ? '-6px' : 0,
          }}
        >
          <Box
            sx={{
              width: avatarSize,
              height: avatarSize,
              border: '2px solid',
              borderColor: 'background.paper',
              borderRadius: '50%',
              overflow: 'hidden',
            }}
          >
            <UserAvatar
              userId={userId}
              size="xs"
              showStatus={false}
            />
          </Box>
        </Box>
      ))}
      {userIds.length > 3 && (
        <Box
          sx={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: '50%',
            bgcolor: 'grey.400',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            color: 'white',
            marginLeft: '-6px',
            border: '2px solid',
            borderColor: 'background.paper',
            zIndex: 0,
          }}
        >
          +{userIds.length - 3}
        </Box>
      )}
    </Box>
  );
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
    isOwnMessage = false,
    onReply,
    onDelete,
    onOpenThread,
    onFileDownload,
    onFilePreview,
    sx,
  }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const isSystem = isSystemMessage(post);
    console.debug("post", post);
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

    // Bubble container styles - flexbox for alignment
    const bubbleContainerStyles: SxProps<Theme> = {
      display: "flex",
      justifyContent: isOwnMessage ? "flex-end" : "flex-start",
      mb: 1.5,
      mx: 1,
      ...sx,
    };

    // Bubble wrapper styles - max width and responsive
    const bubbleWrapperStyles: SxProps<Theme> = {
      maxWidth: isMobile ? "85%" : "70%",
      minWidth: isMobile ? "85%" : "70%",
      display: "flex",
      flexDirection: "column",
    };

    // Bubble styles - background and padding
    const bubbleStyles: SxProps<Theme> = {
      backgroundColor: isOwnMessage 
        ? theme.palette.success.main // Vert moderne pour mes messages
        : theme.palette.background.paper, // Blanc/dark selon le thème
      borderRadius: 2,
      p: 1.5,
      position: "relative",
      border: isFocused 
        ? `2px solid ${theme.palette.primary.main}` 
        : isOwnMessage 
          ? "none" 
          : `1px solid ${theme.palette.divider}`,
      "&:hover": {
        backgroundColor: isOwnMessage 
          ? theme.palette.success.dark 
          : theme.palette.action.hover,
      },
      boxShadow: theme.shadows[1],
    };

    // Message text color based on bubble color
    const messageTextColor = isOwnMessage ? "white" : "text.primary";

    // Timestamp styles - bottom right of bubble
    const timestampStyles: SxProps<Theme> = {
      position: "absolute",
      bottom: 8,
      right: 12,
      opacity: 0.7,
      fontSize: "0.7rem",
      color: isOwnMessage ? "rgba(255,255,255,0.8)" : "text.secondary",
      pointerEvents: "none",
    };

    return (
      <Box 
        sx={bubbleContainerStyles}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Box sx={bubbleWrapperStyles}>
          {/* Header with avatar, username (only when showing header and not own message) */}
          {showHeader && !isOwnMessage && (
            <MessageHeader
              userId={post.user_id}
              timestamp={post.create_at}
              showAvatar={true}
            />
          )}
          
          <Paper
            elevation={isFocused ? 2 : 1}
            sx={bubbleStyles}
          >
            {/* Message Text or Edit Mode */}
            {isEditing ? (
              <EditMessage
                postId={post.id}
                initialMessage={post.message}
                onCancel={handleEditCancel}
                onSave={handleEditSave}
                sx={{ 
                  "& .MuiTextField-root": {
                    "& .MuiInputBase-input": {
                      color: messageTextColor,
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: isOwnMessage ? "rgba(255,255,255,0.5)" : undefined,
                    },
                  },
                }}
              />
            ) : (
              <Typography
                variant="body2"
                color={messageTextColor}
                sx={messageTextStyles}
              >
                {post.message}
              </Typography>
            )}

            {/* File attachments */}
            {post.file_ids && post.file_ids.length > 0 && (
              <FileAttachmentList
                fileIds={post.file_ids}
                onDownload={onFileDownload}
                onPreview={onFilePreview}
              />
            )}

            {/* Timestamp in bottom right */}
            <Typography variant="caption" sx={timestampStyles}>
              {formatMessageTime(post.create_at)}
            </Typography>
          </Paper>

          {/* Reactions - outside bubble, always aligned left */}
          {post.metadata?.reactions && post.metadata.reactions.length > 0 && (
            <Box sx={{ alignSelf: "flex-start", mt: 0.5 }}>
              <MessageReactions
                postId={post.id}
                reactions={post.metadata.reactions}
                sx={reactionStyles}
              />
            </Box>
          )}

          {/* Thread replies indicator - outside bubble, always aligned left */}
          {post.reply_count > 0 && (
            <Box sx={{ alignSelf: "flex-start", mt: 0.5 }}>
              <Box 
                sx={{
                  ...threadRepliesStyles,
                  "& .MuiTypography-root": {
                    color: "primary.main",
                  },
                }} 
                onClick={handleOpenThread}
              >
                <ThreadReplierAvatars userIds={post.participants?.map((user: User) => user.id)} />
                <ReplyIcon sx={{ fontSize: 14, color: "primary.main" }} />
                <Typography variant="caption">
                  {post.reply_count}{" "}
                  {post.reply_count === 1 ? "reply" : "replies"}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Message Actions - positioned relative to bubble */}
          {(isHovered || isMobile) && (
            <MessageActions
              post={post}
              visible={isHovered || isMobile}
              onReply={handleReply}
              onEdit={handleStartEdit}
              onDelete={handleDelete}
              sx={{
                ...(showHeader
                    ? { top: -10 }
                    : { top: -30 }
                ),
              }}
            />
          )}
        </Box>
      </Box>
    );
  },
);

Message.displayName = "Message";
