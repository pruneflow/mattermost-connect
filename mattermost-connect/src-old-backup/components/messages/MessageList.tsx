import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Divider,
  Paper,
  Button,
  IconButton,
  Menu,
  MenuItem,
  SxProps,
  Theme,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  Reply as ReplyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useMessages } from "../../hooks/useMessages";
import { useUser } from "../../hooks/useUsers";
import { useUnreadCounts } from "../../hooks/useUnreadCounts";
import { useChannels } from "../../hooks/useChannels";
import { useChannelMember } from "../../hooks/useChannelMember";
import { useAuth } from "../../context/AuthContext";
import { Message as MessageType, MessageReaction } from "../../api/types";
import {
  formatRelativeTime,
  formatUserName,
  formatTime,
} from "../../utils/formatters";
import Message from "./Message";
import MessageReactions from "./MessageReactions";
import MessageAttachment from "./MessageAttachment";
import MessageHeader from "./MessageHeader";
import Markdown from "../common/Markdown";

export interface MessageListProps {
  channelId: string;
  currentUserId?: string;
  onReplyMessage?: (message: MessageType) => void;
  onOpenThread?: (messageId: string) => void;
}

export function MessageList({
  channelId,
  currentUserId,
  onReplyMessage,
  onOpenThread,
}: MessageListProps) {
  // State and refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(
    null,
  );

  // Get messages for this channel
  const {
    messages,
    isLoading,
    hasOlderMessages,
    hasNewerMessages,
    loadingMore,
    loadMore,
    loadNewer,
    refetch,
    updateMessage,
    deleteMessage,
    // Nouvelles propriétés pour le scroll intelligent
    updateScrollPosition,
    isAtBottom: hookIsAtBottom,
    lastViewedAt,
    getUnreadDividerPosition,
    markChannelAsViewed,
  } = useMessages(channelId, currentUserId);

  // Get current user and channel member data for smart scrolling
  const { user: currentUser } = useAuth();
  const { data: channelMember } = useChannelMember({
    channelId,
    userId: currentUser?.id || "",
    enabled: !!currentUser?.id && !!channelId,
  });
  console.debug("channelMember", channelMember);
  const memberLastViewedAt = channelMember?.last_viewed_at;

  // Unread counts pour éviter les appels inutiles au view endpoint
  const { getChannelUnreadCount } = useUnreadCounts();
  const unreadCount = getChannelUnreadCount(channelId);

  // Utiliser l'état isAtBottom du hook useMessages comme source unique
  const isAtBottom = hookIsAtBottom;

  // État pour suivre si nous avons récemment changé de canal
  const [recentChannelChange, setRecentChannelChange] = useState(false);

  // Ref pour le divider des nouveaux messages (scroll intelligent)
  const unreadDividerRef = useRef<HTMLDivElement>(null);

  // État pour savoir si on a déjà fait le scroll initial vers le dernier message non lu
  const [initialScrollDone, setInitialScrollDone] = useState(false);

  // Smart auto-scroll: only when user is at bottom of conversation
  useEffect(() => {
    // Only auto-scroll if user is at bottom AND we have messages AND not loading more older messages
    if (!isLoading && !loadingMore && messages.length > 0 && isAtBottom) {
      // Wait for render to complete
      const timeoutId = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        }
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, isLoading, loadingMore, isAtBottom]);

  // Channel change effect: reset states when switching channels
  useEffect(() => {
    if (channelId) {
      setRecentChannelChange(true);
      setInitialScrollDone(false);
      // REMOVED: updateScrollPosition(true) - don't force bottom scroll, let smart scroll handle it

      // Reset flag after delay
      setTimeout(() => setRecentChannelChange(false), 2000);
    }
  }, [channelId]);

  // Smart scroll effect: Mattermost-like positioning
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !initialScrollDone) {
      // Check if we have unread messages using channel member data
      if (memberLastViewedAt && unreadCount > 0) {
        // Find unread divider position
        const unreadDividerIndex = getUnreadDividerPosition(memberLastViewedAt);
        if (unreadDividerIndex >= 0) {
          // Scroll to unread divider (like Mattermost)
          setTimeout(() => {
            if (unreadDividerRef.current) {
              unreadDividerRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              updateScrollPosition(false);
            }
          }, 300);
          setInitialScrollDone(true);
          return;
        }
      }

      // Default: scroll to bottom
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
          updateScrollPosition(true);
        }
      }, 300);

      setInitialScrollDone(true);
    }
  }, [
    isLoading,
    messages.length,
    initialScrollDone,
    memberLastViewedAt,
    unreadCount,
    getUnreadDividerPosition,
    updateScrollPosition,
  ]);

  // Group messages by date for better UI presentation
  const groupedMessages = React.useMemo(() => {
    const groups: Record<string, typeof messages> = {};

    // Make sure messages is an array before using forEach
    if (!Array.isArray(messages)) {
      return groups;
    }

    messages.forEach((message) => {
      // Use create_at to group by date (ignoring time)
      const date = new Date(message.create_at);
      const dateString = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
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
      return "Today";
    }

    // Check if date is yesterday
    if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return "Yesterday";
    }

    // Otherwise, format the date
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  // Handle scroll to track position and load more messages
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    // Check if user is at or near bottom (within 100px)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    updateScrollPosition(isNearBottom);

    // Removed: markChannelAsViewed call here - it's already handled in useMessages hook when switching channels

    // Load more when scrolled near the top
    if (scrollTop < 50 && hasOlderMessages && !loadingMore && !isLoading) {
      void loadMore();
    }
  };

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        overflowY: "auto",
        px: 3,
        pt: 4,
        pb: 2,
        boxSizing: "border-box",
      }}
      onScroll={handleScroll}
    >
      {/* Loading more indicator at top */}
      {loadingMore && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Load More (older messages) button */}
      {hasOlderMessages && !loadingMore && messages.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <Button variant="outlined" size="small" onClick={() => loadMore()}>
            Load Older Messages
          </Button>
        </Box>
      )}

      {/* Initial loading state */}
      {isLoading && !loadingMore && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty state */}
      {!isLoading && !loadingMore && messages.length === 0 && (
        <Box sx={{ textAlign: "center", p: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No messages yet. Start the conversation!
          </Typography>
        </Box>
      )}

      {/* Messages grouped by date */}
      {sortedDates.map((date) => (
        <Box key={date} sx={{ mb: 2 }}>
          {/* Date header */}
          <Box sx={{ display: "flex", alignItems: "center", my: 2 }}>
            <Divider sx={{ flex: 1, mr: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {formatDateHeader(date)}
            </Typography>
            <Divider sx={{ flex: 1, ml: 2 }} />
          </Box>

          {/* Messages for this date - sorted in chronological order (oldest to newest) */}
          {groupedMessages[date]
            .sort((a, b) => a.create_at - b.create_at) // Sort by create_at in ascending order
            .map((message: any, index: number) => {
              const unreadDividerIndex =
                getUnreadDividerPosition(memberLastViewedAt);
              const globalMessageIndex = messages.findIndex(
                (m) => m.id === message.id,
              );
              // Divider should be placed AFTER the last read message
              const isUnreadDivider =
                unreadDividerIndex >= 0 &&
                globalMessageIndex === unreadDividerIndex;

              const handleReply = () => {
                onReplyMessage && onReplyMessage(message);
              };
              const handleOpenThread = () => {
                onOpenThread && onOpenThread(message.id);
              };

              return (
                <React.Fragment key={message.id}>
                  <MessageItem
                    messageId={message.id}
                    userId={message.user_id}
                    content={message.message}
                    timestamp={message.create_at}
                    channelId={channelId}
                    reactions={message.reactions || {}} // Source unique: message.reactions
                    isCurrentUser={currentUserId === message.user_id}
                    hasReplies={
                      messages.some(
                        (m) => m.root_id === message.id && m.id !== message.id,
                      ) ||
                      // Also check if message has replies count in its metadata/props
                      (message.reply_count && message.reply_count > 0)
                    }
                    replyCount={
                      // Use reply_count from message metadata if available (preferred)
                      message.reply_count && message.reply_count > 0
                        ? message.reply_count
                        : // Otherwise, count replies manually from the messages array
                          messages.reduce(
                            (count, m) =>
                              m.root_id === message.id && m.id !== message.id
                                ? count + 1
                                : count,
                            0,
                          )
                    }
                    fileIds={message.file_ids}
                    onReply={handleReply}
                    onOpenThread={handleOpenThread}
                    onEdit={async (messageId, newContent) => {
                      try {
                        await updateMessage({
                          id: messageId,
                          message: newContent,
                        });
                        return Promise.resolve();
                      } catch (error) {
                        console.error("Failed to update message:", error);
                        return Promise.reject(error);
                      }
                    }}
                    onDelete={async (messageId) => {
                      try {
                        await deleteMessage(messageId);
                        return Promise.resolve();
                      } catch (error) {
                        console.error("Failed to delete message:", error);
                        return Promise.reject(error);
                      }
                    }}
                  />
                  {/* Divider pour les nouveaux messages - placé APRÈS le dernier message lu */}
                  {isUnreadDivider && (
                    <Box ref={unreadDividerRef} sx={{ my: 2 }}>
                      <Divider
                        sx={{
                          "&::before, &::after": {
                            borderColor: "error.main",
                            borderWidth: "2px",
                          },
                        }}
                      >
                        <Typography
                          variant="body2"
                          color="error.main"
                          sx={{
                            px: 2,
                            fontWeight: "bold",
                            bgcolor: "background.paper",
                          }}
                        >
                          {unreadCount > 0
                            ? unreadCount === 1
                              ? "1 new message"
                              : `${unreadCount} new messages`
                            : "New messages"}
                        </Typography>
                      </Divider>
                    </Box>
                  )}
                </React.Fragment>
              );
            })}
        </Box>
      ))}

      {/* Load Newer Messages button at bottom */}
      {hasNewerMessages && !loadingMore && messages.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <Button variant="outlined" size="small" onClick={() => loadNewer()}>
            Load Newer Messages
          </Button>
        </Box>
      )}

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
  sx?: SxProps<Theme>;
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
  sx = {},
}: MessageItemProps) {
  // Theme for responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Get user data for the message author
  const { user, isLoading } = useUser(userId);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [actionsVisible, setActionsVisible] = useState(false);

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
    if (onEdit && editedContent.trim() !== "") {
      try {
        await onEdit(messageId, editedContent);
        setIsEditing(false);
      } catch (error) {
        console.error("Failed to update message:", error);
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
        console.error("Failed to delete message:", error);
      }
    }
  };

  // Handle key press in edit mode
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <Box
      sx={{
        maxWidth: isMobile ? "90%" : "80%",
        ml: isCurrentUser ? "auto" : 0,
        mr: isCurrentUser ? 0 : "auto",
        mb: 2,
        ...sx,
      }}
      onMouseEnter={() => !isMobile && setActionsVisible(true)}
      onMouseLeave={() => !isMobile && setActionsVisible(false)}
    >
      <Paper
        elevation={0}
        sx={{
          p: isMobile ? "4px" : 2,
          px: isMobile ? "4px" : 2,
          maxWidth: "100%",
          bgcolor: isCurrentUser
            ? "rgba(140, 180, 255, 0.15)"
            : "rgba(0, 0, 0, 0.03)",
          borderRadius: 2,
          position: "relative",
        }}
      >
        {/* Message header - using new MessageHeader component */}
        <MessageHeader
          messageId={messageId}
          channelId={channelId}
          username={isLoading ? "Loading..." : formatUserName(user)}
          userId={userId}
          timestamp={timestamp.toString()}
          messageText={content}
          showDate={!isMobile}
          showAvatar={true}
          showActions={true}
          actionsVisible={actionsVisible || isMobile}
          onReply={onReply}
          onEdit={onEdit ? (newText) => onEdit(messageId, newText) : undefined}
          onDelete={onDelete ? () => onDelete(messageId) : undefined}
        />

        {/* Message content - always readonly, editing handled by MessageHeader */}
        <Box sx={{ wordBreak: "break-word", mt: isMobile ? 0.5 : 1 }}>
          <Markdown content={content} />
        </Box>

        {/* Time display (bottom right) */}
        <Typography
          variant="caption"
          sx={{
            position: "absolute",
            bottom: 4,
            right: 8,
            color: "text.secondary",
            fontSize: "0.75rem",
            lineHeight: 1,
          }}
        >
          {formatTime(timestamp)}
        </Typography>
      </Paper>

      {/* Interactive elements outside message container */}
      {!isEditing && (
        <Box
          sx={{
            mt: 1,
            ml: isCurrentUser ? "auto" : "0.5rem",
            mr: isCurrentUser ? "0.5rem" : "auto",
            width: "calc(100% - 1rem)",
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {/* Thread button and reactions on the same row */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            {/* Thread button - only visible when there are replies or onOpenThread handler exists */}
            {onOpenThread && (hasReplies || replyCount > 0) ? (
              <Button
                onClick={onOpenThread}
                variant="outlined"
                size="small"
                startIcon={<ReplyIcon fontSize="small" />}
                sx={{
                  borderRadius: "16px",
                  textTransform: "none",
                  fontSize: "0.875rem",
                  p: "4px 12px",
                  minWidth: "auto",
                }}
              >
                {replyCount === 1 ? "1 reply" : `${replyCount} replies`}
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
            <Box
              sx={{
                width: "100%",
              }}
            >
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
