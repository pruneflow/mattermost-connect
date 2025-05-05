// src/internal/components/messages/MessageListUI.tsx
/**
 * Component that displays a list of messages with virtualization support
 */
import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Fade,
  Alert,
  useTheme,
} from "@mui/material";
import {
  ArrowDownward as ScrollDownIcon,
  ArrowUpward as LoadMoreIcon,
} from "@mui/icons-material";
import { Message } from "../../../types";
import { BaseComponentProps } from "../../types/componentTypes";
import { EmptyState } from "../common";
import { FixedSizeList, VariableSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { isSameDay } from "date-fns";

export interface MessageListUIProps extends BaseComponentProps {
  /** Messages to display */
  messages: Message[];
  /** Messages grouped by date for better rendering */
  messagesByDate?: Map<string, Message[]>;
  /** Whether messages are loading */
  isLoading?: boolean;
  /** Whether to use virtualization for better performance */
  virtualized?: boolean;
  /** Whether to show date separators */
  showDateSeparators?: boolean;
  /** Whether to group messages by the same user */
  groupByUser?: boolean;
  /** Whether view should be compact */
  compact?: boolean;
  /** Whether to show avatars */
  showAvatars?: boolean;
  /** Element ref for scrolling */
  scrollRef?: React.RefObject<HTMLDivElement>;
  /** Empty state message */
  emptyMessage?: string;
  /** Callback for loading more past messages */
  onLoadMore?: () => void;
  /** Callback for scrolling events */
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  /** Callback when scrolled to bottom */
  onScrollToBottom?: () => void;
  /** Custom render function for messages */
  renderMessage: (message: Message) => React.ReactNode;
}

/**
 * Message List UI Component
 *
 * Displays a list of messages with support for virtualization,
 * date separators, and message grouping
 */
const MessageListUI: React.FC<MessageListUIProps> = ({
  messages,
  messagesByDate,
  isLoading = false,
  virtualized = false,
  showDateSeparators = true,
  groupByUser = true,
  compact = false,
  showAvatars = true,
  scrollRef,
  emptyMessage = "No messages yet",
  onLoadMore,
  onScroll,
  onScrollToBottom,
  renderMessage,
  className,
  sx,
  id,
}) => {
  const theme = useTheme();
  const localScrollRef = useRef<HTMLDivElement>(null);
  const effectiveScrollRef = scrollRef || localScrollRef;

  // State for scroll-to-bottom button visibility
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Track if scrolled to bottom to maintain position on new messages
  const isScrolledToBottomRef = useRef<boolean>(true);

  // Track last scroll height to maintain position when new messages load
  const lastScrollHeightRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);

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

  // Scroll to bottom on mount or when new messages arrive
  useEffect(() => {
    if (!effectiveScrollRef.current) return;

    if (isScrolledToBottomRef.current) {
      scrollToBottom();
    } else {
      // If the user has scrolled up, preserve their scroll position
      const container = effectiveScrollRef.current;
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - lastScrollHeightRef.current;

      if (scrollDiff > 0) {
        container.scrollTop = lastScrollTopRef.current + scrollDiff;
      }
    }

    lastScrollHeightRef.current = effectiveScrollRef.current.scrollHeight;
    lastScrollTopRef.current = effectiveScrollRef.current.scrollTop;
  }, [messages.length]);

  // Handle scroll events
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!effectiveScrollRef.current) return;

    const container = effectiveScrollRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;

    // Check if scrolled to top (load older messages)
    if (scrollTop < 50 && onLoadMore && !isLoading) {
      onLoadMore();
    }

    // Check if scrolled to bottom
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
    isScrolledToBottomRef.current = isAtBottom;

    // Show/hide scroll to bottom button
    setShowScrollToBottom(!isAtBottom);

    // Save scroll position
    lastScrollHeightRef.current = scrollHeight;
    lastScrollTopRef.current = scrollTop;

    // Call parent onScroll if provided
    if (onScroll) {
      onScroll(event);
    }
  };

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (effectiveScrollRef.current) {
      effectiveScrollRef.current.scrollTop =
        effectiveScrollRef.current.scrollHeight;
      isScrolledToBottomRef.current = true;
      setShowScrollToBottom(false);

      if (onScrollToBottom) {
        onScrollToBottom();
      }
    }
  }, [onScrollToBottom]);

  // Should we show a message as grouped with the previous?
  const shouldGroupWithPrevious = (
    currentMsg: Message,
    prevMsg: Message | null,
  ): boolean => {
    if (!groupByUser || !prevMsg) return false;

    const currentDate = new Date(currentMsg.create_at);
    const prevDate = new Date(prevMsg.create_at);

    // Group if: same user, within 5 minutes, and same day
    return (
      currentMsg.user_id === prevMsg.user_id &&
      currentDate.getTime() - prevDate.getTime() < 5 * 60 * 1000 &&
      isSameDay(currentDate, prevDate)
    );
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

  // Prepare message items for rendering with grouping and date separators
  const getMessageItems = (): React.ReactNode[] => {
    if (showDateSeparators && messagesByDate) {
      // Render with date separators using the pre-grouped messages by date
      const items: React.ReactNode[] = [];

      Array.from(messagesByDate.entries()).forEach(
        ([dateStr, dateMessages]) => {
          // Add date separator
          items.push(
            <Box
              key={`date-${dateStr}`}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                my: 2,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: "background.paper",
                  boxShadow: 1,
                }}
              >
                {dateStr}
              </Typography>
            </Box>,
          );

          // Add messages for this date with grouping
          dateMessages.forEach((message, i) => {
            const prevMessage = i > 0 ? dateMessages[i - 1] : null;
            const shouldGroup = shouldGroupWithPrevious(message, prevMessage);

            // Wrap each message in a container that includes grouping information
            items.push(
              <Box
                key={message.id}
                sx={{
                  mt: shouldGroup ? 0.5 : 2,
                }}
                data-grouped={shouldGroup}
                data-message-id={message.id}
              >
                {renderMessage(message)}
              </Box>,
            );
          });
        },
      );

      return items;
    } else {
      // Simple list without date separators
      return messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const shouldGroup = shouldGroupWithPrevious(message, prevMessage);

        return (
          <Box
            key={message.id}
            sx={{
              mt: shouldGroup ? 0.5 : 2,
            }}
            data-grouped={shouldGroup}
            data-message-id={message.id}
          >
            {renderMessage(message)}
          </Box>
        );
      });
    }
  };

  // Virtualized message list for performance with many messages
  const renderVirtualizedList = () => {
    const messageItems = getMessageItems();

    return (
      <AutoSizer>
        {({ height, width }) => (
          <VariableSizeList
            height={height}
            width={width}
            itemCount={messageItems.length}
            itemSize={(index) => {
              // Estimate height based on content type
              // This would need to be more sophisticated in a real implementation
              const item = messageItems[index];
              if (React.isValidElement(item) && item.props["data-message-id"]) {
                return item.props["data-grouped"] ? 50 : 84;
              }
              return 40; // Date separator height
            }}
            overscanCount={5}
            initialScrollOffset={0}
          >
            {({ index, style }) => (
              <div style={style}>{messageItems[index]}</div>
            )}
          </VariableSizeList>
        )}
      </AutoSizer>
    );
  };

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
      {/* Load more button */}
      {onLoadMore && (
        <Box sx={{ p: 1, textAlign: "center" }}>
          <Button
            size="small"
            startIcon={<LoadMoreIcon />}
            onClick={onLoadMore}
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
        ref={effectiveScrollRef}
        sx={{
          flex: 1,
          overflow: "auto",
          p: 2,
        }}
        onScroll={handleScroll}
      >
        {virtualized ? renderVirtualizedList() : getMessageItems()}
      </Box>

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

export default React.memo(MessageListUI);
