// src/hooks/useUnreadCounts.tsx
/**
 * Unread counts hooks
 * Provides access to unread count functionality
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useChannelUnreadCountQuery,
  useTeamUnreadCountQuery,
  useViewChannelMutation,
  useMarkAllChannelsAsReadMutation,
  useToggleChannelMutedMutation,
} from "../core/api/queries/unreadCountQueries";
import { useUnreadStore } from "../core/store/unreadStore";
import { useChannelStore } from "../core/store/channelStore";
import { useTeamStore } from "../core/store/teamStore";
import { useUserSettingsStore } from "../core/store/userSettingsStore";
import { unreadService } from "../core/services/unreadService";
import { ChannelUnreadCount, FormattedUnreadCount } from "../types";
import { handleError } from "../core/store/errorStore";
import { ErrorSource } from "../types";

/**
 * Hook for channel unread counts
 * @param channelId Channel ID
 * @returns Unread count data and operations
 */
export function useChannelUnreadCount(channelId: string | undefined) {
  // Get unread count query
  const unreadCountQuery = useChannelUnreadCountQuery(channelId);

  // Get unread store
  const {
    getChannelUnreadCount,
    hasUnreadsInChannel,
    hasMentionsInChannel,
    isChannelMuted,
    markAsRead,
  } = useUnreadStore();

  // View channel mutation
  const viewMutation = useViewChannelMutation();

  // Toggle muted mutation
  const toggleMutedMutation = useToggleChannelMutedMutation();

  // Get unread count from store or query
  const unreadCount = useMemo(() => {
    if (!channelId) return null;

    // Get from store
    const storeCount = getChannelUnreadCount(channelId);

    // If not in store or query has more recent data, use query
    if (
      !storeCount ||
      !storeCount.msg_count ||
      (unreadCountQuery.data &&
        unreadCountQuery.dataUpdatedAt > (storeCount.lastViewedAt || 0))
    ) {
      return unreadCountQuery.data || storeCount;
    }

    return storeCount;
  }, [
    channelId,
    getChannelUnreadCount,
    unreadCountQuery.data,
    unreadCountQuery.dataUpdatedAt,
  ]);

  // Formatted count for UI display
  const formattedCount = useMemo(() => {
    const muted = channelId ? isChannelMuted(channelId) : false;

    if (!unreadCount) {
      return {
        text: "",
        color: "default" as const,
        hasMentions: false,
        hasUnreads: false,
      };
    }

    const hasMentions = unreadCount.mention_count > 0;
    const hasUnreads = unreadCount.msg_count > 0;

    // Use unreadService to get consistent formatting
    const { text, color } = unreadService.formatUnreadBadgeData(
      unreadCount.msg_count,
      unreadCount.mention_count,
      muted,
    );

    return { text, color, hasMentions, hasUnreads };
  }, [unreadCount, channelId, isChannelMuted]);

  /**
   * Marks the channel as read
   */
  const markChannelAsRead = useCallback(async () => {
    if (!channelId) return;

    try {
      await viewMutation.mutateAsync(channelId);
    } catch (error) {
      handleError(error as Error, ErrorSource.API);
    }
  }, [channelId, viewMutation]);

  /**
   * Toggles the muted status of the channel
   */
  const toggleMuted = useCallback(async () => {
    if (!channelId) return;

    try {
      const muted = isChannelMuted(channelId);
      await toggleMutedMutation.mutateAsync({ channelId, muted: !muted });
    } catch (error) {
      handleError(error as Error, ErrorSource.API);
    }
  }, [channelId, isChannelMuted, toggleMutedMutation]);

  return {
    // Data
    unreadCount,
    formattedCount,
    hasUnreads: channelId ? hasUnreadsInChannel(channelId) : false,
    hasMentions: channelId ? hasMentionsInChannel(channelId) : false,
    isMuted: channelId ? isChannelMuted(channelId) : false,

    // State
    isLoading: unreadCountQuery.isLoading,
    isFetching: unreadCountQuery.isFetching,
    error: unreadCountQuery.error,

    // Actions
    markAsRead: markChannelAsRead,
    toggleMuted,
    refresh: unreadCountQuery.refetch,
  };
}

/**
 * Hook for team unread counts
 * @param teamId Team ID
 * @returns Team unread count data and operations
 */
export function useTeamUnreadCount(teamId: string | undefined) {
  // Get team unread count query
  const teamUnreadQuery = useTeamUnreadCountQuery(teamId);

  // Get unread and channel stores
  const { getTeamUnreadCount, hasUnreadsInTeam, hasMentionsInTeam } =
    useUnreadStore();

  const { getChannelsByTeam } = useChannelStore();

  // Mark all as read mutation
  const markAllAsReadMutation = useMarkAllChannelsAsReadMutation();

  // Get channels for this team
  const channels = useMemo(() => {
    if (!teamId) return [];
    return getChannelsByTeam(teamId);
  }, [teamId, getChannelsByTeam]);

  // Unread counts for the team
  const unreadCount = useMemo(() => {
    if (!teamId || channels.length === 0) {
      return teamUnreadQuery.data || { msg_count: 0, mention_count: 0 };
    }

    // Get from store
    return getTeamUnreadCount(teamId, channels);
  }, [teamId, channels, getTeamUnreadCount, teamUnreadQuery.data]);

  // Formatted count for UI display
  const formattedCount = useMemo(() => {
    // Use unreadService to get consistent formatting
    const { text, color } = unreadService.formatUnreadBadgeData(
      unreadCount.msg_count,
      unreadCount.mention_count,
      false, // Teams aren't mutable
    );

    return {
      text,
      color,
      hasMentions: unreadCount.mention_count > 0,
      hasUnreads: unreadCount.msg_count > 0,
    };
  }, [unreadCount]);

  /**
   * Marks all channels in the team as read
   */
  const markAllAsRead = useCallback(async () => {
    if (!teamId) return;

    try {
      await markAllAsReadMutation.mutateAsync(teamId);
    } catch (error) {
      handleError(error as Error, ErrorSource.API);
    }
  }, [teamId, markAllAsReadMutation]);

  return {
    // Data
    unreadCount,
    formattedCount,
    hasUnreads: teamId ? hasUnreadsInTeam(teamId, channels) : false,
    hasMentions: teamId ? hasMentionsInTeam(teamId, channels) : false,

    // State
    isLoading: teamUnreadQuery.isLoading,
    isFetching: teamUnreadQuery.isFetching,
    error: teamUnreadQuery.error,
    isMarking: markAllAsReadMutation.isPending,

    // Actions
    markAllAsRead,
    refresh: teamUnreadQuery.refetch,
  };
}

/**
 * Hook for total unread counts across all teams
 * @returns Total unread count data
 */
export function useTotalUnreadCount() {
  // Get unread store
  const { getTotalUnreadCount, unreadCounts } = useUnreadStore();

  // Get channel store
  const { channelsByTeam } = useChannelStore();

  // Total unread count
  const totalUnreadCount = useMemo(() => {
    return getTotalUnreadCount();
  }, [getTotalUnreadCount, unreadCounts, channelsByTeam]);

  // Formatted count for UI display
  const formattedCount = useMemo(() => {
    // Use unreadService to get consistent formatting
    const { text, color } = unreadService.formatUnreadBadgeData(
      totalUnreadCount.msg_count,
      totalUnreadCount.mention_count,
      false,
    );

    return {
      text,
      color,
      hasMentions: totalUnreadCount.mention_count > 0,
      hasUnreads: totalUnreadCount.msg_count > 0,
    };
  }, [totalUnreadCount]);

  /**
   * Formats an unread count for display
   * @param count Unread count
   * @param maxCount Maximum count to display before truncating
   */
  const formatUnreadCount = useCallback(
    (count: number, maxCount: number = 99): string => {
      return unreadService.formatUnreadCount(count, maxCount);
    },
    [],
  );

  return {
    // Data
    totalUnreadCount,
    formattedCount,
    hasUnreads: totalUnreadCount.msg_count > 0,
    hasMentions: totalUnreadCount.mention_count > 0,

    // Helper methods
    formatUnreadCount,
  };
}

/**
 * Hook for unread channels
 * @param teamId Optional team ID to filter by
 * @returns Unread channel data
 */
export function useUnreadChannels(teamId?: string) {
  // Get unread and channel stores
  const { unreadCounts } = useUnreadStore();
  const { getChannelsByTeam, getChannelById } = useChannelStore();
  const { isChannelMuted } = useUserSettingsStore();

  // Get all channels or filtered by team
  const channels = useMemo(() => {
    if (teamId) {
      return getChannelsByTeam(teamId);
    }

    // Combine channels from all teams
    return Object.values(getChannelsByTeam(""));
  }, [teamId, getChannelsByTeam]);

  // Channels with unreads
  const unreadChannels = useMemo(() => {
    return channels.filter((channel) => {
      const count = unreadCounts[channel.id];
      if (!count) return false;

      // For muted channels, only show if there are mentions
      const muted = isChannelMuted(channel.id);
      if (muted && count.mention_count === 0) return false;

      return count.msg_count > 0;
    });
  }, [channels, unreadCounts, isChannelMuted]);

  // Channels with mentions
  const mentionChannels = useMemo(() => {
    return channels.filter((channel) => {
      const count = unreadCounts[channel.id];
      if (!count) return false;
      return count.mention_count > 0;
    });
  }, [channels, unreadCounts]);

  /**
   * Gets unread count for a channel
   * @param channelId Channel ID
   */
  const getUnreadCount = useCallback(
    (channelId: string): ChannelUnreadCount | null => {
      return unreadCounts[channelId] || null;
    },
    [unreadCounts],
  );

  /**
   * Gets formatted unread count for UI display
   * @param channelId Channel ID
   */
  const getFormattedUnreadCount = useCallback(
    (channelId: string): FormattedUnreadCount => {
      const count = unreadCounts[channelId];
      const muted = isChannelMuted(channelId);

      if (!count) {
        return {
          text: "",
          color: "default",
          hasMentions: false,
          hasUnreads: false,
        };
      }

      // Use unreadService to get consistent formatting
      const { text, color } = unreadService.formatUnreadBadgeData(
        count.msg_count,
        count.mention_count,
        muted,
      );

      return {
        text,
        color,
        hasMentions: count.mention_count > 0,
        hasUnreads: count.msg_count > 0,
      };
    },
    [unreadCounts, isChannelMuted],
  );

  return {
    // Data
    unreadChannels,
    mentionChannels,

    // Helper methods
    getUnreadCount,
    getFormattedUnreadCount,
  };
}
