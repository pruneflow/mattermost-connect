// src/hooks/useChannels.tsx
/**
 * Hook for channel functionality
 */
import { useCallback, useEffect, useMemo } from "react";
import {
  useChannelStore,
  Channel,
  getChannelsByType,
  ChannelGroupType,
  getChannelUnreadCount,
  getTeamUnreadCounts,
} from "../core/store/channelStore";
import {
  useChannelsQuery,
  useChannelQuery,
  useChannelUnreadCountQuery,
  useChannelUnreadCountsQuery,
  useCreateChannelMutation,
  useUpdateChannelMutation,
  useDeleteChannelMutation,
  useJoinChannelMutation,
  useLeaveChannelMutation,
  useViewChannelMutation,
  useAddChannelToFavoritesMutation,
  useRemoveChannelFromFavoritesMutation,
  useChannelMembersQuery,
  useToggleChannelMutedMutation,
  useMarkAllChannelsAsReadMutation,
} from "../core/api/queries/channelQueries";
import { useUnreadCounts } from "./useUnreadCounts";

/**
 * Hook that provides channels functionality for a team
 * @param teamId Team ID
 * @returns Channels state and actions
 */
export function useChannels(teamId: string | undefined) {
  // Get state from store
  const {
    activeChannel,
    setActiveChannel,
    getChannelById,
    updateTypingUsers,
    markAsRead,
    markAllAsRead,
    setChannelMuted,
  } = useChannelStore();

  // Get channels query
  const channelsQuery = useChannelsQuery(teamId);

  // Get unread counts for all channels in the team
  const unreadCountsQuery = useChannelUnreadCountsQuery(teamId);

  // Get unread counts hook
  const {
    getChannelUnreadCountsByTeam,
    hasUnreadsInChannel,
    hasMentionsInChannel,
    isChannelMuted,
  } = useUnreadCounts();

  // View channel mutation for marking as read
  const viewChannelMutation = useViewChannelMutation();

  // Mark all as read mutation
  const markAllChannelsAsReadMutation = useMarkAllChannelsAsReadMutation();

  // Toggle channel muted mutation
  const toggleChannelMutedMutation = useToggleChannelMutedMutation();

  /**
   * Gets channels of a specific type for the team
   * @param type Channel type
   * @returns List of channels of the specified type
   */
  const getChannelsByGroup = useCallback(
    (type: ChannelGroupType) => {
      if (!teamId) return [];
      return getChannelsByType(teamId, type);
    },
    [teamId],
  );

  /**
   * Sets the active channel by ID
   * @param channelId Channel ID
   */
  const setActiveChannelById = useCallback(
    (channelId: string | null) => {
      if (!channelId) {
        setActiveChannel(null);
        return;
      }

      const channel = getChannelById(channelId);
      if (channel) {
        setActiveChannel(channel);

        // Also mark as read when setting active
        markAsRead(channelId);
        viewChannelMutation.mutate(channelId);
      }
    },
    [getChannelById, setActiveChannel, markAsRead, viewChannelMutation],
  );

  /**
   * Refreshes the channels list
   * @returns Promise resolving to the refreshed channels
   */
  const refreshChannels = useCallback(async () => {
    // Also refresh unread counts
    unreadCountsQuery.refetch();
    return channelsQuery.refetch().then((result) => result.data || []);
  }, [channelsQuery, unreadCountsQuery]);

  /**
   * Marks a channel as viewed
   * @param channelId Channel ID
   * @returns Promise resolving to the channel ID
   */
  const viewChannel = useCallback(
    async (channelId: string) => {
      // Update local state immediately for better UX
      markAsRead(channelId);

      // Call API to update server state
      return viewChannelMutation.mutateAsync(channelId);
    },
    [viewChannelMutation, markAsRead],
  );

  /**
   * Marks all channels in the team as read
   * @returns Promise resolving to the team ID
   */
  const markAllChannelsAsRead = useCallback(async () => {
    if (!teamId) return;

    // Update local state immediately for better UX
    markAllAsRead(teamId);

    // Call API to update server state
    return markAllChannelsAsReadMutation.mutateAsync(teamId);
  }, [teamId, markAllAsRead, markAllChannelsAsReadMutation]);

  /**
   * Toggles whether a channel is muted
   * @param channelId Channel ID
   * @param muted Whether to mute the channel
   * @returns Promise resolving when completed
   */
  const toggleChannelMuted = useCallback(
    async (channelId: string, muted: boolean) => {
      // Update local state immediately for better UX
      setChannelMuted(channelId, muted);

      // Call API to update server state
      return toggleChannelMutedMutation.mutateAsync({ channelId, muted });
    },
    [setChannelMuted, toggleChannelMutedMutation],
  );

  /**
   * Gets the unread counts for all channels in the team
   * @returns Map of channel IDs to unread counts
   */
  const getUnreadCounts = useCallback(() => {
    if (!teamId) return {};
    return getChannelUnreadCountsByTeam(teamId);
  }, [teamId, getChannelUnreadCountsByTeam]);

  /**
   * Gets the total unread counts for the team
   * @returns Object with message and mention counts
   */
  const getTeamUnreads = useCallback(() => {
    if (!teamId) return { messageCount: 0, mentionCount: 0 };
    return getTeamUnreadCounts(teamId);
  }, [teamId]);

  /**
   * Checks if a channel has unread messages
   * @param channelId Channel ID
   * @returns Whether the channel has unread messages
   */
  const channelHasUnreads = useCallback(
    (channelId: string) => {
      return hasUnreadsInChannel(channelId);
    },
    [hasUnreadsInChannel],
  );

  /**
   * Checks if a channel has mentions
   * @param channelId Channel ID
   * @returns Whether the channel has mentions
   */
  const channelHasMentions = useCallback(
    (channelId: string) => {
      return hasMentionsInChannel(channelId);
    },
    [hasMentionsInChannel],
  );

  /**
   * Gets current unread data in a format suitable for UI components
   * @returns Object with unread data for UI
   */
  const unreadData = useMemo(() => {
    // Return format expected by ChannelListUI
    if (!teamId) {
      return {
        unreadCounts: {},
        favoriteChannels: new Set<string>(),
        mutedChannels: new Set<string>(),
      };
    }

    const teamChannels = getChannelsByGroup("public")
      .concat(getChannelsByGroup("private"))
      .concat(getChannelsByGroup("direct"))
      .concat(getChannelsByGroup("group"));

    // Build unread counts for UI
    const unreadCounts: Record<
      string,
      { messageCount: number; mentionCount: number }
    > = {};
    const mutedChannels = new Set<string>();
    const favoriteChannels = new Set<string>();

    // Populate data from the store for UI components
    teamChannels.forEach((channel) => {
      // Get unread counts
      const unreadData = getChannelUnreadCount(channel.id);
      unreadCounts[channel.id] = {
        messageCount: unreadData.messageCount,
        mentionCount: unreadData.mentionCount,
      };

      // Track muted state
      if (isChannelMuted(channel.id)) {
        mutedChannels.add(channel.id);
      }

      // Track favorites
      if (channel.is_favorite) {
        favoriteChannels.add(channel.id);
      }
    });

    return {
      unreadCounts,
      favoriteChannels,
      mutedChannels,
    };
  }, [teamId, getChannelsByGroup, isChannelMuted]);

  return {
    // State
    channels: channelsQuery.data || [],
    publicChannels: getChannelsByGroup("public"),
    privateChannels: getChannelsByGroup("private"),
    directChannels: getChannelsByGroup("direct"),
    groupChannels: getChannelsByGroup("group"),
    favoriteChannels: getChannelsByGroup("favorite"),
    activeChannel,
    isLoading:
      channelsQuery.isLoading ||
      channelsQuery.isFetching ||
      unreadCountsQuery.isLoading,
    error: channelsQuery.error,

    // Unread counts
    unreadCounts: unreadData.unreadCounts,
    mutedChannels: unreadData.mutedChannels,
    favoriteChannelSet: unreadData.favoriteChannels,
    teamUnreads: getTeamUnreads(),

    // Status flags
    isMarkingAsRead: viewChannelMutation.isPending,
    isMarkingAllAsRead: markAllChannelsAsReadMutation.isPending,
    isTogglingMuted: toggleChannelMutedMutation.isPending,

    // Actions
    setActiveChannel,
    setActiveChannelById,
    getChannelById,
    refreshChannels,
    updateTypingUsers,
    markAsRead,
    viewChannel,
    markAllChannelsAsRead,
    toggleChannelMuted,
    channelHasUnreads,
    channelHasMentions,
  };
}

/**
 * Hook that provides functionality for a specific channel
 * @param channelId Channel ID
 * @returns Channel state and actions
 */
export function useChannel(channelId: string | undefined) {
  // Get state from store
  const { setActiveChannel, getChannelById, markAsRead, setChannelMuted } =
    useChannelStore();

  // Get channel queries
  const channelQuery = useChannelQuery(channelId);
  const channelUnreadCountQuery = useChannelUnreadCountQuery(channelId);
  const channelMembersQuery = useChannelMembersQuery(channelId);

  // Get unread counts hook for this specific channel
  const {
    getChannelUnreadCount,
    hasUnreadsInChannel,
    hasMentionsInChannel,
    isChannelMuted,
  } = useUnreadCounts();

  // Get channel mutations
  const updateChannelMutation = useUpdateChannelMutation();
  const deleteChannelMutation = useDeleteChannelMutation();
  const leaveChannelMutation = useLeaveChannelMutation();
  const viewChannelMutation = useViewChannelMutation();
  const addToFavoritesMutation = useAddChannelToFavoritesMutation();
  const removeFromFavoritesMutation = useRemoveChannelFromFavoritesMutation();
  const toggleChannelMutedMutation = useToggleChannelMutedMutation();

  /**
   * Updates a channel
   * @param channelData Channel data to update
   * @returns Promise resolving to the updated channel
   */
  const updateChannel = useCallback(
    async (channelData: Partial<Channel>) => {
      if (!channelId) {
        throw new Error("Channel ID is required for update");
      }

      return updateChannelMutation.mutateAsync({
        channelId,
        channelData,
      });
    },
    [channelId, updateChannelMutation],
  );

  /**
   * Deletes a channel
   * @returns Promise resolving to the deleted channel ID
   */
  const deleteChannel = useCallback(async () => {
    if (!channelId) {
      throw new Error("Channel ID is required for deletion");
    }

    return deleteChannelMutation.mutateAsync(channelId);
  }, [channelId, deleteChannelMutation]);

  /**
   * Leaves a channel
   * @returns Promise resolving to the left channel ID
   */
  const leaveChannel = useCallback(async () => {
    if (!channelId) {
      throw new Error("Channel ID is required to leave");
    }

    return leaveChannelMutation.mutateAsync(channelId);
  }, [channelId, leaveChannelMutation]);

  /**
   * Marks the channel as viewed
   * @returns Promise resolving to the viewed channel ID
   */
  const viewChannel = useCallback(async () => {
    if (!channelId) {
      throw new Error("Channel ID is required to view");
    }

    // Update local state for immediate feedback
    markAsRead(channelId);

    // Call API
    return viewChannelMutation.mutateAsync(channelId);
  }, [channelId, markAsRead, viewChannelMutation]);

  /**
   * Marks the channel as read in local state
   */
  const markChannelAsRead = useCallback(() => {
    if (channelId) {
      markAsRead(channelId);
    }
  }, [channelId, markAsRead]);

  /**
   * Adds the channel to favorites
   * @returns Promise resolving to the channel ID
   */
  const addToFavorites = useCallback(async () => {
    if (!channelId) {
      throw new Error("Channel ID is required to add to favorites");
    }

    return addToFavoritesMutation.mutateAsync(channelId);
  }, [channelId, addToFavoritesMutation]);

  /**
   * Removes the channel from favorites
   * @returns Promise resolving to the channel ID
   */
  const removeFromFavorites = useCallback(async () => {
    if (!channelId) {
      throw new Error("Channel ID is required to remove from favorites");
    }

    return removeFromFavoritesMutation.mutateAsync(channelId);
  }, [channelId, removeFromFavoritesMutation]);

  /**
   * Toggles whether the channel is muted
   * @param muted Whether to mute the channel
   * @returns Promise resolving when completed
   */
  const toggleMuted = useCallback(
    async (muted: boolean) => {
      if (!channelId) {
        throw new Error("Channel ID is required to toggle mute");
      }

      // Update local state
      setChannelMuted(channelId, muted);

      // Call API
      return toggleChannelMutedMutation.mutateAsync({ channelId, muted });
    },
    [channelId, setChannelMuted, toggleChannelMutedMutation],
  );

  /**
   * Sets this channel as active
   */
  const setAsActive = useCallback(() => {
    if (channelId) {
      const channel = getChannelById(channelId);
      if (channel) {
        setActiveChannel(channel);

        // Mark as read when set as active
        markAsRead(channelId);
        viewChannelMutation.mutate(channelId);
      }
    }
  }, [
    channelId,
    getChannelById,
    setActiveChannel,
    markAsRead,
    viewChannelMutation,
  ]);

  /**
   * Refreshes the channel data
   * @returns Promise resolving to the refreshed channel
   */
  const refreshChannel = useCallback(async () => {
    // Also refresh unread count
    channelUnreadCountQuery.refetch();
    return channelQuery.refetch().then((result) => result.data || null);
  }, [channelQuery, channelUnreadCountQuery]);

  /**
   * Gets the unread count data for this channel
   */
  const unreadCount = useMemo(() => {
    if (!channelId) return { messageCount: 0, mentionCount: 0 };
    return getChannelUnreadCount(channelId);
  }, [channelId, getChannelUnreadCount]);

  /**
   * Checks if the channel has unread messages
   */
  const hasUnreads = useMemo(() => {
    if (!channelId) return false;
    return hasUnreadsInChannel(channelId);
  }, [channelId, hasUnreadsInChannel]);

  /**
   * Checks if the channel has mentions
   */
  const hasMentions = useMemo(() => {
    if (!channelId) return false;
    return hasMentionsInChannel(channelId);
  }, [channelId, hasMentionsInChannel]);

  /**
   * Checks if the channel is muted
   */
  const isMuted = useMemo(() => {
    if (!channelId) return false;
    return isChannelMuted(channelId);
  }, [channelId, isChannelMuted]);

  return {
    // State
    channel: channelQuery.data,
    unreadCount,
    members: channelMembersQuery.data,
    isLoading: channelQuery.isLoading || channelQuery.isFetching,
    isUpdating: updateChannelMutation.isPending,
    isDeleting: deleteChannelMutation.isPending,
    isLeaving: leaveChannelMutation.isPending,
    error: channelQuery.error,

    // Unread state
    hasUnreads,
    hasMentions,
    isMuted,

    // Actions
    updateChannel,
    deleteChannel,
    leaveChannel,
    viewChannel,
    markChannelAsRead,
    addToFavorites,
    removeFromFavorites,
    toggleMuted,
    setAsActive,
    refreshChannel,
  };
}

/**
 * Hook that provides channel creation functionality
 * @returns Channel creation actions and state
 */
export function useChannelCreation() {
  // Get channel creation mutation
  const createChannelMutation = useCreateChannelMutation();
  const joinChannelMutation = useJoinChannelMutation();

  /**
   * Creates a new channel
   * @param channelData Channel data to create
   * @returns Promise resolving to the created channel
   */
  const createChannel = useCallback(
    async (channelData: {
      team_id: string;
      name: string;
      display_name: string;
      type: "O" | "P";
      purpose?: string;
      header?: string;
    }) => {
      return createChannelMutation.mutateAsync(channelData);
    },
    [createChannelMutation],
  );

  /**
   * Joins a channel
   * @param channelId Channel ID
   * @param teamId Team ID
   * @returns Promise resolving to the joined channel
   */
  const joinChannel = useCallback(
    async (channelId: string, teamId: string) => {
      return joinChannelMutation.mutateAsync({ channelId, teamId });
    },
    [joinChannelMutation],
  );

  return {
    // State
    isCreating: createChannelMutation.isPending,
    isJoining: joinChannelMutation.isPending,
    createError: createChannelMutation.error,
    joinError: joinChannelMutation.error,

    // Actions
    createChannel,
    joinChannel,
  };
}
