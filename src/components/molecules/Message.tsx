/**
 * Message component for displaying individual messages in channels and threads
 * Supports bubble layout, reactions, file attachments, editing, and thread replies
 */
import React, { memo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  useTheme,
  SxProps,
  Theme,
  useMediaQuery,
  Tooltip,
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
import { HorizontalFileContainer } from "../common/HorizontalFileContainer";
import { MessageFormatter } from "../atoms/MessageFormatter";
import { isSystemMessage } from "../../utils/messageUtils";
import { useAppSelector } from "../../hooks/useAppSelector";
import { useAppDispatch } from "../../hooks/useAppDispatch";
import { selectUserProfiles } from "../../store/selectors";
import {
  selectIsPostEditing,
  selectIsMessageSelected,
  selectIsEmojiPanelOpen,
} from "../../store/selectors/messageUI";
import {
  startEdit,
  stopEdit,
  startReply,
  openThread,
  selectMessage,
} from "../../store/slices/messageUISlice";
import { displayUsername } from "../../utils/userUtils";

interface MessageProps {
  post: Post;
  channelId: string;
  isFocused?: boolean;
  showHeader?: boolean;
  isOwnMessage?: boolean;
  inThread?: boolean;
  onReply?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onOpenThread?: (postId: string) => void;
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

// Component for thread replier avatars (improved GroupAvatar style)
const ThreadReplierAvatars: React.FC<{ userIds?: string[] }> = ({
  userIds = [],
}) => {
  const userProfiles = useAppSelector(selectUserProfiles);

  if (userIds.length === 0) return null;

  const displayUsers = userIds.slice(0, 3);
  const avatarSize = 28;

  return (
    <Box sx={{ display: "flex", alignItems: "center", mr: 1 }}>
      {displayUsers.map((userId, index) => {
        const user = userProfiles[userId];
        const displayName = user
          ? displayUsername(user, "full_name_nickname", true)
          : "Unknown User";

        return (
          <Tooltip key={userId} title={displayName} arrow>
            <Box
              sx={{
                position: "relative",
                zIndex: displayUsers.length - index,
                marginLeft: index > 0 ? "-10px" : 0,
                transition: "transform 0.2s ease, z-index 0.2s ease",
                cursor: "pointer",
                "&:hover": {
                  transform: "scale(1.2)",
                  zIndex: 999,
                },
              }}
            >
              <Box
                sx={{
                  width: avatarSize,
                  height: avatarSize,
                  border: "2px solid",
                  borderColor: "background.paper",
                  borderRadius: "50%",
                  overflow: "hidden",
                }}
              >
                <UserAvatar userId={userId} size="small" showStatus={false} />
              </Box>
            </Box>
          </Tooltip>
        );
      })}
      {userIds.length > 3 && (
        <Tooltip title={`+${userIds.length - 3} more participants`} arrow>
          <Box
            sx={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: "50%",
              bgcolor: "grey.400",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              fontWeight: "bold",
              color: "white",
              marginLeft: "-10px",
              border: "2px solid",
              borderColor: "background.paper",
              zIndex: 0,
              transition: "transform 0.2s ease, z-index 0.2s ease",
              cursor: "pointer",
              "&:hover": {
                transform: "scale(1.2)",
                zIndex: 999,
              },
            }}
          >
            +{userIds.length - 3}
          </Box>
        </Tooltip>
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
    inThread = false,
    onReply,
    onDelete,
    onOpenThread,
    sx,
  }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const dispatch = useAppDispatch();
    const [isHovered, setIsHovered] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
      null,
    );
    const isEditing = useAppSelector(selectIsPostEditing(post.id));
    const isSelected = useAppSelector(selectIsMessageSelected(post.id));
    const isEmojiPanelOpen = useAppSelector(selectIsEmojiPanelOpen);
    const isSystem = isSystemMessage(post);
    const handleMouseEnter = useCallback(() => {
      if (!isMobile) setIsHovered(true);
    }, [isMobile]);

    const handleMouseLeave = useCallback(() => {
      if (!isMobile) setIsHovered(false);
    }, [isMobile]);

    const handleTouchStart = useCallback(() => {
      if (!isMobile) return;
      const timer = setTimeout(() => {
        dispatch(selectMessage(post.id));
      }, 500);
      setLongPressTimer(timer);
    }, [isMobile, dispatch, post.id]);

    const handleTouchEnd = useCallback(() => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }, [longPressTimer]);


    const handleReply = useCallback(() => {
      dispatch(startReply(post));
      onReply?.(post.id);
    }, [dispatch, onReply, post]);

    const handleDelete = useCallback(() => {
      onDelete?.(post.id);
    }, [onDelete, post.id]);

    const handleStartEdit = useCallback(() => {
      dispatch(startEdit(post.id));
    }, [dispatch, post.id]);

    const handleEditSave = useCallback(() => {
      dispatch(stopEdit());
    }, [dispatch]);

    const handleEditCancel = useCallback(() => {
      dispatch(stopEdit());
    }, [dispatch]);

    const handleOpenThread = useCallback(() => {
      dispatch(openThread(post.id));
      onOpenThread?.(post.id);
    }, [dispatch, onOpenThread, post.id]);

    if (isSystem) {
      return (
        <Box sx={systemMessageStyles}>
          <MessageFormatter
            message={post.message}
            sx={{
              fontSize: theme.typography.body2.fontSize,
              color: theme.palette.text.secondary,
              "& a": {
                color: theme.palette.primary.main,
              },
            }}
          />
        </Box>
      );
    }

    // Bubble container styles - flexbox for alignment
    const bubbleContainerStyles: SxProps<Theme> = {
      display: "flex",
      justifyContent: isOwnMessage ? "flex-end" : "flex-start",
      mb: 1.5,
      mx: 1,
      ...(inThread && { position: "relative" }), // Position relative only in threads
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
      backgroundColor: isSelected
        ? theme.palette.action.selected
        : isOwnMessage
          ? theme.palette.userMessage.main
          : theme.palette.background.paper,
      borderRadius: 2,
      p: 1.5,
      position: "relative",
      border: isFocused
        ? `2px solid ${theme.palette.primary.main}`
        : isOwnMessage
          ? `1px solid ${theme.palette.userMessage.border}`
          : `1px solid ${theme.palette.divider}`,
      "&:hover": {
        backgroundColor: isOwnMessage
          ? theme.palette.userMessage.hover
          : theme.palette.action.hover,
      },
      boxShadow: theme.shadows[1],
    };

    // Message text color based on bubble color
    const messageTextColor = isOwnMessage
      ? theme.palette.userMessage.text
      : "text.primary";

    // Timestamp styles - bottom right of bubble
    const timestampStyles: SxProps<Theme> = {
      position: "absolute",
      bottom: 8,
      right: 12,
      opacity: 0.7,
      fontSize: "0.7rem",
      color: isOwnMessage ? theme.palette.userMessage.text : "text.secondary",
      pointerEvents: "none",
    };
    return (
      <Box
        sx={bubbleContainerStyles}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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

          <Paper elevation={isFocused ? 2 : 1} sx={bubbleStyles}>
            {/* Message Text or Edit Mode */}
            {isEditing ? (
              <EditMessage
                postId={post.id}
                initialMessage={post.message}
                files={post.metadata?.files}
                onCancel={handleEditCancel}
                onSave={handleEditSave}
                channelId={channelId}
                inThread={inThread}
                sx={{
                  "& .MuiTextField-root": {
                    "& .MuiInputBase-input": {
                      color: messageTextColor,
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: isOwnMessage
                        ? theme.palette.userMessage.border
                        : undefined,
                    },
                  },
                }}
              />
            ) : (
              <MessageFormatter
                message={post.message}
                sx={{
                  ...messageTextStyles,
                  color: messageTextColor,
                  "& a": {
                    color: isOwnMessage
                      ? theme.palette.userMessage.link
                      : theme.palette.primary.main,
                  },
                }}
              />
            )}

            {/* File attachments */}
            {!isEditing &&
              post.metadata &&
              post.metadata.files &&
              post.metadata.files.length > 0 && (
                <HorizontalFileContainer>
                  <FileAttachmentList
                    postId={post.id}
                    files={post.metadata.files}
                  />
                </HorizontalFileContainer>
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
          {!inThread && post.reply_count > 0 && (
            <Box
              sx={{
                alignSelf: "flex-start",
                mt: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              {/* Group Avatars - visually separated */}
              <ThreadReplierAvatars
                userIds={post.participants?.map((user: User) => user.id)}
              />

              {/* Reply Icon + Text - visually separated but vertically aligned */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  cursor: "pointer",
                  "&:hover": {
                    "& .MuiTypography-root": {
                      textDecoration: "underline",
                    },
                  },
                }}
                onClick={handleOpenThread}
              >
                <ReplyIcon sx={{ fontSize: 14, color: "primary.main" }} />
                <Typography variant="caption" sx={{ color: "primary.main" }}>
                  {post.reply_count}{" "}
                  {post.reply_count === 1 ? "reply" : "replies"}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Message Actions - positioned relative to bubble */}
          {(isHovered || isSelected) && (
            <MessageActions
              post={post}
              visible={isHovered || (isSelected && !isEmojiPanelOpen)}
              onReply={handleReply}
              onEdit={handleStartEdit}
              onDelete={handleDelete}
              inThread={inThread}
              sx={{
                ...(showHeader ? { top: -10 } : { top: -30 }),
              }}
            />
          )}
        </Box>
      </Box>
    );
  },
);

Message.displayName = "Message";
