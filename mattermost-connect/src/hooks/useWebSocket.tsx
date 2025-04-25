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

// Import uniquement ce qui est nécessaire pour cette partie de la fonctionnalité
// Le reste du hook useWebSocket est conservé tel quel et n'est pas modifié ici

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
