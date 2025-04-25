// src/hooks/useUnreadCounts.tsx
/**
 * Hook for managing unread counts across channels and teams
 */
import { useCallback, useMemo } from "react";
import {
  useChannelStore,
  getTeamUnreadCounts,
  getTotalUnreadCounts,
  ChannelUnreadCount,
} from "../core/store/channelStore";
import { Channel } from "../core/store/channelStore";
import {
  useTotalUnreadCountsQuery,
  useSyncChannelUnreadCountMutation,
} from "../core/api/queries/unreadCountQueries";
import {
  useViewChannelMutation,
  useMarkAllChannelsAsReadMutation,
  useToggleChannelMutedMutation,
} from "../core/api/queries/channelQueries";
import { useAuthStore } from "../core/store/authStore";

/**
 * Hook that provides utilities for working with unread counts
 */
export function useUnreadCounts() {
  // Get store state and actions
  const {
    unreadCounts,
    channelsByTeam,
    activeChannel,
    updateUnreadCount,
    markAsRead,
    markAllAsRead,
    setChannelMuted,
  } = useChannelStore();

  // Get total unread counts from the API
  const { data: totalUnreadCountsData, isLoading: isLoadingTotalCounts } =
    useTotalUnreadCountsQuery();

  // Get mutations
  const viewChannelMutation = useViewChannelMutation();
  const markAllChannelsAsReadMutation = useMarkAllChannelsAsReadMutation();
  const syncChannelUnreadCountMutation = useSyncChannelUnreadCountMutation();
  const toggleChannelMutedMutation = useToggleChannelMutedMutation();

  /**
   * Gets unread count for a specific channel
   * @param channelId Channel ID
   * @returns Unread count object or default empty counts
   */
  const getChannelUnreadCount = useCallback(
    (channelId: string): ChannelUnreadCount => {
      return (
        unreadCounts[channelId] || {
          messageCount: 0,
          mentionCount: 0,
          isMuted: false,
        }
      );
    },
    [unreadCounts],
  );

  /**
   * Gets total unread counts for a team
   * @param teamId Team ID
   * @returns Object with message and mention counts
   */
  const getUnreadCountsByTeam = useCallback((teamId: string) => {
    return getTeamUnreadCounts(teamId);
  }, []);

  /**
   * Gets total unread counts across all teams and channels
   * @returns Object with message and mention counts
   */
  const getAllUnreadCounts = useCallback(() => {
    // If we have data from the API, prefer that for accuracy
    if (totalUnreadCountsData) {
      return totalUnreadCountsData;
    }

    // Otherwise fall back to local state
    return getTotalUnreadCounts();
  }, [totalUnreadCountsData]);

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
   * Marks a channel as read
   * @param channelId Channel ID to mark as read
   * @returns Promise resolving to the channel ID
   */
  const markChannelAsRead = useCallback(
    async (channelId: string) => {
      // Optimistically update the local state
      markAsRead(channelId);

      // Call the API
      return viewChannelMutation.mutateAsync(channelId);
    },
    [markAsRead, viewChannelMutation],
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

      // Call the API
      return markAllChannelsAsReadMutation.mutateAsync(teamId);
    },
    [markAllAsRead, markAllChannelsAsReadMutation],
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

      // Call the API
      return toggleChannelMutedMutation.mutateAsync({ channelId, muted });
    },
    [setChannelMuted, toggleChannelMutedMutation],
  );

  /**
   * Synchronizes a channel's unread count with the server
   * @param channelId Channel ID
   * @returns Promise resolving to the updated unread data
   */
  const syncChannelUnreadCount = useCallback(
    async (channelId: string) => {
      return syncChannelUnreadCountMutation.mutateAsync({
        channelId,
        sinceTimestamp: Date.now(),
      });
    },
    [syncChannelUnreadCountMutation],
  );

  /**
   * Checks if there are any unread messages in a team
   * @param teamId Team ID
   * @returns True if there are unread messages or mentions
   */
  const hasUnreadsInTeam = useCallback((teamId: string): boolean => {
    const counts = getTeamUnreadCounts(teamId);
    return counts.messageCount > 0 || counts.mentionCount > 0;
  }, []);

  /**
   * Checks if there are any unread mentions in a team
   * @param teamId Team ID
   * @returns True if there are unread mentions
   */
  const hasMentionsInTeam = useCallback((teamId: string): boolean => {
    const counts = getTeamUnreadCounts(teamId);
    return counts.mentionCount > 0;
  }, []);

  /**
   * Gets formatted unread counts for all teams
   * @returns Record of team IDs to unread counts
   */
  const getTeamUnreadCountsMap = useMemo(() => {
    const result: Record<
      string,
      { messageCount: number; mentionCount: number }
    > = {};

    Object.keys(channelsByTeam).forEach((teamId) => {
      result[teamId] = getTeamUnreadCounts(teamId);
    });

    return result;
  }, [channelsByTeam]);

  /**
   * Checks if a specific channel has unread messages
   * @param channelId Channel ID
   * @returns True if the channel has unread messages
   */
  const hasUnreadsInChannel = useCallback(
    (channelId: string): boolean => {
      const counts = getChannelUnreadCount(channelId);
      return counts.messageCount > 0 || counts.mentionCount > 0;
    },
    [getChannelUnreadCount],
  );

  /**
   * Checks if a specific channel has unread mentions
   * @param channelId Channel ID
   * @returns True if the channel has unread mentions
   */
  const hasMentionsInChannel = useCallback(
    (channelId: string): boolean => {
      const counts = getChannelUnreadCount(channelId);
      return counts.mentionCount > 0;
    },
    [getChannelUnreadCount],
  );

  /**
   * Gets whether a channel is currently muted
   * @param channelId Channel ID
   * @returns True if the channel is muted
   */
  const isChannelMuted = useCallback(
    (channelId: string): boolean => {
      const counts = getChannelUnreadCount(channelId);
      return !!counts.isMuted;
    },
    [getChannelUnreadCount],
  );

  return {
    // State
    unreadCounts,
    isLoadingTotalCounts,
    totalUnreadCounts: getAllUnreadCounts(),
    teamUnreadCounts: getTeamUnreadCountsMap,

    // Loading states
    isMarkingAsRead: viewChannelMutation.isPending,
    isMarkingTeamAsRead: markAllChannelsAsReadMutation.isPending,
    isTogglingMuted: toggleChannelMutedMutation.isPending,
    isSyncing: syncChannelUnreadCountMutation.isPending,

    // Methods
    getChannelUnreadCount,
    getUnreadCountsByTeam,
    getAllUnreadCounts,
    getChannelUnreadCountsByTeam,
    markChannelAsRead,
    markTeamAsRead,
    toggleChannelMuted,
    syncChannelUnreadCount,
    hasUnreadsInTeam,
    hasMentionsInTeam,
    hasUnreadsInChannel,
    hasMentionsInChannel,
    isChannelMuted,
  };
}

/**
 * Hook that provides simplified unread counts for a specific channel
 * @param channelId Channel ID to get unread counts for
 * @returns Unread count state and actions for the specific channel
 */
export function useChannelUnreadCount(channelId: string | undefined) {
  const {
    getChannelUnreadCount,
    markChannelAsRead,
    toggleChannelMuted,
    isChannelMuted,
  } = useUnreadCounts();

  // Get unread count for this channel
  const unreadCount = useMemo(() => {
    if (!channelId) return { messageCount: 0, mentionCount: 0, isMuted: false };
    return getChannelUnreadCount(channelId);
  }, [channelId, getChannelUnreadCount]);

  // Check if channel has unreads or mentions
  const hasUnreads = useMemo(() => {
    return unreadCount.messageCount > 0;
  }, [unreadCount.messageCount]);

  const hasMentions = useMemo(() => {
    return unreadCount.mentionCount > 0;
  }, [unreadCount.mentionCount]);

  // Check if channel is muted
  const muted = useMemo(() => {
    if (!channelId) return false;
    return isChannelMuted(channelId);
  }, [channelId, isChannelMuted]);

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
    markAsRead,
    toggleMuted,
  };
}

/**
 * Hook that provides simplified unread counts for a specific team
 * @param teamId Team ID to get unread counts for
 * @returns Unread count state and actions for the specific team
 */
export function useTeamUnreadCount(teamId: string | undefined) {
  const {
    getUnreadCountsByTeam,
    markTeamAsRead,
    hasUnreadsInTeam,
    hasMentionsInTeam,
  } = useUnreadCounts();

  // Get unread counts for this team
  const unreadCount = useMemo(() => {
    if (!teamId) return { messageCount: 0, mentionCount: 0 };
    return getUnreadCountsByTeam(teamId);
  }, [teamId, getUnreadCountsByTeam]);

  // Check if team has unreads or mentions
  const hasUnreads = useMemo(() => {
    if (!teamId) return false;
    return hasUnreadsInTeam(teamId);
  }, [teamId, hasUnreadsInTeam]);

  const hasMentions = useMemo(() => {
    if (!teamId) return false;
    return hasMentionsInTeam(teamId);
  }, [teamId, hasMentionsInTeam]);

  // Function to mark all channels in this team as read
  const markAllAsRead = useCallback(async () => {
    if (!teamId) return;
    return markTeamAsRead(teamId);
  }, [teamId, markTeamAsRead]);

  return {
    unreadCount,
    hasUnreads,
    hasMentions,
    markAllAsRead,
  };
}
