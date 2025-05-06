// src/hooks/useChannels.tsx
/**
 * Channel hooks
 * Provides access to channel functionality
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useChannelsQuery,
  useChannelQuery,
  useCreateChannelMutation,
  useUpdateChannelMutation,
  useDeleteChannelMutation,
  useJoinChannelMutation,
  useLeaveChannelMutation,
  useViewChannelMutation,
  useChannelMembersQuery,
  useAddChannelToFavoritesMutation,
  useRemoveChannelFromFavoritesMutation,
  useToggleChannelMutedMutation,
} from "../core/api/queries/channelQueries";
import { useUsersQuery } from "../core/api/queries/userQueries";
import { useChannelStore } from "../core/store/channelStore";
import { useDirectChannelStore } from "../core/store/directChannelStore";
import { useUserSettingsStore } from "../core/store/userSettingsStore";
import { useUnreadStore } from "../core/store/unreadStore";
import { useUserStore } from "../core/store/userStore";
import { channelService } from "../core/services/channelService";
import { channelLoadingService } from "../core/services/channelLoadingService";
import {
  Channel,
  ChannelMember,
  ChannelGroupType,
  CreateChannelParams,
  UpdateChannelParams,
  DirectChannelInfo,
} from "../types";
import { useAuthStore } from "../core/store/authStore";
import { handleError } from "../core/store/errorStore";
import { ErrorSource } from "../types";

/**
 * Hook for channel management functionality
 * @param teamId Team ID
 * @returns Channel operations and data
 */
export function useChannels(teamId: string | undefined) {
  // Current user ID for filtering
  const { currentUser } = useAuthStore();

  // Add state to track loading phases to prevent loops
  const [loadingPhase, setLoadingPhase] = useState;
  "idle" | "channels" | "users" | ("complete" > "idle");

  // State for tracking preload status
  const [hasPreloadedUsers, setHasPreloadedUsers] = useState(false);

  // Get channels using React Query
  const channelsQuery = useChannelsQuery(teamId);

  // Get channel state from store
  const {
    getChannelsByTeam,
    getChannelsByType,
    activeChannel,
    isLoading: storeLoading,
    error: storeError,
  } = useChannelStore();

  // Get direct channel store for preloading
  const { preloadDirectChannelsInfo, refreshDirectChannelInfo } =
    useDirectChannelStore();

  // Get user store for preloading with additional batch loading capability
  const { loadUsersBatch, setLoadingUsersBatch, isLoadingUserBatch } =
    useUserStore();

  // Update the setActiveChannel to use the store's function directly
  const setActiveChannel = useCallback((channel: Channel) => {
    return useChannelStore.getState().setActiveChannel(channel);
  }, []);

  // Favorites and muted channels
  const { getFavorites, isFavorite, getMutedChannels, isChannelMuted } =
    useUserSettingsStore();

  // Unread store
  const { unreadCounts } = useUnreadStore();

  // Get channels by type using memo to avoid recalculation
  const publicChannels = useMemo(() => {
    if (!teamId) return [];
    return getChannelsByType(teamId, "public");
  }, [teamId, getChannelsByType]);

  const privateChannels = useMemo(() => {
    if (!teamId) return [];
    return getChannelsByType(teamId, "private");
  }, [teamId, getChannelsByType]);

  const directChannels = useMemo(() => {
    if (!teamId) return [];
    return getChannelsByType(teamId, "direct");
  }, [teamId, getChannelsByType]);

  const groupChannels = useMemo(() => {
    if (!teamId) return [];
    return getChannelsByType(teamId, "group");
  }, [teamId, getChannelsByType]);

  const favoriteChannels = useMemo(() => {
    if (!teamId) return [];
    return getChannelsByType(teamId, "favorite");
  }, [teamId, getChannelsByType]);

  // Preload direct channel users
  useEffect(() => {
    // Skip if no channels or no current user
    if (!teamId || !currentUser) {
      return;
    }

    // Prevent unnecessary work if we're already done
    if (hasPreloadedUsers || loadingPhase === "complete") {
      return;
    }

    // Only proceed with preloading if we have direct/group channels
    const allDirectAndGroupChannels = [...directChannels, ...groupChannels];
    if (allDirectAndGroupChannels.length === 0) {
      setHasPreloadedUsers(true);
      setLoadingPhase("complete");
      return;
    }

    // Start preloading if we're in the idle phase or channels phase
    if (loadingPhase === "idle") {
      setLoadingPhase("channels");
    }

    // Don't proceed further if we're not in the channels phase
    if (loadingPhase !== "channels") {
      return;
    }

    // Check if any of these channels are already being loaded
    const isAnyChannelLoading = allDirectAndGroupChannels.some((channel) =>
      channelLoadingService.isChannelLoading(channel.id),
    );

    // If channels are already loading, wait for the next cycle
    if (isAnyChannelLoading) {
      return;
    }

    // Start user preloading phase
    setLoadingPhase("users");

    // Use the channel loading service to preload direct channel info
    const userIdsToLoad = preloadDirectChannelsInfo(
      allDirectAndGroupChannels,
      currentUser.id,
    );

    // Skip if there are no users to load or preloading is already flagged
    if (userIdsToLoad.length === 0) {
      setHasPreloadedUsers(true);
      setLoadingPhase("complete");
      return;
    }

    // Check if any users are already being loaded
    const isAnyUserLoading = userIdsToLoad.some((userId) =>
      channelLoadingService.isUserLoading(userId),
    );

    // If users are already loading, wait for the next cycle
    if (isAnyUserLoading || isLoadingUserBatch(userIdsToLoad)) {
      return;
    }

    // Set loading flag in the user store
    setLoadingUsersBatch(userIdsToLoad, true);

    // Batch load users via the store
    loadUsersBatch(userIdsToLoad);

    // Create users query to fetch the users
    const usersQuery = useUsersQuery({
      userIds: userIdsToLoad,
      withStatuses: true,
    });

    // Execute the query and finalize
    usersQuery
      .refetch()
      .then(() => {
        // Clear loading flags
        setLoadingUsersBatch(userIdsToLoad, false);

        // Update state to reflect completion
        setHasPreloadedUsers(true);
        setLoadingPhase("complete");

        // Refresh direct channel info for all channels
        allDirectAndGroupChannels.forEach((channel) => {
          if (!channelLoadingService.isChannelLoading(channel.id)) {
            refreshDirectChannelInfo(channel.id, currentUser.id);
          }
        });
      })
      .catch((error) => {
        // Handle errors during preload
        setLoadingUsersBatch(userIdsToLoad, false);
        handleError(error as Error, ErrorSource.API, undefined, {
          method: "preloadDirectChannelUsers",
          userIds: userIdsToLoad.join(","),
        });

        // Even if there's an error, mark as complete to avoid locking
        setHasPreloadedUsers(true);
        setLoadingPhase("complete");
      });
  }, [
    teamId,
    currentUser,
    directChannels,
    groupChannels,
    hasPreloadedUsers,
    loadingPhase,
    preloadDirectChannelsInfo,
    loadUsersBatch,
    setLoadingUsersBatch,
    isLoadingUserBatch,
    refreshDirectChannelInfo,
  ]);

  // Reset preload status when team changes
  useEffect(() => {
    if (teamId) {
      setHasPreloadedUsers(false);
      setLoadingPhase("idle");
    }
  }, [teamId]);

  // View channel mutation
  const viewMutation = useViewChannelMutation();

  /**
   * Sets the active channel and marks as viewed
   * @param channel Channel to make active
   */
  const selectChannel = useCallback(
    async (channel: Channel) => {
      // Set as active channel
      setActiveChannel(channel);

      // Mark as viewed
      try {
        await viewMutation.mutateAsync(channel.id);
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
      }
    },
    [setActiveChannel, viewMutation],
  );

  /**
   * Refreshes channel data with safeguards against loops
   */
  const refreshChannels = useCallback(() => {
    // Only reset if we're not already in a loading phase
    if (loadingPhase !== "idle" && loadingPhase !== "complete") {
      return channelsQuery.refetch();
    }

    // Reset preload status to trigger a fresh preload
    setHasPreloadedUsers(false);
    setLoadingPhase("idle");

    return channelsQuery.refetch();
  }, [channelsQuery, loadingPhase]);

  /**
   * Checks if a channel has unreads
   * @param channelId Channel ID
   */
  const hasUnreads = useCallback(
    (channelId: string): boolean => {
      const unreadCount = unreadCounts[channelId];
      if (!unreadCount) return false;
      return unreadCount.msg_count > 0 || unreadCount.mention_count > 0;
    },
    [unreadCounts],
  );

  /**
   * Checks if a channel has mentions
   * @param channelId Channel ID
   */
  const hasMentions = useCallback(
    (channelId: string): boolean => {
      const unreadCount = unreadCounts[channelId];
      if (!unreadCount) return false;
      return unreadCount.mention_count > 0;
    },
    [unreadCounts],
  );

  /**
   * Gets display info for a direct channel
   * @param channelId Channel ID
   */
  const getDirectChannelInfo = useCallback(
    (channelId: string): DirectChannelInfo | null => {
      return useDirectChannelStore.getState().getDirectChannelInfo(channelId);
    },
    [],
  );

  // Calculate loading state, with safeguards against unnecessary renders
  const isLoading = useMemo(() => {
    // Consider loading if we're in any loading phase except complete
    const isPreloading = loadingPhase !== "complete";

    // Also consider loading if the channel store is loading
    return channelsQuery.isLoading || storeLoading || isPreloading;
  }, [channelsQuery.isLoading, storeLoading, loadingPhase]);

  return {
    // Data
    channels: teamId ? getChannelsByTeam(teamId) : [],
    publicChannels,
    privateChannels,
    directChannels,
    groupChannels,
    favoriteChannels,
    activeChannel,

    // State
    isLoading,
    isFetching: channelsQuery.isFetching,
    error: channelsQuery.error || storeError,
    hasPreloadedUsers,
    loadingPhase,

    // Actions
    selectChannel,
    refreshChannels,
    setActiveChannel,

    // Helper methods
    hasUnreads,
    hasMentions,
    isFavorite,
    isChannelMuted,
    getDirectChannelInfo,
  };
}

/**
 * Hook for a specific channel
 * @param channelId Channel ID
 * @returns Channel data and operations
 */
export function useChannel(channelId: string | undefined) {
  // Current user ID for filtering
  const { currentUser } = useAuthStore();

  // Get specific channel using React Query
  const channelQuery = useChannelQuery(channelId);

  // Get channel members
  const membersQuery = useChannelMembersQuery(channelId);

  // Channel store access
  const { getChannelById, updateChannel, removeChannel } = useChannelStore();

  // Direct channel info
  const { getDirectChannelInfo, refreshDirectChannelInfo } =
    useDirectChannelStore();

  // Favorites and muted channels
  const { isFavorite, toggleFavorite, isChannelMuted, toggleMuted } =
    useUserSettingsStore();

  // Channel mutations
  const updateMutation = useUpdateChannelMutation();
  const deleteMutation = useDeleteChannelMutation();
  const viewMutation = useViewChannelMutation();
  const joinMutation = useJoinChannelMutation();
  const leaveMutation = useLeaveChannelMutation();
  const addToFavoritesMutation = useAddChannelToFavoritesMutation();
  const removeFromFavoritesMutation = useRemoveChannelFromFavoritesMutation();
  const toggleMutedMutation = useToggleChannelMutedMutation();

  // Current channel from store or query
  const channel = useMemo(() => {
    if (!channelId) return null;
    return getChannelById(channelId) || channelQuery.data || null;
  }, [channelId, getChannelById, channelQuery.data]);

  // Direct channel info if this is a DM/GM
  const directInfo = useMemo(() => {
    if (!channelId || !channel) return null;

    if (channelService.isDirectOrGroupChannel(channel)) {
      return getDirectChannelInfo(channelId);
    }

    return null;
  }, [channelId, channel, getDirectChannelInfo]);

  // Refresh direct channel info when needed, with safeguards against loops
  useEffect(() => {
    if (
      channel &&
      currentUser &&
      channelService.isDirectOrGroupChannel(channel) &&
      (!directInfo || directInfo.status === "loading")
    ) {
      // Check if channel is already loading to avoid loops
      if (!channelLoadingService.isChannelLoading(channelId!)) {
        // Mark as loading in the service before refreshing to prevent loops
        channelLoadingService.setChannelLoading(channelId!, true);

        // Request refresh
        refreshDirectChannelInfo(channelId!, currentUser.id);

        // Clear loading state after a short delay to prevent locking
        setTimeout(() => {
          channelLoadingService.setChannelLoading(channelId!, false);
        }, 100);
      }
    }
  }, [channel, currentUser, directInfo, channelId, refreshDirectChannelInfo]);

  // Channel type helpers
  const isPublic = useMemo(() => {
    return channel ? channelService.isPublicChannel(channel) : false;
  }, [channel]);

  const isPrivate = useMemo(() => {
    return channel ? channelService.isPrivateChannel(channel) : false;
  }, [channel]);

  const isDirect = useMemo(() => {
    return channel ? channelService.isDirectChannel(channel) : false;
  }, [channel]);

  const isGroup = useMemo(() => {
    return channel ? channelService.isGroupChannel(channel) : false;
  }, [channel]);

  /**
   * Updates the channel
   * @param updateData Channel update data
   */
  const update = useCallback(
    async (updateData: UpdateChannelParams) => {
      if (!channelId) return null;
      try {
        return await updateMutation.mutateAsync({
          channelId,
          channelData: updateData,
        });
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        throw error;
      }
    },
    [channelId, updateMutation],
  );

  /**
   * Deletes the channel
   */
  const deleteChannel = useCallback(async () => {
    if (!channelId) return;
    try {
      await deleteMutation.mutateAsync(channelId);
    } catch (error) {
      handleError(error as Error, ErrorSource.API);
      throw error;
    }
  }, [channelId, deleteMutation]);

  /**
   * Marks the channel as viewed
   */
  const markAsViewed = useCallback(async () => {
    if (!channelId) return;
    try {
      await viewMutation.mutateAsync(channelId);
    } catch (error) {
      handleError(error as Error, ErrorSource.API);
      throw error;
    }
  }, [channelId, viewMutation]);

  /**
   * Joins the channel
   */
  const joinChannel = useCallback(async () => {
    if (!channelId || !channel?.team_id) return;
    try {
      await joinMutation.mutateAsync({ channelId, teamId: channel.team_id });
    } catch (error) {
      handleError(error as Error, ErrorSource.API);
      throw error;
    }
  }, [channelId, channel, joinMutation]);

  /**
   * Leaves the channel
   */
  const leaveChannel = useCallback(async () => {
    if (!channelId) return;
    try {
      await leaveMutation.mutateAsync(channelId);
    } catch (error) {
      handleError(error as Error, ErrorSource.API);
      throw error;
    }
  }, [channelId, leaveMutation]);

  /**
   * Toggles favorite status
   */
  const toggleFavoriteStatus = useCallback(async () => {
    if (!channelId) return;
    try {
      const isFav = isFavorite(channelId);
      if (isFav) {
        await removeFromFavoritesMutation.mutateAsync(channelId);
      } else {
        await addToFavoritesMutation.mutateAsync(channelId);
      }
    } catch (error) {
      handleError(error as Error, ErrorSource.API);
      throw error;
    }
  }, [
    channelId,
    isFavorite,
    addToFavoritesMutation,
    removeFromFavoritesMutation,
  ]);

  /**
   * Toggles muted status
   */
  const toggleMutedStatus = useCallback(async () => {
    if (!channelId) return;
    try {
      const muted = isChannelMuted(channelId);
      await toggleMutedMutation.mutateAsync({ channelId, muted: !muted });
    } catch (error) {
      handleError(error as Error, ErrorSource.API);
      throw error;
    }
  }, [channelId, isChannelMuted, toggleMutedMutation]);

  /**
   * Refreshes channel data
   */
  const refreshChannel = useCallback(() => {
    return channelQuery.refetch();
  }, [channelQuery]);

  /**
   * Refreshes channel members
   */
  const refreshMembers = useCallback(() => {
    return membersQuery.refetch();
  }, [membersQuery]);

  return {
    // Data
    channel,
    members: membersQuery.data || [],
    directInfo,
    isFavorite: channelId ? isFavorite(channelId) : false,
    isMuted: channelId ? isChannelMuted(channelId) : false,

    // Type helpers
    isPublic,
    isPrivate,
    isDirect,
    isGroup,

    // State
    isLoading: channelQuery.isLoading || membersQuery.isLoading,
    isLoadingMembers: membersQuery.isLoading,
    error: channelQuery.error || membersQuery.error,

    // Actions
    update,
    deleteChannel,
    markAsViewed,
    joinChannel,
    leaveChannel,
    toggleFavoriteStatus,
    toggleMutedStatus,
    refreshChannel,
    refreshMembers,

    // Mutations state
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isJoining: joinMutation.isPending,
    isLeaving: leaveMutation.isPending,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
  };
}

/**
 * Hook for channel creation
 * @param teamId Team ID
 * @returns Channel creation functionality
 */
export function useChannelCreation(teamId: string | undefined) {
  // Create channel mutation
  const createMutation = useCreateChannelMutation();

  /**
   * Creates a new channel
   * @param channelData Channel creation data
   */
  const createChannel = useCallback(
    async (
      channelData: Omit<CreateChannelParams, "team_id">,
    ): Promise<Channel> => {
      if (!teamId) {
        throw new Error("Team ID is required to create a channel");
      }

      try {
        return await createMutation.mutateAsync({
          ...channelData,
          team_id: teamId,
        });
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        throw error;
      }
    },
    [teamId, createMutation],
  );

  /**
   * Validates channel name for creation
   * @param name Channel name to validate
   */
  const validateChannelName = useCallback((name: string): boolean => {
    return channelService.validateChannelName(name);
  }, []);

  /**
   * Creates URL-friendly channel name from display name
   * @param displayName Display name
   */
  const sanitizeChannelName = useCallback((displayName: string): string => {
    return channelService.sanitizeChannelName(displayName);
  }, []);

  return {
    // Actions
    createChannel,
    validateChannelName,
    sanitizeChannelName,

    // State
    isCreating: createMutation.isPending,
    error: createMutation.error,
  };
}
