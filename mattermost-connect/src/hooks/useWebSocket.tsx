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
} from "../core/store/wsStore";
import { WebSocketEventType } from "../types";
import { useAuthStore } from "../core/store/authStore";
import { debounce } from "../utils/performance";

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
      // Todo: Add logic to refresh critical data if needed
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

  // Register handlers for events that affect unread counts
  const eventHandlers = useMemo(() => {
    if (!currentUser) return {};

    return {
      // New message posted
      [WebSocketEventType.POSTED]: (data: any) => {
        const { post, channel_id: channelId } = data;

        if (!post || !channelId) return;

        // Processing logic for new messages...
        // This is delegated to the unreadStore in implementation
      },

      // Message edited
      [WebSocketEventType.POST_EDITED]: (data: any) => {
        const { post, channel_id: channelId } = data;

        if (!post || !channelId) return;

        // Processing logic for edited messages...
        // This is delegated to the unreadStore in implementation
      },

      // Channel viewed
      [WebSocketEventType.CHANNEL_VIEWED]: (data: any) => {
        const { channel_id: channelId, user_id: userId } = data;

        // Only process for current user
        if (userId === currentUser?.id && channelId) {
          // Mark channel as read
          // This is delegated to the unreadStore in implementation
        }
      },
    };
  }, [currentUser]);

  // Setup event handlers
  useWebSocketEvents(eventHandlers, [currentUser?.id]);

  // Return a handler for reconnection events
  return {
    onWebSocketReconnect: useCallback(() => {
      // Refresh unread counts on reconnection
      console.log("WebSocket reconnected - refreshing unread counts");
      // Implementation would typically trigger a refresh of unread counts
    }, []),
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
