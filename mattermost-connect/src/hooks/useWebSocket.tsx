// src/hooks/useWebSocket.tsx
/**
 * Hooks for WebSocket functionality
 * Provides optimized React hooks for working with WebSockets
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useWsStore,
  registerWsHandler,
  registerWsHandlers,
  useAuthStore,
  useUnreadStore,
  useMessageStore,
  useChannelStore,
} from "../core/store";
import { WebSocketEventType } from "../types";
import { debounce } from "../utils/performance";
import { unreadService } from "../core/services/unreadService";

/**
 * Hook for general WebSocket functionality
 * Provides connection state and methods to interact with the WebSocket connection
 *
 * @returns Object with WebSocket state and methods
 */
export function useWebSocket() {
  // Get state and methods from the WebSocket store
  const {
    isConnected,
    isConnecting,
    url,
    error,
    reconnectAttempts,
    lastConnectedAt,
    lastDisconnectedAt,
    hasBeenDisconnected,
    connect,
    disconnect,
    reconnect,
    sendMessage,
  } = useWsStore();

  // Track WebSocket connection status for reconnection logic
  const connectionStatusRef = useRef({
    lastConnectedAt: Date.now(),
    hasDisconnected: false,
  });

  // Monitor WebSocket connection status
  useEffect(() => {
    // If we've connected after a disconnection, we may need to refresh data
    if (isConnected && connectionStatusRef.current.hasDisconnected) {
      // Reset the disconnection flag
      connectionStatusRef.current.hasDisconnected = false;
    }

    // If we've disconnected, mark the disconnect state
    if (
      !isConnected &&
      !isConnecting &&
      connectionStatusRef.current.lastConnectedAt > 0
    ) {
      connectionStatusRef.current.hasDisconnected = true;
    }

    // Update last connected time if connected
    if (isConnected) {
      connectionStatusRef.current.lastConnectedAt = Date.now();
    }
  }, [isConnected, isConnecting]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    url,
    error,
    reconnectAttempts,
    lastConnectedAt,
    lastDisconnectedAt,
    hasBeenDisconnected,
    connectionStatus: {
      lastConnectedAt: connectionStatusRef.current.lastConnectedAt,
      hasDisconnected: connectionStatusRef.current.hasDisconnected,
    },

    // Connection methods
    connect,
    disconnect,
    reconnect,
    sendMessage,
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
  const debouncedSendTyping = useMemo(
    () =>
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
      }, 1000), // Debounce for 1 second
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

/**
 * Hook for handling unread-related WebSocket events
 * @returns WebSocket handlers for unread events
 */
export function useUnreadWebSocketEvents() {
  const { currentUser } = useAuthStore();
  const { incrementUnreadCount, markAsRead, updateUnreadCount } =
    useUnreadStore();
  const { addMessage, updateMessage } = useMessageStore();

  // Register handlers for events that affect unread counts
  const eventHandlers = useMemo(() => {
    // Only create handlers if we have a current user
    // This ensures we don't perform any actions when not authenticated
    if (!currentUser) {
      // Return empty object that satisfies the Record<string, MessageHandler<any>> type
      return {} as Record<string, (data: any) => void>;
    }

    return {
      // New message posted
      [WebSocketEventType.POSTED]: (data: any) => {
        const { post: postData, channel_id: channelId } = data;

        if (!postData || !channelId) return;

        try {
          // Parse post data if it's a string
          const post =
            typeof postData === "string" ? JSON.parse(postData) : postData;

          // Skip if message is from the current user
          if (post.user_id === currentUser.id) return;

          // Add the message to our store
          addMessage(post);

          // Check if this is the active channel - if so, we might want to mark as read after a delay
          const activeChannel = useChannelStore.getState().activeChannel;
          if (activeChannel?.id === channelId) {
            // For active channel, mark as read after a short delay
            setTimeout(() => markAsRead(channelId), 2000);
            return;
          }

          // Check for mentions
          const mentionsUser = unreadService.messageContainsMention(
            post,
            currentUser.id,
          );

          // Increment unread counts - one message, and mentionCount if mentioned
          incrementUnreadCount(
            channelId,
            1, // One new message
            mentionsUser ? 1 : 0, // Increment mentions if user is mentioned
            post.id, // Message ID for tracking
          );
        } catch (err) {
          console.error("Error processing new message event:", err);
        }
      },

      // Message edited
      [WebSocketEventType.POST_EDITED]: (data: any) => {
        const { post: postData, channel_id: channelId } = data;

        if (!postData || !channelId) return;

        try {
          // Parse post data if it's a string
          const post =
            typeof postData === "string" ? JSON.parse(postData) : postData;

          // Update the message in our store
          updateMessage(post);

          // If this post now mentions the user but didn't before, we need to update unread counts
          const mentionsUser = unreadService.messageContainsMention(
            post,
            currentUser.id,
          );

          if (mentionsUser) {
            // Get current unread count
            const unreadCount = useUnreadStore
              .getState()
              .getChannelUnreadCount(channelId);

            // If we weren't already mentioned, increment mention count
            if (unreadCount.mention_count === 0) {
              updateUnreadCount(
                channelId,
                unreadCount.msg_count,
                unreadCount.mention_count + 1,
                post.id,
                unreadCount.lastViewedAt,
              );
            }
          }
        } catch (err) {
          console.error("Error processing message edit event:", err);
        }
      },

      // Channel viewed
      [WebSocketEventType.CHANNEL_VIEWED]: (data: any) => {
        const { channel_id: channelId, user_id: userId } = data;

        // Only process for current user's events
        if (userId === currentUser.id && channelId) {
          // Mark channel as read
          markAsRead(channelId);
        }
      },
    };
  }, [
    currentUser,
    addMessage,
    updateMessage,
    incrementUnreadCount,
    markAsRead,
    updateUnreadCount,
  ]);

  // Only setup event handlers if we have a current user
  useEffect(() => {
    if (!currentUser) return;

    // Register handlers
    const unregister = registerWsHandlers(eventHandlers);

    // Clean up on unmount
    return () => {
      unregister();
    };
  }, [currentUser, eventHandlers]);

  // Handle reconnection events
  const handleReconnect = useCallback(() => {
    // Only process when user is authenticated
    if (!currentUser) return;

    // On reconnection, we should refresh unread counts from the server
    const channels = Object.values(
      useChannelStore.getState().channelsByTeam,
    ).flat();

    // For each channel, we could fetch the current unread status from the server
    channels.forEach((channel) => {
      // Here we would typically make an API call to get the latest unread count
      // This is just a placeholder for the actual implementation
      const unreadStatus = {
        msg_count: 0,
        mention_count: 0,
        lastViewedAt: Date.now(),
      };

      // Update our local state
      updateUnreadCount(
        channel.id,
        unreadStatus.msg_count,
        unreadStatus.mention_count,
        undefined,
        unreadStatus.lastViewedAt,
      );
    });

    console.log("WebSocket reconnected - refreshed unread counts");
  }, [currentUser, updateUnreadCount]);

  return {
    onWebSocketReconnect: handleReconnect,
  };
}

/**
 * Hook for monitoring WebSocket connection state changes
 * @param onConnect Callback for connection events
 * @param onDisconnect Callback for disconnection events
 * @param deps Dependencies for the callbacks
 */
export function useWebSocketConnectionMonitor(
  onConnect?: () => void,
  onDisconnect?: () => void,
  deps: any[] = [],
) {
  const { isConnected } = useWsStore();
  const wasConnectedRef = useRef(isConnected);

  useEffect(() => {
    // Connection state changed
    if (!wasConnectedRef.current && isConnected) {
      // Connected
      if (onConnect) onConnect();
    } else if (wasConnectedRef.current && !isConnected) {
      // Disconnected
      if (onDisconnect) onDisconnect();
    }

    // Update ref
    wasConnectedRef.current = isConnected;
  }, [isConnected, onConnect, onDisconnect, ...deps]);

  return {
    isConnected,
    wasConnected: wasConnectedRef.current,
  };
}
