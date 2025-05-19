// src/core/services/channelWebSocketHandler.ts
/**
 * WebSocket event handlers for channel-related events
 * Centralizes the channel event handling logic
 */
import { WebSocketEventType, EventType } from "../../types";
import { queryClient, invalidateQueries } from "../api/queryClient";
import { wsService } from "./wsService";
import { useChannelStore } from "../store/channelStore";
import { useAuthStore } from "../store/authStore";
import { emitEvent } from "../api/eventUtils";

/**
 * Initializes WebSocket event handlers for channel events
 * @returns Cleanup function to remove event handlers
 */
export function initializeChannelEventHandlers(): () => void {
  const unsubscribers: Array<() => void> = [];

  // Channel created event
  unsubscribers.push(
    wsService.on(WebSocketEventType.CHANNEL_CREATED, (data) => {
      console.log("[WS] Channel created:", data);
      if (!data || !data.channel_id) return;

      // Get detailed channel info through our channel fetch
      if (data.team_id) {
        // Invalidate team channels query to fetch the new channel
        queryClient.invalidateQueries({
          queryKey: ["channels", "byTeam", data.team_id],
        });

        // Emit channel event
        emitEvent(EventType.CHANNEL_CREATED, {
          channelId: data.channel_id,
          teamId: data.team_id,
        });
      }
    })
  );

  // Channel updated event
  unsubscribers.push(
    wsService.on(WebSocketEventType.CHANNEL_UPDATED, (data) => {
      console.log("[WS] Channel updated:", data);
      if (!data || !data.channel_id) return;

      // Invalidate specific channel query
      invalidateQueries.channel(data.channel_id);

      // Get the channel to find its team
      const { getChannelById } = useChannelStore.getState();
      const channel = getChannelById(data.channel_id);
      
      // If we have the team ID, invalidate team channels too
      if (data.team_id || (channel && channel.team_id)) {
        const teamId = data.team_id || channel?.team_id;
        queryClient.invalidateQueries({
          queryKey: ["channels", "byTeam", teamId],
        });
      }

      // Emit channel event
      emitEvent(EventType.CHANNEL_UPDATED, {
        channelId: data.channel_id,
        teamId: data.team_id || channel?.team_id,
      });
    })
  );

  // Channel deleted event
  unsubscribers.push(
    wsService.on(WebSocketEventType.CHANNEL_DELETED, (data) => {
      console.log("[WS] Channel deleted:", data);
      if (!data || !data.channel_id) return;

      // Get the channel before it's removed from store
      const { getChannelById, removeChannel } = useChannelStore.getState();
      const channel = getChannelById(data.channel_id);
      
      // Remove from store
      if (channel) {
        removeChannel(data.channel_id);
      }

      // Invalidate the team's channel list
      if (data.team_id || (channel && channel.team_id)) {
        const teamId = data.team_id || channel?.team_id;
        queryClient.invalidateQueries({
          queryKey: ["channels", "byTeam", teamId],
        });

        // Emit channel event
        emitEvent(EventType.CHANNEL_DELETED, {
          channelId: data.channel_id,
          teamId,
        });
      }
    })
  );

  // Member added to channel event (could be current user or another user)
  unsubscribers.push(
    wsService.on(WebSocketEventType.USER_ADDED, (data) => {
      console.log("[WS] User added to channel:", data);
      if (!data || !data.channel_id) return;

      // Check if current user was added to channel
      const { currentUser } = useAuthStore.getState();
      const isCurrentUser = currentUser && data.user_id === currentUser.id;

      if (isCurrentUser) {
        // Current user was added to channel, refresh channel list
        if (data.team_id) {
          queryClient.invalidateQueries({
            queryKey: ["channels", "byTeam", data.team_id],
          });
        }
      }

      // Always invalidate channel members
      queryClient.invalidateQueries({
        queryKey: ["channelMembers", data.channel_id],
      });

      // Emit member added event
      emitEvent(EventType.CHANNEL_MEMBER_ADDED, {
        channelId: data.channel_id,
        userId: data.user_id,
        isCurrentUser,
      });
    })
  );

  // Member removed from channel event
  unsubscribers.push(
    wsService.on(WebSocketEventType.USER_REMOVED, (data) => {
      console.log("[WS] User removed from channel:", data);
      if (!data || !data.channel_id) return;

      // Check if current user was removed
      const { currentUser } = useAuthStore.getState();
      const isCurrentUser = currentUser && data.user_id === currentUser.id;

      if (isCurrentUser) {
        // Current user was removed, remove channel from store
        const { removeChannel, getChannelById } = useChannelStore.getState();
        const channel = getChannelById(data.channel_id);
        
        // Remove from store
        removeChannel(data.channel_id);

        // Refresh channel list
        if (data.team_id || (channel && channel.team_id)) {
          const teamId = data.team_id || channel?.team_id;
          queryClient.invalidateQueries({
            queryKey: ["channels", "byTeam", teamId],
          });
        }
      } else {
        // Another user was removed, just update members
        queryClient.invalidateQueries({
          queryKey: ["channelMembers", data.channel_id],
        });
      }

      // Emit member removed event
      emitEvent(EventType.CHANNEL_MEMBER_REMOVED, {
        channelId: data.channel_id,
        userId: data.user_id,
        isCurrentUser,
      });
    })
  );

  // Return function to clean up all handlers
  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

/**
 * Singleton instance of channel event handlers
 */
let handlersInitialized = false;
let cleanupFunction: (() => void) | null = null;

/**
 * Ensures channel event handlers are initialized
 * @returns Cleanup function
 */
export function ensureChannelEventHandlers(): () => void {
  if (!handlersInitialized) {
    cleanupFunction = initializeChannelEventHandlers();
    handlersInitialized = true;
  }
  
  return () => {
    if (cleanupFunction) {
      cleanupFunction();
      handlersInitialized = false;
      cleanupFunction = null;
    }
  };
}

export default {
  initialize: ensureChannelEventHandlers,
};