// src/hooks/useUnreadCounts.tsx
/**
 * Hooks for unread count functionality
 * Provides optimized React hooks for working with unread counts
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Channel,
  ChannelUnreadCount,
  EventType,
  UnreadCountsUpdatedEvent,
} from "../types";
import { useChannelStore, useUnreadStore, useAuthStore } from "../core/store";
import { unreadService } from "../core/services/unreadService";
import {
  useViewChannelMutation,
  useMarkAllChannelsAsReadMutation,
  useToggleChannelMutedMutation,
} from "../core/api/queries/channelQueries";
import { debounce } from "../utils/performance";

/**
 * Main hook for managing unread counts
 * Provides actions and selectors for handling unread messages across channels
 *
 * @returns Unread count state and actions
 */
export function useUnreadCounts() {
  // Get store state
  const {
    unreadCounts,
    mutedChannels,
    getChannelUnreadCount,
    updateUnreadCount,
    incrementUnreadCount,
    markAsRead,
    markAllAsRead,
    setChannelMuted,
    hasUnreadsInChannel,
    hasMentionsInChannel,
    isChannelMuted,
    getTeamUnreadCount,
    getTotalUnreadCount,
  } = useUnreadStore();

  // Get channel store
  const { channelsByTeam, activeChannel } = useChannelStore();

  // Get current user
  const { currentUser } = useAuthStore();
  const currentUserId = currentUser?.id || "";

  // Get mutations from API
  const viewChannelMutation = useViewChannelMutation();
  const markAllChannelsAsReadMutation = useMarkAllChannelsAsReadMutation();
  const toggleChannelMutedMutation = useToggleChannelMutedMutation();

  // Track if initial unread counts have been loaded
  const initialLoadCompletedRef = useRef(false);

  /**
   * Broadcasts an event when unread counts are updated
   * UI components can listen to this event to refresh their state
   */
  const broadcastUnreadCountsUpdate = useCallback(() => {
    // Create a custom event with the current team unread counts
    const teamUnreadCounts = getTeamUnreadCountsMap();
    const event = new CustomEvent("unreadCountsUpdated", {
      detail: teamUnreadCounts,
    });
    window.dispatchEvent(event);
  }, []);

  /**
   * Debounced version of the broadcast function to prevent excessive events
   */
  const debouncedBroadcastUpdate = useMemo(
    () => debounce(broadcastUnreadCountsUpdate, 150),
    [broadcastUnreadCountsUpdate],
  );

  /**
   * Loads initial unread counts for all channels in all teams
   */
  const loadInitialUnreadCounts = useCallback(async () => {
    if (!currentUser || initialLoadCompletedRef.current) return;

    try {
      // For each team, fetch team-level unread counts
      const teamIds = Object.keys(channelsByTeam);

      // Simulate loading from API (in real implementation, this would make API calls)
      // This is a placeholder for actual API integration
      for (const teamId of teamIds) {
        const channels = channelsByTeam[teamId] || [];

        for (const channel of channels) {
          // In a real implementation, this would fetch actual unread counts
          const mockUnreadCount = {
            msg_count: 0,
            mention_count: 0,
            lastViewedAt: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
          };

          updateUnreadCount(
            channel.id,
            mockUnreadCount.msg_count,
            mockUnreadCount.mention_count,
            undefined,
            mockUnreadCount.lastViewedAt,
          );
        }
      }

      // Broadcast updates to any listening components
      debouncedBroadcastUpdate();

      // Mark initial load as completed
      initialLoadCompletedRef.current = true;
    } catch (error) {
      console.error("Error loading initial unread counts:", error);
    }
  }, [
    currentUser,
    channelsByTeam,
    updateUnreadCount,
    debouncedBroadcastUpdate,
  ]);

  // Set up WebSocket handlers for managing unread counts in real-time
  useEffect(() => {
    if (!currentUser) return;

    // Load initial unread counts on first mount if needed
    if (!initialLoadCompletedRef.current) {
      loadInitialUnreadCounts();
    }

    // Handle new message posted
    const handlePosted = (data: any) => {
      const { post, channel_id: channelId } = data;

      if (!post || !channelId || !currentUser) return;

      // Parse the post data
      const postData = typeof post === "string" ? JSON.parse(post) : post;

      // Don't increment for own messages
      if (postData.user_id === currentUser.id) return;

      // Check if this is the active channel
      if (activeChannel?.id === channelId) {
        // For active channel, don't increment, but mark as read after delay
        setTimeout(() => markAsRead(channelId), 2000);
        return;
      }

      // Check for mentions
      const mentionsUser = unreadService.messageContainsMention(
        postData,
        currentUser.id,
      );

      // Increment unread counts
      incrementUnreadCount(
        channelId,
        1, // One new message
        mentionsUser ? 1 : 0, // Increment mentions if mentioned
        postData.id,
      );

      // Broadcast updates for real-time UI reactions
      debouncedBroadcastUpdate();
    };

    // Handle channel viewed event
    const handleChannelViewed = (data: any) => {
      const { channel_id: channelId, user_id: userId } = data;

      if (userId === currentUser.id && channelId) {
        markAsRead(channelId);
        debouncedBroadcastUpdate();
      }
    };

    // Set up event listeners
    window.addEventListener("message_posted", handlePosted as EventListener);
    window.addEventListener(
      "channel_viewed",
      handleChannelViewed as EventListener,
    );

    // Clean up listeners on unmount
    return () => {
      window.removeEventListener(
        "message_posted",
        handlePosted as EventListener,
      );
      window.removeEventListener(
        "channel_viewed",
        handleChannelViewed as EventListener,
      );
    };
  }, [
    currentUser,
    activeChannel,
    incrementUnreadCount,
    markAsRead,
    loadInitialUnreadCounts,
    debouncedBroadcastUpdate,
  ]);

  /**
   * Gets unread counts for all channels in a team
   * @param teamId Team ID
   * @returns Record of channel IDs to unread counts
   */
  const getChannelUnreadCountsByTeam = useCallback(
    (teamId: string): Record<string, ChannelUnreadCount> => {
      const teamChannels = channelsByTeam[teamId] || [];
      const result: Record<string, ChannelUnreadCount> = {};

      teamChannels.forEach((channel) => {
        result[channel.id] = getChannelUnreadCount(channel.id);
      });

      return result;
    },
    [channelsByTeam, getChannelUnreadCount],
  );

  /**
   * Gets formatted unread counts for all teams
   * @returns Record of team IDs to unread counts
   */
  const getTeamUnreadCountsMap = useCallback(() => {
    const result: Record<string, { msg_count: number; mention_count: number }> =
      {};

    Object.keys(channelsByTeam).forEach((teamId) => {
      result[teamId] = getTeamUnreadCount(teamId, channelsByTeam[teamId] || []);
    });

    return result;
  }, [channelsByTeam, getTeamUnreadCount]);

  /**
   * Marks a channel as read
   * @param channelId Channel ID to mark as read
   * @returns Promise resolving to the channel ID
   */
  const markChannelAsRead = useCallback(
    async (channelId: string) => {
      // Optimistically update the local state
      markAsRead(channelId);

      // Notify UI components of the change
      debouncedBroadcastUpdate();

      // Call the API to confirm the change
      try {
        return await viewChannelMutation.mutateAsync(channelId);
      } catch (error) {
        console.error("Error marking channel as read:", error);
        throw error;
      }
    },
    [markAsRead, viewChannelMutation, debouncedBroadcastUpdate],
  );

  /**
   * Marks all channels in a team as read
   * @param teamId Team ID
   * @returns Promise resolving to the team ID
   */
  const markTeamAsRead = useCallback(
    async (teamId: string) => {
      // Optimistically update the local state
      markAllAsRead(teamId);

      // Notify UI components of the change
      debouncedBroadcastUpdate();

      // Call the API to confirm the change
      try {
        return await markAllChannelsAsReadMutation.mutateAsync(teamId);
      } catch (error) {
        console.error("Error marking team as read:", error);
        throw error;
      }
    },
    [markAllAsRead, markAllChannelsAsReadMutation, debouncedBroadcastUpdate],
  );

  /**
   * Toggles whether a channel is muted
   * @param channelId Channel ID
   * @param muted Whether the channel should be muted
   * @returns Promise resolving when completed
   */
  const toggleChannelMuted = useCallback(
    async (channelId: string, muted: boolean) => {
      // Optimistically update the local state
      setChannelMuted(channelId, muted);

      // Notify UI components of the change
      debouncedBroadcastUpdate();

      // Call the API to confirm the change
      try {
        return await toggleChannelMutedMutation.mutateAsync({
          channelId,
          muted,
        });
      } catch (error) {
        // Revert the change if API call fails
        setChannelMuted(channelId, !muted);
        debouncedBroadcastUpdate();
        console.error("Error toggling channel muted:", error);
        throw error;
      }
    },
    [setChannelMuted, toggleChannelMutedMutation, debouncedBroadcastUpdate],
  );

  // Use memoized value for teamUnreadCounts to improve performance
  const teamUnreadCounts = useMemo(() => {
    return getTeamUnreadCountsMap();
  }, [getTeamUnreadCountsMap, unreadCounts]);

  return {
    // State
    unreadCounts,
    totalUnreadCounts: getTotalUnreadCount(),
    teamUnreadCounts,
    initialLoadCompleted: initialLoadCompletedRef.current,
    mutedChannels: Array.from(mutedChannels),

    // Loading states
    isMarkingAsRead: viewChannelMutation.isPending,
    isMarkingTeamAsRead: markAllChannelsAsReadMutation.isPending,
    isTogglingMuted: toggleChannelMutedMutation.isPending,

    // Methods
    loadInitialUnreadCounts,
    getChannelUnreadCount,
    getChannelUnreadCountsByTeam,
    markChannelAsRead,
    markTeamAsRead,
    toggleChannelMuted,
    hasUnreadsInChannel,
    hasMentionsInChannel,
    isChannelMuted,
    broadcastUnreadCountsUpdate,
    getTeamUnreadCountsMap,

    // Format utility methods from service
    formatUnreadCount: unreadService.formatUnreadCount.bind(unreadService),
    getUnreadBadgeColor: unreadService.getUnreadBadgeColor.bind(unreadService),
    formatUnreadBadgeData:
      unreadService.formatUnreadBadgeData.bind(unreadService),
  };
}

/**
 * Hook for channel-specific unread count functionality
 * @param channelId Channel ID to track
 * @returns Channel unread count state and actions
 */
export function useChannelUnreadCount(channelId: string | undefined) {
  const {
    getChannelUnreadCount,
    markChannelAsRead,
    toggleChannelMuted,
    isChannelMuted,
    hasMentionsInChannel,
    hasUnreadsInChannel,
    formatUnreadBadgeData,
  } = useUnreadCounts();

  // Get unread count for this channel from local state
  const unreadCount = useMemo(() => {
    if (!channelId) return { msg_count: 0, mention_count: 0, isMuted: false };
    return getChannelUnreadCount(channelId);
  }, [channelId, getChannelUnreadCount]);

  // Check if channel has unreads or mentions
  const hasUnreads = useMemo(() => {
    if (!channelId) return false;
    return hasUnreadsInChannel(channelId);
  }, [channelId, hasUnreadsInChannel]);

  const hasMentions = useMemo(() => {
    if (!channelId) return false;
    return hasMentionsInChannel(channelId);
  }, [channelId, hasMentionsInChannel]);

  // Check if channel is muted
  const muted = useMemo(() => {
    if (!channelId) return false;
    return isChannelMuted(channelId);
  }, [channelId, isChannelMuted]);

  // Format badge data for UI display
  const badgeData = useMemo(() => {
    if (!channelId) return { text: "", color: "default" as const };
    return formatUnreadBadgeData(
      unreadCount.msg_count,
      unreadCount.mention_count,
      muted,
    );
  }, [channelId, unreadCount, muted, formatUnreadBadgeData]);

  // Function to mark this channel as read
  const markAsRead = useCallback(async () => {
    if (!channelId) return;
    return markChannelAsRead(channelId);
  }, [channelId, markChannelAsRead]);

  // Function to toggle mute status for this channel
  const toggleMuted = useCallback(
    async (muted: boolean) => {
      if (!channelId) return;
      return toggleChannelMuted(channelId, muted);
    },
    [channelId, toggleChannelMuted],
  );

  return {
    unreadCount,
    hasUnreads,
    hasMentions,
    muted,
    badgeData,
    markAsRead,
    toggleMuted,
    // Using local state, so never loading
    isLoading: false,
  };
}

/**
 * Hook for team-specific unread count functionality
 * @param teamId Team ID to track
 * @returns Team unread count state and actions
 */
export function useTeamUnreadCount(teamId: string | undefined) {
  const {
    teamUnreadCounts,
    markTeamAsRead,
    hasUnreadsInTeam,
    hasMentionsInTeam,
    formatUnreadBadgeData,
  } = useUnreadCounts();

  // Get channels for this team
  const { getChannelsByTeam } = useChannelStore();
  const teamChannels = useMemo(() => {
    if (!teamId) return [];
    return getChannelsByTeam(teamId);
  }, [teamId, getChannelsByTeam]);

  // Get unread counts for this team
  const unreadCount = useMemo(() => {
    if (!teamId || !teamUnreadCounts[teamId]) {
      return { msg_count: 0, mention_count: 0 };
    }
    return teamUnreadCounts[teamId];
  }, [teamId, teamUnreadCounts]);

  // Check if team has unreads or mentions
  const hasUnreads = useMemo(() => {
    if (!teamId) return false;
    return hasUnreadsInTeam(teamId, teamChannels);
  }, [teamId, teamChannels, hasUnreadsInTeam]);

  const hasMentions = useMemo(() => {
    if (!teamId) return false;
    return hasMentionsInTeam(teamId, teamChannels);
  }, [teamId, teamChannels, hasMentionsInTeam]);

  // Format badge data for UI display
  const badgeData = useMemo(() => {
    if (!teamId) return { text: "", color: "default" as const };
    return formatUnreadBadgeData(
      unreadCount.msg_count,
      unreadCount.mention_count,
      false, // Teams can't be muted directly
    );
  }, [teamId, unreadCount, formatUnreadBadgeData]);

  // Function to mark all channels in this team as read
  const markAllAsRead = useCallback(async () => {
    if (!teamId) return;
    return markTeamAsRead(teamId);
  }, [teamId, markTeamAsRead]);

  return {
    unreadCount,
    hasUnreads,
    hasMentions,
    badgeData,
    markAllAsRead,
    // Using local state, so never loading
    isLoading: false,
  };
}

/**
 * Hook to listen for unread count updates via custom events
 * @param onUpdate Callback to run when unread counts are updated
 */
export function useUnreadCountsListener(
  onUpdate: (
    counts: Record<string, { msg_count: number; mention_count: number }>,
  ) => void,
) {
  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const customEvent = event as UnreadCountsUpdatedEvent;
      onUpdate(customEvent.detail);
    };

    window.addEventListener("unreadCountsUpdated", handleUpdate);
    return () => {
      window.removeEventListener("unreadCountsUpdated", handleUpdate);
    };
  }, [onUpdate]);
}
