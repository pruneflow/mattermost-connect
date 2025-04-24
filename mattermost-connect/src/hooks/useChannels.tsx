// src/hooks/useChannels.tsx
/**
 * Hook for channel functionality
 */
import { useCallback } from "react";
import {
  useChannelStore,
  Channel,
  getChannelsByType,
  ChannelGroupType,
} from "../core/store/channelStore";
import {
  useChannelsQuery,
  useChannelQuery,
  useChannelUnreadCountQuery,
  useCreateChannelMutation,
  useUpdateChannelMutation,
  useDeleteChannelMutation,
  useJoinChannelMutation,
  useLeaveChannelMutation,
  useViewChannelMutation,
  useAddChannelToFavoritesMutation,
  useRemoveChannelFromFavoritesMutation,
  useChannelMembersQuery,
} from "../core/api/queries/channelQueries";

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
  } = useChannelStore();

  // Get channels query
  const channelsQuery = useChannelsQuery(teamId);

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
      }
    },
    [getChannelById, setActiveChannel],
  );

  /**
   * Refreshes the channels list
   * @returns Promise resolving to the refreshed channels
   */
  const refreshChannels = useCallback(async () => {
    return channelsQuery.refetch().then((result) => result.data || []);
  }, [channelsQuery]);

  // Get channel view mutation
  const viewChannelMutation = useViewChannelMutation();

  /**
   * Marks a channel as viewed
   * @param channelId Channel ID
   * @returns Promise resolving to the channel ID
   */
  const viewChannel = useCallback(
    async (channelId: string) => {
      return viewChannelMutation.mutateAsync(channelId);
    },
    [viewChannelMutation],
  );

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

    // Actions
    setActiveChannel,
    setActiveChannelById,
    getChannelById,
    refreshChannels,
    updateTypingUsers,
    markAsRead,
    viewChannel,
  };
}

/**
 * Hook that provides functionality for a specific channel
 * @param channelId Channel ID
 * @returns Channel state and actions
 */
export function useChannel(channelId: string | undefined) {
  // Get state from store
  const { setActiveChannel, getChannelById, markAsRead } = useChannelStore();

  // Get channel queries
  const channelQuery = useChannelQuery(channelId);
  const channelUnreadCountQuery = useChannelUnreadCountQuery(channelId);
  const channelMembersQuery = useChannelMembersQuery(channelId);

  // Get channel mutations
  const updateChannelMutation = useUpdateChannelMutation();
  const deleteChannelMutation = useDeleteChannelMutation();
  const leaveChannelMutation = useLeaveChannelMutation();
  const viewChannelMutation = useViewChannelMutation();
  const addToFavoritesMutation = useAddChannelToFavoritesMutation();
  const removeFromFavoritesMutation = useRemoveChannelFromFavoritesMutation();

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

    return viewChannelMutation.mutateAsync(channelId);
  }, [channelId, viewChannelMutation]);

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
   * Sets this channel as active
   */
  const setAsActive = useCallback(() => {
    if (channelId) {
      const channel = getChannelById(channelId);
      if (channel) {
        setActiveChannel(channel);
      }
    }
  }, [channelId, getChannelById, setActiveChannel]);

  /**
   * Refreshes the channel data
   * @returns Promise resolving to the refreshed channel
   */
  const refreshChannel = useCallback(async () => {
    return channelQuery.refetch().then((result) => result.data || null);
  }, [channelQuery]);

  return {
    // State
    channel: channelQuery.data,
    unreadCount: channelUnreadCountQuery.data,
    members: channelMembersQuery.data,
    isLoading: channelQuery.isLoading || channelQuery.isFetching,
    isUpdating: updateChannelMutation.isPending,
    isDeleting: deleteChannelMutation.isPending,
    isLeaving: leaveChannelMutation.isPending,
    error: channelQuery.error,

    // Actions
    updateChannel,
    deleteChannel,
    leaveChannel,
    viewChannel,
    markChannelAsRead,
    addToFavorites,
    removeFromFavorites,
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
