// src/hooks/useChannels.tsx
/**
 * Hook for channel functionality
 */
import { useCallback, useMemo } from "react";
import {
  useChannelStore,
  Channel,
  getChannelsByType,
  ChannelGroupType,
} from "../core/store/channelStore";
import {
  useChannelsQuery,
  useChannelQuery,
  useChannelMembersQuery,
  useCreateChannelMutation,
  useUpdateChannelMutation,
  useDeleteChannelMutation,
  useJoinChannelMutation,
  useLeaveChannelMutation,
  useAddChannelToFavoritesMutation,
  useRemoveChannelFromFavoritesMutation,
  useToggleChannelMutedMutation,
} from "../core/api/queries/channelQueries";
import { useUnreadCounts } from "./useUnreadCounts";

/**
 * Hook that provides channels functionality for a team
 * @param teamId Team ID
 * @returns Channels state and actions
 */
export function useChannels(teamId: string | undefined) {
  // Get state from store
  const { activeChannel, setActiveChannel, getChannelById, updateTypingUsers } =
    useChannelStore();

  // Get channels query
  const channelsQuery = useChannelsQuery(teamId);

  // Get unread counts hook
  const {
    getChannelUnreadCountsByTeam,
    markChannelAsRead,
    markTeamAsRead,
    toggleChannelMuted,
    hasUnreadsInChannel,
    hasMentionsInChannel,
    isChannelMuted,
    unreadCounts,
    teamUnreadCounts,
  } = useUnreadCounts();

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
        markChannelAsRead(channelId);
      }
    },
    [getChannelById, setActiveChannel, markChannelAsRead],
  );

  /**
   * Refreshes the channels list
   * @returns Promise resolving to the refreshed channels
   */
  const refreshChannels = useCallback(async () => {
    return channelsQuery.refetch().then((result) => result.data || []);
  }, [channelsQuery]);

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

    // Build sets for favorites and muted channels
    const mutedChannels = new Set<string>();
    const favoriteChannels = new Set<string>();

    // Populate data from the store for UI components
    teamChannels.forEach((channel) => {
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
  }, [teamId, getChannelsByGroup, isChannelMuted, unreadCounts]);

  return {
    // State
    channels: channelsQuery.data || [],
    publicChannels: getChannelsByGroup("public"),
    privateChannels: getChannelsByGroup("private"),
    directChannels: getChannelsByGroup("direct"),
    groupChannels: getChannelsByGroup("group"),
    favoriteChannels: getChannelsByGroup("favorite"),
    activeChannel,
    isLoading: channelsQuery.isLoading || channelsQuery.isFetching,
    error: channelsQuery.error,

    // Unread counts
    unreadCounts: unreadData.unreadCounts,
    mutedChannels: unreadData.mutedChannels,
    favoriteChannelSet: unreadData.favoriteChannels,
    teamUnreads: teamId
      ? teamUnreadCounts[teamId]
      : { msg_count: 0, mention_count: 0 },

    // Actions
    setActiveChannel,
    setActiveChannelById,
    getChannelById,
    refreshChannels,
    updateTypingUsers,

    // Unread count actions (exposed from useUnreadCounts)
    markChannelAsRead,
    markAllAsRead: teamId
      ? () => markTeamAsRead(teamId)
      : () => Promise.resolve(),
    toggleChannelMuted,
    hasUnreadsInChannel,
    hasMentionsInChannel,
    isChannelMuted,
  };
}

/**
 * Hook that provides functionality for a specific channel
 * @param channelId Channel ID
 * @returns Channel state and actions
 */
export function useChannel(channelId: string | undefined) {
  // Get state from store
  const { setActiveChannel, getChannelById } = useChannelStore();

  // Get channel queries
  const channelQuery = useChannelQuery(channelId);
  const channelMembersQuery = useChannelMembersQuery(channelId);

  // Get unread counts hook for this specific channel
  const {
    markChannelAsRead,
    hasUnreadsInChannel,
    hasMentionsInChannel,
    isChannelMuted,
    getChannelUnreadCount,
  } = useUnreadCounts();

  // Get channel mutations
  const updateChannelMutation = useUpdateChannelMutation();
  const deleteChannelMutation = useDeleteChannelMutation();
  const leaveChannelMutation = useLeaveChannelMutation();
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

    return markChannelAsRead(channelId);
  }, [channelId, markChannelAsRead]);

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

      return toggleChannelMutedMutation.mutateAsync({ channelId, muted });
    },
    [channelId, toggleChannelMutedMutation],
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
        markChannelAsRead(channelId);
      }
    }
  }, [channelId, getChannelById, setActiveChannel, markChannelAsRead]);

  /**
   * Refreshes the channel data
   * @returns Promise resolving to the refreshed channel
   */
  const refreshChannel = useCallback(async () => {
    return channelQuery.refetch().then((result) => result.data || null);
  }, [channelQuery]);

  /**
   * Gets the unread count data for this channel
   */
  const unreadCount = useMemo(() => {
    if (!channelId) return { msg_count: 0, mention_count: 0 };
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
