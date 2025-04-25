// src/hooks/useWebSocket.tsx
/**
 * Hooks for WebSocket functionality, focused on unread count management
 */
import { useCallback, useEffect } from "react";
import {
  registerWsHandler,
  registerWsHandlers,
  useWsStore,
} from "../core/store/wsStore";
import { WebSocketEventType } from "../core/services/wsService";
import { useAuthStore } from "../core/store/authStore";
import { useChannelStore } from "../core/store/channelStore";
import { invalidateQueries } from "../core/api/queryClient";
import { debounce } from "../utils/mattermostUtils";

/**
 * Hook for general WebSocket functionality
 * Provides connection state and methods to interact with the WebSocket connection
 *
 * @returns Object with WebSocket state and methods
 */
export function useWebSocket() {
  // Get state and methods from the WebSocket store
  const wsStore = useWsStore();

  return {
    // Connection state
    isConnected: wsStore.isConnected,
    isConnecting: wsStore.isConnecting,
    url: wsStore.url,
    error: wsStore.error,
    reconnectAttempts: wsStore.reconnectAttempts,

    // Connection methods
    connect: wsStore.connect,
    disconnect: wsStore.disconnect,
    sendMessage: wsStore.sendMessage,
  };
}

/**
 * Hook for handling unread-related WebSocket events
 * @returns WebSocket handlers for unread events
 */
export function useUnreadWebSocketEvents() {
  const { currentUser } = useAuthStore();
  const { incrementUnreadCount, markAsRead, addProcessedMessageId } =
    useChannelStore();

  // Register handlers for events that affect unread counts
  useWebSocketEvents(
    {
      // New message posted
      [WebSocketEventType.POSTED]: (data) => {
        const { post, channel_id: channelId } = data;

        if (!post || !channelId || !currentUser) return;

        // Parse the post data
        const postData = typeof post === "string" ? JSON.parse(post) : post;

        // Don't increment for own messages
        if (postData.user_id === currentUser.id) return;

        // Avoid duplicate processing by checking if we've already processed this message
        const messageId = postData.id;
        if (messageId && addProcessedMessageId) {
          // If we've already processed this message, don't do it again
          const processedIds = useChannelStore.getState().processedMessageIds;
          if (processedIds.has(messageId)) {
            return;
          }

          // Mark this message as processed
          addProcessedMessageId(messageId);
        }

        // Check if this message mentions the current user
        const mentionsUser =
          postData.props &&
          postData.props.mentions &&
          Array.isArray(postData.props.mentions) &&
          postData.props.mentions.includes(currentUser.id);

        // Get the active channel - don't increment if this is the active channel
        const activeChannel = useChannelStore.getState().activeChannel;
        if (activeChannel && activeChannel.id === channelId) {
          // Even though we don't increment, we still need to mark the message as processed
          return;
        }

        // Increment unread count
        incrementUnreadCount(
          channelId,
          1, // Increment message count by 1
          mentionsUser ? 1 : 0, // Increment mention count if mentioned
          messageId, // Message ID for tracking
          mentionsUser, // Flag that user is mentioned for specific handling
        );

        // Invalidate related queries
        invalidateQueries.channelUnreadCount(channelId);
      },

      // Channel viewed
      [WebSocketEventType.CHANNEL_VIEWED]: (data) => {
        const { channel_id: channelId, user_id: userId } = data;

        if (!currentUser) return;

        // Only process for current user
        if (userId === currentUser.id && channelId) {
          markAsRead(channelId);
          invalidateQueries.channelUnreadCount(channelId);
        }
      },

      // Channel marked as read
      ["channel_marked_read"]: (data) => {
        const { channel_id: channelId, user_id: userId } = data;

        if (!currentUser) return;

        // Only process for current user
        if (userId === currentUser.id && channelId) {
          markAsRead(channelId);
          invalidateQueries.channelUnreadCount(channelId);
        }
      },

      // Handle when a post is edited (update may affect mentions)
      [WebSocketEventType.POST_EDITED]: (data) => {
        const { post, channel_id: channelId } = data;

        if (!post || !channelId) return;

        // We don't automatically update unread counts for edits
        // But we do invalidate the cache to ensure accurate data on next fetch
        invalidateQueries.channelMessages(channelId);
      },

      // Handle when a post is deleted (may affect unread counts)
      [WebSocketEventType.POST_DELETED]: (data) => {
        const { post, channel_id: channelId } = data;

        if (!post || !channelId) return;

        // We don't automatically update unread counts for deletions
        // But we do invalidate the cache to ensure accurate data on next fetch
        invalidateQueries.channelMessages(channelId);
      },
    },
    [currentUser, incrementUnreadCount, markAsRead, addProcessedMessageId],
  );
}

/**
 * Hook that registers WebSocket event handlers
 * @param eventType Event type to handle
 * @param handler Handler function
 * @param deps Dependencies for handler
 */
export function useWebSocketEvent<T = any>(
  eventType: string,
  handler: (data: T) => void,
  deps: any[] = [],
) {
  useEffect(() => {
    // Register handler
    const unregister = registerWsHandler(eventType, handler);

    // Clean up on unmount
    return () => {
      unregister();
    };
  }, [eventType, ...deps]);
}

/**
 * Hook that registers multiple WebSocket event handlers
 * @param eventHandlers Record of event types to handler functions
 * @param deps Dependencies for handlers
 */
export function useWebSocketEvents(
  eventHandlers: Record<string, (data: any) => void>,
  deps: any[] = [],
) {
  useEffect(() => {
    // Register handlers
    const unregister = registerWsHandlers(eventHandlers);

    // Clean up on unmount
    return () => {
      unregister();
    };
  }, [...deps]);
}

/**
 * Hook for handling message-related WebSocket events (new messages, edits, deletes)
 * @param handler Callback function for message events
 * @param deps Dependencies for the hook
 */
export function useWebSocketMessageEvents(
  handler: (data: any) => void,
  deps: any[] = [],
) {
  useEffect(() => {
    // Register handlers for message events
    return registerWsHandlers({
      [WebSocketEventType.POSTED]: handler,
      [WebSocketEventType.POST_EDITED]: handler,
      [WebSocketEventType.POST_DELETED]: handler,
    });
  }, deps);
}

/**
 * Hook for handling typing indicator WebSocket events
 * @param channelId Channel ID to listen for typing events
 * @param handler Callback function for typing events
 * @param deps Dependencies for the hook
 */
export function useWebSocketTypingEvents(
  channelId: string,
  handler: (data: any) => void,
  deps: any[] = [],
) {
  useEffect(() => {
    if (!channelId) return;

    // Register handler for typing events
    return registerWsHandler(WebSocketEventType.TYPING, (data) => {
      if (data.channel_id === channelId) {
        handler(data);
      }
    });
  }, [channelId, ...deps]);
}

/**
 * Hook that provides a function to send typing indicator events
 * @param channelId Channel ID where typing is occurring
 * @returns Function to call when user is typing
 */
export function useTypingIndicator(channelId: string | undefined) {
  // Access the WebSocket store to get connection state and message sending function
  const { isConnected, sendMessage } = useWsStore();

  // Get current user information
  const { currentUser } = useAuthStore();

  // Create a debounced function to avoid sending too many events
  const debouncedSendTyping = useCallback(
    debounce((rootId?: string) => {
      // Only send if we have necessary data and an active connection
      if (!channelId || !currentUser || !isConnected) {
        return;
      }

      // Send the typing event through WebSocket
      sendMessage({
        action: "user_typing",
        data: {
          channel_id: channelId,
          parent_id: rootId || "", // For thread replies
          user_id: currentUser.id,
        },
      });
    }, 1000), // Debounce for 1 second (don't send events too frequently)
    [channelId, currentUser, isConnected, sendMessage],
  );

  // Return a function that components can call when user is typing
  return useCallback(
    (rootId?: string) => {
      debouncedSendTyping(rootId);
    },
    [debouncedSendTyping],
  );
}
