// src/internal/containers/messages/MessageListContainer.tsx
/**
 * Container for message lists
 * Handles loading, virtualization, and message display for a channel
 */
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useListContainer } from "../base/ListContainer";
import { useMessages } from "../../../hooks";
import { Channel, Message } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import { useWebSocketMessageEvents } from "../../../hooks/useWebSocket";
import MessageListUI from "../../components/messages/MessageListUI";
import MessageItemContainer from "./MessageItemContainer";
import { useDebouncedCallback } from "../../utils/performanceUtils";

export interface MessageListContainerProps {
  /** Channel ID */
  channelId: string;
  /** Channel object (if already available) */
  channel?: Channel;
  /** Whether to enable virtualization for performance */
  virtualized?: boolean;
  /** Whether to show date separators */
  showDateSeparators?: boolean;
  /** Whether to group messages by user */
  groupByUser?: boolean;
  /** Whether to enable message actions */
  enableActions?: boolean;
  /** Whether to show user avatars */
  showAvatars?: boolean;
  /** Whether the view is compact */
  compact?: boolean;
  /** Whether to highlight mentions */
  highlightMentions?: boolean;
  /** Callback when a message is selected */
  onMessageSelect?: (message: Message) => void;
  /** Callback when a message action is performed */
  onMessageAction?: (action: string, message: Message) => void;
  /** Callback when scroll position changes */
  onScroll?: (position: { scrollTop: number; scrollHeight: number }) => void;
  /** Callback when unread marker is visible */
  onUnreadMarkerVisible?: () => void;
  /** CSS class name */
  className?: string;
  /** Material UI's sx prop for styling */
  sx?: any;
  /** ID for the component */
  id?: string;
}

/**
 * Container for message lists
 * Manages message loading, virtualization, and interactions
 */
const MessageListContainer: React.FC<MessageListContainerProps> = (props) => {
  const {
    channelId,
    virtualized = true,
    showDateSeparators = true,
    groupByUser = true,
    enableActions = true,
    showAvatars = true,
    compact = false,
    highlightMentions = true,
    onMessageSelect,
    onScroll,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollPositionRef = useRef(0);
  const isScrolledToBottomRef = useRef(true);

  // Use messages hook for data and operations
  const {
    messages,
    messagesByDate,
    replyToMessage,
    editingMessageId,
    isLoading,
    isFetching,
    deleteMessage,
    togglePin,
    toggleReaction,
    replyTo,
    startEditing,
    refreshMessages,
  } = useMessages(channelId);

  // Use WebSocket events for real-time updates
  useWebSocketMessageEvents(
    channelId,
    useCallback((data, eventType) => {
      // Messages will be updated through the hook automatically
      // This is just to handle any UI-specific reactions to events
      if (isScrolledToBottomRef.current) {
        // Schedule a scroll to bottom on next render
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 0);
      }
    }, []),
  );

  // Use ListContainer for list management
  const [listState, listAPI] = useListContainer({
    items: messages,
    idField: "id",
    displayField: "message",
    searchFields: ["message"],
    emptyMessage: "No messages yet. Start a conversation!",
    initialLoading: isLoading,
    onItemSelect: (message) => {
      if (onMessageSelect) {
        onMessageSelect(message);
      }
    },
  });

  // Update list items when messages change
  useEffect(() => {
    listAPI.setItems(messages);
  }, [messages, listAPI]);

  // Scroll to bottom on initial load or new messages
  useEffect(() => {
    if (!isLoading && !isFetching && isScrolledToBottomRef.current) {
      // Use setTimeout to ensure the DOM has updated
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [messages.length, isLoading, isFetching]);

  // Debounced scroll handler
  const handleScroll = useDebouncedCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 20;

      isScrolledToBottomRef.current = isScrolledToBottom;
      lastScrollPositionRef.current = scrollTop;

      if (onScroll) {
        onScroll({ scrollTop, scrollHeight });
      }
    },
    100,
  );

  // Handle message action
  const handleMessageAction = useCallback(
    (action: string, message: Message) => {
      switch (action) {
        case "reply":
          replyTo(message);
          break;
        case "edit":
          startEditing(message.id);
          break;
        case "delete":
          dialog
            .confirmAsync({
              title: "Delete Message",
              message:
                "Are you sure you want to delete this message? This action cannot be undone.",
              confirmText: "Delete",
              isDestructive: true,
            })
            .then((confirmed) => {
              if (confirmed) {
                deleteMessage(message.id);
              }
            });
          break;
        case "pin":
          togglePin(message.id, !!message.is_pinned);
          break;
        case "react":
          // This would typically open an emoji picker
          // For simplicity, we'll just toggle a default reaction
          toggleReaction(message.id, "thumbsup");
          break;
      }
    },
    [replyTo, startEditing, deleteMessage, togglePin, toggleReaction, dialog],
  );

  // Load more messages when scrolling to top
  const handleLoadMore = useCallback(() => {
    refreshMessages();
  }, [refreshMessages]);

  // Prepare UI props
  const uiProps = {
    messages: listState.items,
    messagesByDate: showDateSeparators ? messagesByDate : undefined,
    isLoading: listState.isLoading,
    virtualized,
    scrollRef,
    compact,
    showAvatars,
    groupByUser,
    highlightMentions,
    onScroll: handleScroll,
    onLoadMore: handleLoadMore,
    renderMessage: (message: Message) => (
      <MessageItemContainer
        key={message.id}
        message={message}
        isEditing={message.id === editingMessageId}
        isReplying={replyToMessage?.id === message.id}
        showActions={enableActions}
        compact={compact}
        onAction={(action) => handleMessageAction(action, message)}
      />
    ),
    className,
    sx,
    id,
  };

  return <MessageListUI {...uiProps} />;
};

export default MessageListContainer;
