// src/internal/components/messages/MessageListUI.tsx
/**
 * Component that displays a list of messages
 */
import React, { useRef, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Fade,
  Divider,
  Alert,
} from "@mui/material";
import {
  ArrowDownward as ScrollDownIcon,
  ArrowUpward as LoadMoreIcon,
} from "@mui/icons-material";
import { Message } from "../../../index";
import { BaseComponentProps } from "../../types/componentTypes";
import MessageItemUI from "./MessageItemUI";
import { EmptyState, TypingIndicator } from "../common";

export interface MessageListUIProps extends BaseComponentProps {
  /** Messages to display */
  messages: Message[];
  /** Whether messages are loading */
  isLoading?: boolean;
  /** Whether more past messages are available */
  hasMorePastMessages?: boolean;
  /** Whether more recent messages are available */
  hasMoreRecentMessages?: boolean;
  /** ID of the highlighted message */
  highlightedMessageId?: string | null;
  /** ID of message being edited */
  editingMessageId?: string | null;
  /** Error message if loading failed */
  error?: Error | string | null;
  /** User display names by user ID */
  userDisplayNames?: Record<string, string>;
  /** User image URLs by user ID */
  userImageUrls?: Record<string, string>;
  /** User statuses by user ID */
  userStatuses?: Record<string, "online" | "away" | "dnd" | "offline">;
  /** IDs of pinned messages */
  pinnedMessageIds?: Set<string>;
  /** Current user ID */
  currentUserId?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Callback for message click */
  onMessageClick?: (message: Message) => void;
  /** Callback for loading more past messages */
  onLoadMorePast?: () => void;
  /** Callback for loading more recent messages */
  onLoadMoreRecent?: () => void;
  /** Callback for edit message */
  onEditMessage?: (message: Message) => void;
  /** Callback for reply to message */
  onReplyToMessage?: (message: Message) => void;
  /** Callback for delete message */
  onDeleteMessage?: (message: Message) => void;
  /** Callback for toggle pin */
  onTogglePin?: (message: Message) => void;
  /** Callback for add reaction */
  onAddReaction?: (message: Message) => void;
  /** Callback for reaction click */
  onReactionClick?: (message: Message, emoji: string) => void;
  /** Callback when scrolled to bottom */
  onScrollToBottom?: () => void;
  /** Custom render function for edit form */
  renderEditForm?: (message: Message) => React.ReactNode;
  /** IDs of users currently typing */
  typingUserIds?: string[];
}

// Helper to format date for separator
const formatDateForSeparator = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const messageDate = new Date(date);
  messageDate.setHours(0, 0, 0, 0);

  if (messageDate.getTime() === today.getTime()) {
    return "Today";
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else {
    return messageDate.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
};

// Check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const MessageListUI: React.FC<MessageListUIProps> = ({
  messages,
  isLoading = false,
  hasMorePastMessages = false,
  hasMoreRecentMessages = false,
  highlightedMessageId = null,
  editingMessageId = null,
  error = null,
  userDisplayNames = {},
  userImageUrls = {},
  userStatuses = {},
  pinnedMessageIds = new Set(),
  currentUserId,
  emptyMessage = "No messages yet",
  onMessageClick,
  onLoadMorePast,
  onLoadMoreRecent,
  onEditMessage,
  onReplyToMessage,
  onDeleteMessage,
  onTogglePin,
  onAddReaction,
  onReactionClick,
  onScrollToBottom,
  renderEditForm,
  typingUserIds = [],
  className,
  sx,
  id,
}) => {
  // State for scroll to bottom button visibility
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Refs for scroll handling
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollHeightRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);
  const isScrolledToBottomRef = useRef<boolean>(true);

  // Parse error message
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : error.toString()
    : null;

  // Scroll to bottom on mount or when new messages arrive
  useEffect(() => {
    if (!containerRef.current) return;

    if (isScrolledToBottomRef.current) {
      scrollToBottom();
    } else {
      // If the user has scrolled up, preserve their scroll position
      const container = containerRef.current;
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - lastScrollHeightRef.current;

      if (scrollDiff > 0) {
        container.scrollTop = lastScrollTopRef.current + scrollDiff;
      }
    }

    lastScrollHeightRef.current = containerRef.current.scrollHeight;
    lastScrollTopRef.current = containerRef.current.scrollTop;
  }, [messages]);

  // Scroll to highlighted message
  useEffect(() => {
    if (highlightedMessageId && containerRef.current) {
      const highlightedElement = document.getElementById(
        `message-${highlightedMessageId}`,
      );
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [highlightedMessageId]);

  // Handle scroll events
  const handleScroll = () => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;

    // Check if scrolled to top (load older messages)
    if (
      scrollTop === 0 &&
      hasMorePastMessages &&
      onLoadMorePast &&
      !isLoading
    ) {
      onLoadMorePast();
    }

    // Check if scrolled to bottom
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
    isScrolledToBottomRef.current = isAtBottom;

    // Show/hide scroll to bottom button
    setShowScrollToBottom(!isAtBottom);

    // Save scroll position
    lastScrollHeightRef.current = scrollHeight;
    lastScrollTopRef.current = scrollTop;
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      isScrolledToBottomRef.current = true;
      setShowScrollToBottom(false);

      if (onScrollToBottom) {
        onScrollToBottom();
      }
    }
  };

  // Handle message click
  const handleMessageClick = (message: Message) => {
    if (onMessageClick) {
      onMessageClick(message);
    }
  };

  // Handle edit message
  const handleEditMessage = (message: Message) => {
    if (onEditMessage) {
      onEditMessage(message);
    }
  };

  // Handle reply to message
  const handleReplyToMessage = (message: Message) => {
    if (onReplyToMessage) {
      onReplyToMessage(message);
    }
  };

  // Handle delete message
  const handleDeleteMessage = (message: Message) => {
    if (onDeleteMessage) {
      onDeleteMessage(message);
    }
  };

  // Handle toggle pin
  const handleTogglePin = (message: Message) => {
    if (onTogglePin) {
      onTogglePin(message);
    }
  };

  // Handle add reaction
  const handleAddReaction = (message: Message) => {
    if (onAddReaction) {
      onAddReaction(message);
    }
  };

  // Handle reaction click
  const handleReactionClick = (message: Message, emoji: string) => {
    if (onReactionClick) {
      onReactionClick(message, emoji);
    }
  };

  // Render loading placeholder
  if (isLoading && messages.length === 0) {
    return (
      <Box
        className={className}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          p: 2,
          ...sx,
        }}
        id={id}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading messages...
        </Typography>
      </Box>
    );
  }

  // Render error state
  if (errorMessage && messages.length === 0) {
    return (
      <Box
        className={className}
        sx={{
          p: 2,
          ...sx,
        }}
        id={id}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
        <Button
          variant="outlined"
          onClick={onLoadMorePast}
          disabled={isLoading}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  // Render empty state
  if (messages.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        description="Be the first to send a message!"
        className={className}
        sx={{
          height: "100%",
          ...sx,
        }}
        id={id}
      />
    );
  }

  // Render message list
  return (
    <Box
      className={className}
      sx={{
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        ...sx,
      }}
      id={id}
    >
      {/* Load more past messages button */}
      {hasMorePastMessages && (
        <Box sx={{ p: 1, textAlign: "center" }}>
          <Button
            size="small"
            startIcon={<LoadMoreIcon />}
            onClick={onLoadMorePast}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load Earlier Messages"}
          </Button>
        </Box>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <Box sx={{ textAlign: "center", p: 1 }}>
          <CircularProgress size={20} />
        </Box>
      )}

      {/* Message container */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          overflow: "auto",
          p: 2,
        }}
        onScroll={handleScroll}
      >
        {messages.map((message, index) => {
          // Check if we should show date separator
          let showDateSeparator = false;
          let dateSeparatorValue = "";

          if (index === 0) {
            // Always show date for first message
            showDateSeparator = true;
            dateSeparatorValue = formatDateForSeparator(
              new Date(message.create_at),
            );
          } else {
            // Check if date changed from previous message
            const prevDate = new Date(messages[index - 1].create_at);
            const currDate = new Date(message.create_at);

            if (!isSameDay(prevDate, currDate)) {
              showDateSeparator = true;
              dateSeparatorValue = formatDateForSeparator(currDate);
            }
          }

          // Get user information
          const userDisplayName =
            userDisplayNames[message.user_id] || "Unknown User";
          const userImageUrl = userImageUrls[message.user_id];
          const userStatus = userStatuses[message.user_id];
          const isPinned = pinnedMessageIds.has(message.id);

          // Determine if compact view
          // This is a simplified approach - typically you'd use more factors
          const isCompact =
            index > 0 &&
            message.user_id === messages[index - 1].user_id &&
            new Date(message.create_at).getTime() -
              new Date(messages[index - 1].create_at).getTime() <
              5 * 60 * 1000; // 5 minutes

          return (
            <MessageItemUI
              key={message.id}
              id={`message-${message.id}`}
              item={message}
              isActive={false}
              showActions={true}
              isLoading={false}
              userDisplayName={userDisplayName}
              userImageUrl={userImageUrl}
              userStatus={userStatus}
              isEditing={message.id === editingMessageId}
              isHighlighted={message.id === highlightedMessageId}
              isPinned={isPinned}
              showDateSeparator={showDateSeparator}
              dateSeparatorValue={dateSeparatorValue}
              showReactions={true}
              currentUserId={currentUserId}
              compact={isCompact}
              editFormComponent={
                renderEditForm ? renderEditForm(message) : undefined
              }
              onClick={() => handleMessageClick(message)}
              onEdit={() => handleEditMessage(message)}
              onReply={() => handleReplyToMessage(message)}
              onDelete={() => handleDeleteMessage(message)}
              onTogglePin={() => handleTogglePin(message)}
              onAddReaction={() => handleAddReaction(message)}
              onReactionClick={(emoji) => handleReactionClick(message, emoji)}
            />
          );
        })}
      </Box>

      {/* Typing indicator */}
      {typingUserIds.length > 0 && (
        <Box sx={{ p: 1, borderTop: "1px solid", borderColor: "divider" }}>
          <TypingIndicator
            userIds={typingUserIds}
            userNames={userDisplayNames}
          />
        </Box>
      )}

      {/* Scroll to bottom button */}
      <Fade in={showScrollToBottom}>
        <Box
          sx={{
            position: "absolute",
            bottom: "16px",
            right: "16px",
            zIndex: 10,
          }}
        >
          <Button
            variant="contained"
            size="small"
            color="primary"
            onClick={scrollToBottom}
            startIcon={<ScrollDownIcon />}
            sx={{ borderRadius: 20 }}
          >
            New Messages
          </Button>
        </Box>
      </Fade>
    </Box>
  );
};

export default MessageListUI;
