// src/hooks/useWebSocket.tsx
/**
 * Hook for WebSocket functionality
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
  const { token, currentUser } = useAuthStore();

  // Get channel store actions
  const { incrementUnreadCount, markAsRead, addProcessedMessageId } =
    useChannelStore();

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

  /**
   * Registers handlers for unread-related WebSocket events
   */
  const registerUnreadHandlers = useCallback(() => {
    if (!currentUser) return;

    const handlers: Record<string, (data: any) => void> = {
      // Handle new messages
      [WebSocketEventType.POSTED]: (data) => {
        const { post, channel_id: channelId, sender_name: senderName } = data;

        if (!post || !channelId) return;

        // Parse the post data
        const postData = typeof post === "string" ? JSON.parse(post) : post;

        // Don't increment for own messages
        if (postData.user_id === currentUser.id) return;

        // Avoid duplicate processing by tracking message IDs
        if (addProcessedMessageId) {
          addProcessedMessageId(postData.id);
        }

        // Check if this message mentions the current user
        const mentionsUser =
          postData.props &&
          postData.props.mentions &&
          Array.isArray(postData.props.mentions) &&
          postData.props.mentions.includes(currentUser.id);

        // Increment unread count for the channel
        incrementUnreadCount(
          channelId,
          1, // Increment message count by 1
          mentionsUser ? 1 : 0, // Increment mention count if user is mentioned
          postData.id, // Message ID
          mentionsUser, // Flag that user is mentioned for specific handling
        );

        // Invalidate related queries
        invalidateQueries.channelUnreadCount(channelId);
      },

      // Handle when a channel is viewed (by current user or others)
      [WebSocketEventType.CHANNEL_VIEWED]: (data) => {
        const { channel_id: channelId, user_id: userId } = data;

        // Only process for current user
        if (userId === currentUser.id && channelId) {
          // Mark channel as read in local state
          markAsRead(channelId);

          // Invalidate related queries
          invalidateQueries.channelUnreadCount(channelId);
        }
      },

      // Handle when a post is edited
      [WebSocketEventType.POST_EDITED]: (data) => {
        const { post, channel_id: channelId } = data;

        if (!post || !channelId) return;

        // Invalidate channel messages to refresh
        invalidateQueries.channelMessages(channelId);
      },

      // Handle when a post is deleted
      [WebSocketEventType.POST_DELETED]: (data) => {
        const { post, channel_id: channelId } = data;

        if (!post || !channelId) return;

        // Invalidate channel messages to refresh
        invalidateQueries.channelMessages(channelId);
      },

      // Handle when channel unread state changes
      ["channel_marked_read"]: (data) => {
        const { channel_id: channelId, user_id: userId } = data;

        // Only process for current user
        if (userId === currentUser.id && channelId) {
          // Mark channel as read in local state
          markAsRead(channelId);

          // Invalidate related queries
          invalidateQueries.channelUnreadCount(channelId);
        }
      },

      // Handle when a user is added to a channel
      [WebSocketEventType.USER_ADDED]: (data) => {
        const {
          team_id: teamId,
          channel_id: channelId,
          user_id: userId,
        } = data;

        // Update channel list if current user was added
        if (userId === currentUser.id && teamId) {
          invalidateQueries.team(teamId);
        }
      },

      // Handle when a user is removed from a channel
      [WebSocketEventType.USER_REMOVED]: (data) => {
        const { channel_id: channelId, user_id: userId } = data;

        // Update channel list if current user was removed
        if (userId === currentUser.id && channelId) {
          const channel = useChannelStore.getState().getChannelById(channelId);
          if (channel?.team_id) {
            invalidateQueries.team(channel.team_id);
          }
        }
      },
    };

    // Register all handlers
    return registerWsHandlers(handlers);
  }, [currentUser, incrementUnreadCount, markAsRead, addProcessedMessageId]);

  // Register unread handlers when connected
  useEffect(() => {
    if (isConnected && currentUser) {
      const unregister = registerUnreadHandlers();
      return () => {
        if (unregister) unregister();
      };
    }
  }, [isConnected, currentUser, registerUnreadHandlers]);

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

        // Avoid duplicate processing
        if (addProcessedMessageId) {
          addProcessedMessageId(postData.id);
        }

        // Check if this message mentions the current user
        const mentionsUser =
          postData.props &&
          postData.props.mentions &&
          Array.isArray(postData.props.mentions) &&
          postData.props.mentions.includes(currentUser.id);

        // Increment unread count
        incrementUnreadCount(
          channelId,
          1,
          mentionsUser ? 1 : 0,
          postData.id,
          mentionsUser,
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
    },
    [currentUser, incrementUnreadCount, markAsRead, addProcessedMessageId],
  );
}

/**
 * Specialized hook for message events
 * @param handler Handler function for new messages
 * @param deps Dependencies for handler
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
 * @param deps Dependencies for handler
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
 * @param deps Dependencies for handler
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
 * @param deps Dependencies for handler
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
 * @param deps Dependencies for handler
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
 * @param deps Dependencies for handler
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

  return useCallback(
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
}
