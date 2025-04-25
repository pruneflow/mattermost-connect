// src/hooks/useWebSocket.tsx
/**
 * Hooks for WebSocket functionality, focused on unread count management
 */
import { useCallback, useEffect, useRef } from "react";
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

  // Track WebSocket connection status
  const connectionStatusRef = useRef({
    lastConnectedAt: Date.now(),
    hasDisconnected: false,
  });

  // Monitor WebSocket connection status
  useEffect(() => {
    // If we've connected after a disconnection, we may need to refresh data
    if (wsStore.isConnected && connectionStatusRef.current.hasDisconnected) {
      // Reset the disconnection flag
      connectionStatusRef.current.hasDisconnected = false;
      // Todo: Add logic to refresh critical data if needed
    }

    // If we've disconnected, mark the disconnect state
    if (
      !wsStore.isConnected &&
      !wsStore.isConnecting &&
      connectionStatusRef.current.lastConnectedAt > 0
    ) {
      connectionStatusRef.current.hasDisconnected = true;
    }

    // Update last connected time if connected
    if (wsStore.isConnected) {
      connectionStatusRef.current.lastConnectedAt = Date.now();
    }
  }, [wsStore.isConnected, wsStore.isConnecting]);

  return {
    // Connection state
    isConnected: wsStore.isConnected,
    isConnecting: wsStore.isConnecting,
    url: wsStore.url,
    error: wsStore.error,
    reconnectAttempts: wsStore.reconnectAttempts,
    connectionStatus: connectionStatusRef.current,

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
          // If this is the active channel, we'll mark it as read immediately
          // This simulates the behavior of the Mattermost client
          setTimeout(() => {
            markAsRead(channelId);
          }, 2000); // Small delay to ensure message is processed
          return;
        }

        // Increment unread count
        incrementUnreadCount(
          channelId,
          1, // Increment message count by 1
          mentionsUser ? 1 : 0, // Increment mention count if mentioned
          messageId, // Message ID for tracking
        );

        // No need to invalidate queries since we updated the store directly
      },

      // Message edited
      [WebSocketEventType.POST_EDITED]: (data) => {
        const { post, channel_id: channelId } = data;

        if (!post || !channelId || !currentUser) return;

        // Parse the post data
        const postData = typeof post === "string" ? JSON.parse(post) : post;

        // Only process mentions
        // Check if the edit added a mention to the current user
        const mentionsUser =
          postData.props &&
          postData.props.mentions &&
          Array.isArray(postData.props.mentions) &&
          postData.props.mentions.includes(currentUser.id);

        if (mentionsUser) {
          // Get the current unread state for this channel
          const channelUnread = useChannelStore.getState().unreadCounts[
            channelId
          ] || {
            msg_count: 0,
            mention_count: 0,
          };

          // If we're already counting this as unread, just make sure the mention is counted
          if (
            channelUnread.msg_count > 0 &&
            channelUnread.mention_count === 0
          ) {
            incrementUnreadCount(channelId, 0, 1, postData.id); // Just add a mention
          }
        }
      },

      // Channel viewed
      [WebSocketEventType.CHANNEL_VIEWED]: (data) => {
        const { channel_id: channelId, user_id: userId } = data;

        if (!currentUser) return;

        // Only process for current user
        if (userId === currentUser.id && channelId) {
          markAsRead(channelId);
        }
      },

      // Channel marked as read
      ["channel_marked_read"]: (data) => {
        const { channel_id: channelId, user_id: userId } = data;

        if (!currentUser) return;

        // Only process for current user
        if (userId === currentUser.id && channelId) {
          markAsRead(channelId);
        }
      },

      // Team marked as read
      ["team_marked_read"]: (data) => {
        const { team_id: teamId, user_id: userId } = data;

        if (!currentUser || !teamId) return;

        // Only process for current user
        if (userId === currentUser.id) {
          // Mark all channels in this team as read
          const { markAllAsRead } = useChannelStore.getState();
          markAllAsRead(teamId);
        }
      },

      // Handle when a post is deleted (may affect unread counts)
      [WebSocketEventType.POST_DELETED]: (data) => {
        // We currently don't automatically update unread counts for deletions
        // This is consistent with Mattermost's own behavior
      },
    },
    [currentUser, incrementUnreadCount, markAsRead, addProcessedMessageId],
  );

  // Return a WebSocket connection monitoring handler
  return {
    onWebSocketReconnect: () => {
      // When WebSocket reconnects, we might need to refresh unread counts
      // This would be called from the main component that uses this hook
      console.log("WebSocket reconnected - refreshing unread counts");
    },
  };
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
