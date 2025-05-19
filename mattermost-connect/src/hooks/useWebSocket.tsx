// src/hooks/useWebSocket.tsx
/**
 * WebSocket hooks
 * Provides access to WebSocket functionality
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useWsStore } from "../core/store/wsStore";
import {
  WebSocketEventType,
  WebSocketMessage,
  WebSocketListenerOptions,
  TypingData,
} from "../types";
import { handleError } from "../core/store/errorStore";
import { ErrorSource } from "../types";
import { useAuthStore } from "../core/store/authStore";
import { useUserStore } from "../core/store";
import { ensureChannelEventHandlers } from "../core/services/channelWebSocketHandler";

/**
 * Hook for WebSocket connection management
 * @returns WebSocket connection functionality
 */
export function useWebSocket() {
  const {
    isConnected,
    isConnecting,
    url,
    error,
    connect,
    disconnect,
    reconnect,
    hasBeenDisconnected,
  } = useWsStore();

  const { token, serverUrl } = useAuthStore();

  /**
   * Connects to the WebSocket server
   * @param wsUrl WebSocket URL (optional, uses stored URL if not provided)
   * @param wsToken Authentication token (optional, uses stored token if not provided)
   */
  const connectWebSocket = useCallback(
    async (wsUrl?: string, wsToken?: string) => {
      if (!wsUrl && !url) {
        throw new Error("WebSocket URL is required");
      }

      if (!wsToken && !token) {
        throw new Error("Authentication token is required");
      }

      try {
        await connect(
          wsUrl || url || `${serverUrl?.replace(/^http/, "ws")}/websocket`,
          wsToken || token || "",
          {
            pingInterval: 30000, // 30 seconds
            maxReconnectAttempts: 5,
          },
        );
        
        // Initialize channel event handlers when WebSocket connects
        ensureChannelEventHandlers();
      } catch (error) {
        handleError(error as Error, ErrorSource.WEBSOCKET);
        throw error;
      }
    },
    [connect, url, token, serverUrl],
  );

  /**
   * Disconnects from the WebSocket server
   * @param code Close code
   * @param reason Close reason
   */
  const disconnectWebSocket = useCallback(
    (code?: number, reason?: string) => {
      disconnect(code, reason);
    },
    [disconnect],
  );

  /**
   * Reconnects to the WebSocket server
   */
  const reconnectWebSocket = useCallback(async () => {
    try {
      await reconnect();
      
      // Re-initialize channel event handlers on reconnect
      ensureChannelEventHandlers();
    } catch (error) {
      handleError(error as Error, ErrorSource.WEBSOCKET);
      throw error;
    }
  }, [reconnect]);

  /**
   * Sends a message over the WebSocket
   * @param message Message to send
   */
  const sendMessage = useCallback(
    (message: WebSocketMessage | string): boolean => {
      try {
        return useWsStore.getState().sendMessage(message);
      } catch (error) {
        handleError(error as Error, ErrorSource.WEBSOCKET);
        return false;
      }
    },
    [],
  );

  return {
    // Connection state
    isConnected,
    isConnecting,
    hasBeenDisconnected,
    url,
    error,

    // Connection actions
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    reconnect: reconnectWebSocket,
    sendMessage,
  };
}

/**
 * Hook for WebSocket event listening
 * @param eventType Event type to listen for
 * @param handler Event handler function
 * @param options Listener options
 */
export function useWebSocketEvent<T = any>(
  eventType: string,
  handler: (data: T) => void,
  options: WebSocketListenerOptions = {},
) {
  const { isConnected, addMessageHandler } = useWsStore();
  const handlerRef = useRef(handler);

  // Update handler ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // Set up event listener
  useEffect(() => {
    if (!eventType) return undefined;

    // Create handler that uses the ref
    const wrappedHandler = (data: T) => {
      handlerRef.current(data);
    };

    // Register handler
    const unsubscribe = addMessageHandler(eventType, wrappedHandler);

    // Clean up on unmount
    return () => {
      if (options.autoUnregister !== false) {
        unsubscribe();
      }
    };
  }, [eventType, addMessageHandler, options.autoUnregister]);

  return {
    isConnected,
  };
}

/**
 * Hook for registering multiple WebSocket event listeners
 * @param handlers Map of event types to handler functions
 * @param options Listener options
 */
export function useWebSocketEvents<T = any>(
  handlers: Record<string, (data: T) => void>,
  options: WebSocketListenerOptions = {},
) {
  const { isConnected, addMessageHandlers } = useWsStore();
  const handlersRef = useRef(handlers);

  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Set up event listeners
  useEffect(() => {
    if (!handlers || Object.keys(handlers).length === 0) return undefined;

    // Wrap handlers to use the current ref
    const wrappedHandlers: Record<string, (data: T) => void> = {};

    Object.entries(handlers).forEach(([eventType, handler]) => {
      wrappedHandlers[eventType] = (data: T) => {
        handlersRef.current[eventType]?.(data);
      };
    });

    // Register handlers
    const unsubscribe = addMessageHandlers(wrappedHandlers);

    // Clean up on unmount
    return () => {
      if (options.autoUnregister !== false) {
        unsubscribe();
      }
    };
  }, [addMessageHandlers, options.autoUnregister]);

  return {
    isConnected,
  };
}

/**
 * Hook for WebSocket message events
 * @param channelId Channel ID to filter by
 * @param handler Event handler function
 */
export function useWebSocketMessageEvents(
  channelId: string | undefined,
  handler: (message: any, eventType: string) => void,
) {
  // Get event handlers
  const messageHandlers: Record<string, (data: any) => void> = useMemo(() => {
    if (!channelId) return {} as Record<string, (data: any) => void>;
    return {
      [WebSocketEventType.POSTED]: (data) => {
        if (data.channel_id === channelId) {
          handler(data, WebSocketEventType.POSTED);
        }
      },
      [WebSocketEventType.POST_EDITED]: (data) => {
        if (data.channel_id === channelId) {
          handler(data, WebSocketEventType.POST_EDITED);
        }
      },
      [WebSocketEventType.POST_DELETED]: (data) => {
        if (data.channel_id === channelId) {
          handler(data, WebSocketEventType.POST_DELETED);
        }
      },
      [WebSocketEventType.REACTION_ADDED]: (data) => {
        // For reactions, we need to check if the post is in our channel
        if (data.channel_id === channelId) {
          handler(data, WebSocketEventType.REACTION_ADDED);
        }
      },
      [WebSocketEventType.REACTION_REMOVED]: (data) => {
        if (data.channel_id === channelId) {
          handler(data, WebSocketEventType.REACTION_REMOVED);
        }
      },
    };
  }, [channelId, handler]);

  // Register event handlers
  return useWebSocketEvents(messageHandlers);
}

/**
 * Hook for WebSocket typing events
 * @param channelId Channel ID to filter by
 * @param parentId Optional parent ID for filtering thread typing events
 * @param handler Event handler function
 */
export function useWebSocketTypingEvents(
  channelId: string | undefined,
  parentId: string | undefined,
  handler: (data: TypingData) => void,
) {
  // Get typing event handler
  const typingHandler = useCallback(
    (data: TypingData) => {
      if (!channelId || data.channel_id !== channelId) return;

      // For thread typing, filter by parent_id if provided
      if (parentId && data.parent_id && data.parent_id !== parentId) return;

      handler(data);
    },
    [channelId, parentId, handler],
  );

  // Register typing event handler
  return useWebSocketEvent(WebSocketEventType.TYPING, typingHandler);
}

/**
 * Hook for typing indicator functionality
 * @param channelId Channel ID
 * @param parentId Optional parent ID for thread typing
 * @returns Typing indicator functionality
 */
export function useTypingIndicator(
  channelId: string | undefined,
  parentId?: string,
) {
  const { currentUser } = useAuthStore();
  const { isConnected, sendMessage } = useWsStore();

  // Typing users state
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});

  // Handle typing events
  const handleTyping = useCallback(
    (data: TypingData) => {
      if (!data.user_id || data.user_id === currentUser?.id) return;

      // Update typing users with timestamp
      setTypingUsers((prev) => ({
        ...prev,
        [data.user_id]: Date.now(),
      }));
    },
    [currentUser?.id],
  );

  // Register for typing events
  useWebSocketTypingEvents(channelId, parentId, handleTyping);

  // Clean up expired typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const updated: Record<string, number> = {};
        let hasChanges = false;

        // Keep only non-expired typing indicators (5 seconds)
        Object.entries(prev).forEach(([userId, timestamp]) => {
          if (now - timestamp < 5000) {
            updated[userId] = timestamp;
          } else {
            hasChanges = true;
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Sends a typing indicator
   */
  const sendTypingEvent = useCallback(() => {
    if (!isConnected || !channelId || !currentUser?.id) return;

    const typingMessage: WebSocketMessage = {
      action: "user_typing",
      data: {
        channel_id: channelId,
        parent_id: parentId || "",
      },
    };

    sendMessage(typingMessage);
  }, [isConnected, sendMessage, channelId, parentId, currentUser?.id]);

  // Get currently typing user IDs
  const typingUserIds = useMemo(() => {
    const now = Date.now();
    return Object.entries(typingUsers)
      .filter(([_, timestamp]) => now - timestamp < 5000)
      .map(([userId]) => userId);
  }, [typingUsers]);

  return {
    typingUserIds,
    sendTypingEvent,
    isTyping: typingUserIds.length > 0,
  };
}
