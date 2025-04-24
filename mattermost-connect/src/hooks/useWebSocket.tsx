// src/hooks/useWebSocket.tsx
/**
 * Hook for WebSocket functionality
 */
import { useCallback, useEffect } from "react";
import {
  useWsStore,
  registerWsHandler,
  registerWsHandlers,
} from "../core/store/wsStore";
import { wsService, WebSocketEventType } from "../core/services/wsService";
import { useAuthStore } from "../core/store/authStore";

/**
 * Hook that provides WebSocket connection functionality
 * @returns WebSocket state and actions
 */
export function useWebSocket() {
  // Get state from store
  const {
    isConnected,
    isConnecting,
    url,
    error,
    reconnectAttempts,
    lastConnectedAt,
    connect,
    disconnect,
    sendMessage,
  } = useWsStore();

  // Get auth state
  const { token } = useAuthStore();

  /**
   * Connects to the WebSocket server with the current token
   * @param serverUrl WebSocket server URL
   * @returns Promise resolving to void
   */
  const connectWithToken = useCallback(
    async (serverUrl: string) => {
      if (!token) {
        throw new Error("Authentication token is required to connect");
      }

      return connect(serverUrl, token);
    },
    [token, connect],
  );

  /**
   * Reconnects to the WebSocket server
   * @returns Promise resolving to void
   */
  const reconnect = useCallback(async () => {
    if (!url || !token) {
      throw new Error("URL and token are required to reconnect");
    }

    disconnect();
    return connect(url, token);
  }, [url, token, connect, disconnect]);

  return {
    // State
    isConnected,
    isConnecting,
    url,
    error,
    reconnectAttempts,
    lastConnectedAt,

    // Actions
    connect: connectWithToken,
    disconnect,
    reconnect,
    sendMessage,
  };
}

/**
 * Hook that registers WebSocket event handlers
 * @param eventHandlers Record of event types to handler functions
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
 * Specialized hook for message events
 * @param handler Handler function for new messages
 */
export function useWebSocketMessageEvents(
  handler: (data: any) => void,
  deps: any[] = [],
) {
  useWebSocketEvent(WebSocketEventType.POSTED, handler, deps);
  useWebSocketEvent(WebSocketEventType.POST_EDITED, handler, deps);
  useWebSocketEvent(WebSocketEventType.POST_DELETED, handler, deps);
}

/**
 * Specialized hook for reaction events
 * @param handler Handler function for reaction events
 */
export function useWebSocketReactionEvents(
  handler: (data: any) => void,
  deps: any[] = [],
) {
  useWebSocketEvent(WebSocketEventType.REACTION_ADDED, handler, deps);
  useWebSocketEvent(WebSocketEventType.REACTION_REMOVED, handler, deps);
}

/**
 * Specialized hook for channel events
 * @param handler Handler function for channel events
 */
export function useWebSocketChannelEvents(
  handler: (data: any) => void,
  deps: any[] = [],
) {
  useWebSocketEvent(WebSocketEventType.CHANNEL_VIEWED, handler, deps);
  useWebSocketEvent(WebSocketEventType.CHANNEL_CREATED, handler, deps);
  useWebSocketEvent(WebSocketEventType.CHANNEL_UPDATED, handler, deps);
  useWebSocketEvent(WebSocketEventType.CHANNEL_DELETED, handler, deps);
  useWebSocketEvent(WebSocketEventType.CHANNEL_MEMBER_UPDATED, handler, deps);
}

/**
 * Specialized hook for user events
 * @param handler Handler function for user events
 */
export function useWebSocketUserEvents(
  handler: (data: any) => void,
  deps: any[] = [],
) {
  useWebSocketEvent(WebSocketEventType.USER_ADDED, handler, deps);
  useWebSocketEvent(WebSocketEventType.USER_REMOVED, handler, deps);
  useWebSocketEvent(WebSocketEventType.USER_UPDATED, handler, deps);
  useWebSocketEvent(WebSocketEventType.STATUS_CHANGE, handler, deps);
}

/**
 * Specialized hook for team events
 * @param handler Handler function for team events
 */
export function useWebSocketTeamEvents(
  handler: (data: any) => void,
  deps: any[] = [],
) {
  useWebSocketEvent(WebSocketEventType.ADDED_TO_TEAM, handler, deps);
  useWebSocketEvent(WebSocketEventType.LEAVE_TEAM, handler, deps);
  useWebSocketEvent(WebSocketEventType.UPDATE_TEAM, handler, deps);
  useWebSocketEvent(WebSocketEventType.DELETE_TEAM, handler, deps);
}

/**
 * Hook that registers a handler for typing events
 * @param channelId Channel ID to listen for typing events
 * @param handler Handler function for typing events
 */
export function useWebSocketTypingEvents(
  channelId: string | undefined,
  handler: (data: { user_id: string; parent_id?: string }) => void,
  deps: any[] = [],
) {
  useWebSocketEvent(
    WebSocketEventType.TYPING,
    (data) => {
      // Only trigger handler if the typing event is for the specified channel
      if (data.channel_id === channelId) {
        handler(data);
      }
    },
    [channelId, ...deps],
  );
}

/**
 * Hook that sends a typing indicator
 * @param channelId Channel ID to send typing indicator for
 * @returns Function to send typing indicator
 */
export function useTypingIndicator(channelId: string | undefined) {
  const { sendMessage } = useWsStore();
  const { currentUser } = useAuthStore();

  /**
   * Sends a typing indicator
   * @param parentId Optional parent ID for thread typing
   */
  const sendTypingEvent = useCallback(
    (parentId?: string) => {
      if (!channelId || !currentUser) return;

      sendMessage({
        action: "user_typing",
        data: {
          channel_id: channelId,
          parent_id: parentId || "",
        },
      });
    },
    [channelId, currentUser, sendMessage],
  );

  return sendTypingEvent;
}
