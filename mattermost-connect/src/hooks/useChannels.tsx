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
import { userService } from "../core/services/userService";
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

type LoadingPhase = "idle" | "channels" | "users" | "complete";

/**
 * Hook for channel management functionality
 * @param teamId Team ID
 * @returns Channel operations and data
 */
export function useChannels(teamId: string | undefined) {
  // Current user ID for filtering
  const { currentUser } = useAuthStore();

  // Then use it in useState
  const [isPreloadingUsers, setIsPreloadingUsers] = useState(false);

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
    if (!teamId || !currentUser || hasPreloadedUsers || isPreloadingUsers) {
      return;
    }

    const allDirectAndGroupChannels = [...directChannels, ...groupChannels];
    if (allDirectAndGroupChannels.length === 0) {
      setHasPreloadedUsers(true);
      return;
    }

    setIsPreloadingUsers(true);

    // Immediately collect user IDs to load
    const userIdsToLoad = preloadDirectChannelsInfo(
      allDirectAndGroupChannels,
      currentUser.id,
    );

    if (userIdsToLoad.length === 0) {
      setHasPreloadedUsers(true);
      setIsPreloadingUsers(false);
      return;
    }

    // Track which users we're attempting to load
    console.log(`[useChannels] Loading ${userIdsToLoad.length} users for direct channels`);
    setLoadingUsersBatch(userIdsToLoad, true);

    // Enhanced error handling for user loading
    useUsersQuery({
      userIds: userIdsToLoad,
      withStatuses: true,
    })
      .refetch()
      .then(users => {
        // Log success/failure status
        if (users && users.length > 0) {
          console.log(`[useChannels] Successfully loaded ${users.length}/${userIdsToLoad.length} users`);
          
          // Check for missing users
          if (users.length < userIdsToLoad.length) {
            const loadedIds = users.map(u => u.id);
            const missingIds = userIdsToLoad.filter(id => !loadedIds.includes(id));
            console.warn(`[useChannels] Failed to load some users: ${missingIds.join(', ')}`);
          }
        } else {
          console.warn(`[useChannels] Failed to load any users from the requested ${userIdsToLoad.length}`);
        }
      })
      .catch(error => {
        console.error('[useChannels] Error loading users:', error);
      })
      .finally(() => {
        // Always update channel info with any loaded user data
        allDirectAndGroupChannels.forEach((channel) => {
          refreshDirectChannelInfo(channel.id, currentUser.id);
        });

        // Mark as completed
        setLoadingUsersBatch(userIdsToLoad, false);
        setHasPreloadedUsers(true);
        setIsPreloadingUsers(false);
      });
  }, [
    teamId,
    currentUser,
    directChannels,
    groupChannels,
    hasPreloadedUsers,
    isPreloadingUsers,
  ]);

  // Reset preload status when team changes
  useEffect(() => {
    if (teamId) {
      setHasPreloadedUsers(false);
      setIsPreloadingUsers(false);
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
    if (isPreloadingUsers) {
      return channelsQuery.refetch();
    }

    setHasPreloadedUsers(false);
    setIsPreloadingUsers(false);

    return channelsQuery.refetch();
  }, [channelsQuery, isPreloadingUsers]);

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
      const { getDirectChannelInfo } = useDirectChannelStore.getState();
      const { getUserById } = useUserStore.getState();
      
      // Get basic info from direct channel store
      const channelInfo = getDirectChannelInfo(channelId);
      
      if (!channelInfo) {
        return null;
      }
      
      // Handle error states with user ID - attempt to recover user data
      if (channelInfo.otherUserId) {
        const otherUser = getUserById(channelInfo.otherUserId);
        
        if (otherUser) {
          // We have the user, so return improved info with properly formatted name
          return {
            ...channelInfo,
            displayName: userService.formatUserName(otherUser),
            userStatus: channelInfo.userStatus || 'offline',
            status: "complete"
          };
        }
        
        // If we're in error state, provide a better fallback name
        if (channelInfo.status === "error") {
          // Use a more user-friendly display name format
          return {
            ...channelInfo,
            displayName: `User-${channelInfo.otherUserId.substring(0, 6)}`,
          };
        }
      }
      
      // For group channels in error state, improve the display name
      if (channelInfo.isGroup && channelInfo.status === "error") {
        return {
          ...channelInfo,
          displayName: channelInfo.displayName || "Group Message",
        };
      }
      
      return channelInfo;
    },
    [],
  );

  // Calculate loading state, with safeguards against unnecessary renders
  const isLoading = useMemo(() => {
    // Consider loading if channel query is loading, store is loading, or user preloading is in progress
    return channelsQuery.isLoading || storeLoading || isPreloadingUsers;
  }, [channelsQuery.isLoading, storeLoading, isPreloadingUsers]);

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
