// src/internal/hooks/useContainerChannel.ts
/**
 * Hook for channel-related container operations
 * Provides standardized access to channel data and operations for containers
 */
import { useCallback, useMemo } from "react";
import {
  useChannel,
  useChannels,
  useDirectChannel,
  useDirectChannels,
  useDirectChannelUsers,
  useChannelUnreadCount,
} from "../../hooks";
import {
  Channel,
  ChannelMember,
  CreateChannelParams,
  UpdateChannelParams,
  DirectChannelInfo,
  UserWithStatus,
} from "../../types";
import {
  isDirectChannel,
  isGroupChannel,
  isPublicChannel,
  isPrivateChannel,
} from "../../utils/channelUtils";
import { useDialog } from "./useDialog";

/**
 * Formatted channel data for UI presentation
 */
export interface FormattedChannelData {
  /** Channel object */
  channel: Channel;
  /** Channel type display name */
  typeName: string;
  /** Channel type icon identifier */
  typeIcon: "public" | "private" | "direct" | "group";
  /** Whether the channel is a direct message */
  isDirect: boolean;
  /** Whether the channel is a group message */
  isGroup: boolean;
  /** Whether the channel is a regular channel */
  isRegular: boolean;
  /** Message count formatted */
  messageCount: string;
  /** Creation date formatted */
  createdDate: string;
  /** Channel purpose with fallback */
  purpose: string;
  /** Channel header with fallback */
  header: string;
  /** Channel members count */
  membersCount?: number;
  /** Is the channel muted */
  isMuted: boolean;
  /** Is the channel a favorite */
  isFavorite: boolean;
  /** Has unread messages */
  hasUnreads: boolean;
  /** Has mentions */
  hasMentions: boolean;
  /** Other user info for direct messages */
  otherUser?: UserWithStatus | null;
}

/**
 * Channel list filtering options
 */
export interface ChannelFilterOptions {
  /** Include public channels */
  includePublic?: boolean;
  /** Include private channels */
  includePrivate?: boolean;
  /** Include direct messages */
  includeDirect?: boolean;
  /** Include group messages */
  includeGroup?: boolean;
  /** Include only favorites */
  onlyFavorites?: boolean;
  /** Include only channels with unreads */
  onlyUnreads?: boolean;
  /** Include only channels with mentions */
  onlyMentions?: boolean;
  /** Include deleted channels */
  includeDeleted?: boolean;
}

/**
 * Hook for channel container functionality
 * Encapsulates common channel operations and data access patterns
 *
 * @param channelId - Optional channel ID for single channel operations
 * @returns Channel data and operations
 */
export function useContainerChannel(channelId?: string) {
  // Use dialog hook for confirmations
  const dialog = useDialog();

  // For channel lists
  const {
    channels,
    publicChannels,
    privateChannels,
    directChannels,
    groupChannels,
    favoriteChannels,
    isFavorite,
    isChannelMuted,
    hasUnreads,
    hasMentions,
    selectChannel,
    refreshChannels,
  } = useChannels();

  // For single channel
  const {
    channel,
    members,
    update: updateChannel,
    deleteChannel,
    toggleFavoriteStatus,
    toggleMutedStatus,
    joinChannel,
    leaveChannel,
    isLoading: isChannelLoading,
    isUpdating,
    isDeleting,
  } = useChannel(channelId);

  // For direct and group channels
  const { directInfo, otherUser, groupUsers, isDirect, isGroup } =
    useDirectChannel(channelId);
  const { userIds, usersWithStatus } = useDirectChannelUsers(channelId);

  // For unread counts
  const { unreadCount, formattedCount, markAsRead } =
    useChannelUnreadCount(channelId);

  // Format channel data for UI presentation
  const formatChannelData = useCallback(
    (channel: Channel): FormattedChannelData => {
      // Determine channel type
      const isDirect = isDirectChannel(channel);
      const isGroup = isGroupChannel(channel);
      const isRegular = !isDirect && !isGroup;

      // Channel type display info
      let typeName = "Channel";
      let typeIcon: "public" | "private" | "direct" | "group" = "public";

      if (isDirect) {
        typeName = "Direct Message";
        typeIcon = "direct";
      } else if (isGroup) {
        typeName = "Group Message";
        typeIcon = "group";
      } else if (isPublicChannel(channel)) {
        typeName = "Public Channel";
        typeIcon = "public";
      } else if (isPrivateChannel(channel)) {
        typeName = "Private Channel";
        typeIcon = "private";
      }

      // Format message count
      const messageCount = channel.total_msg_count
        ? `${channel.total_msg_count.toLocaleString()} messages`
        : "0 messages";

      // Format creation date
      const createdDate = new Date(channel.create_at).toLocaleDateString();

      // Check unread status
      const hasUnreadsStatus = channelId ? hasUnreads(channelId) : false;
      const hasMentionsStatus = channelId ? hasMentions(channelId) : false;

      // Favorite and muted status
      const isFavoriteStatus = channelId ? isFavorite(channelId) : false;
      const isMutedStatus = channelId ? isChannelMuted(channelId) : false;

      return {
        channel,
        typeName,
        typeIcon,
        isDirect,
        isGroup,
        isRegular,
        messageCount,
        createdDate,
        purpose: channel.purpose || "",
        header: channel.header || "",
        isMuted: isMutedStatus,
        isFavorite: isFavoriteStatus,
        hasUnreads: hasUnreadsStatus,
        hasMentions: hasMentionsStatus,
      };
    },
    [hasUnreads, hasMentions, isFavorite, isChannelMuted],
  );

  // Format channel data for the current channel
  const formattedChannel = useMemo(() => {
    if (!channel) return null;

    const formatted = formatChannelData(channel);

    // Add additional information available only for loaded channel
    if (members) {
      formatted.membersCount = members.length;
    }

    // Add direct message user if available
    if (formatted.isDirect && otherUser) {
      formatted.otherUser = otherUser;
    }

    return formatted;
  }, [channel, members, otherUser, formatChannelData]);

  // Filter channels based on provided options
  const filterChannels = useCallback(
    (options: ChannelFilterOptions = {}): Channel[] => {
      const {
        includePublic = true,
        includePrivate = true,
        includeDirect = true,
        includeGroup = true,
        onlyFavorites = false,
        onlyUnreads = false,
        onlyMentions = false,
        includeDeleted = false,
      } = options;

      // Start with all channels or just favorites
      let filteredChannels: Channel[] = [];

      if (onlyFavorites) {
        filteredChannels = [...favoriteChannels];
      } else {
        // Add channels by type based on options
        if (includePublic)
          filteredChannels = [...filteredChannels, ...publicChannels];
        if (includePrivate)
          filteredChannels = [...filteredChannels, ...privateChannels];
        if (includeDirect)
          filteredChannels = [...filteredChannels, ...directChannels];
        if (includeGroup)
          filteredChannels = [...filteredChannels, ...groupChannels];
      }

      // Filter by read status if requested
      if (onlyUnreads) {
        filteredChannels = filteredChannels.filter((ch) => hasUnreads(ch.id));
      }

      if (onlyMentions) {
        filteredChannels = filteredChannels.filter((ch) => hasMentions(ch.id));
      }

      // Filter deleted channels if not included
      if (!includeDeleted) {
        filteredChannels = filteredChannels.filter((ch) => !ch.delete_at);
      }

      return filteredChannels;
    },
    [
      favoriteChannels,
      publicChannels,
      privateChannels,
      directChannels,
      groupChannels,
      hasUnreads,
      hasMentions,
    ],
  );

  // Create a new channel with confirmation
  const createChannel = useCallback(
    async (channelData: CreateChannelParams): Promise<Channel | null> => {
      try {
        // Use the createChannel from the team hooks
        // This would be replaced with the actual channel creation API call
        const newChannel = {} as Channel; // Placeholder

        return newChannel;
      } catch (error) {
        throw error;
      }
    },
    [],
  );

  // Update a channel with confirmation
  const updateChannelWithConfirm = useCallback(
    async (updateData: UpdateChannelParams): Promise<Channel | null> => {
      if (!channel || !channelId) return null;

      try {
        const confirmed = await dialog.confirmAsync({
          title: "Update Channel",
          message: `Are you sure you want to update the channel "${channel.display_name}"?`,
          confirmText: "Update",
        });

        if (!confirmed) return null;

        return await updateChannel(updateData);
      } catch (error) {
        throw error;
      }
    },
    [channel, channelId, updateChannel, dialog],
  );

  // Delete a channel with confirmation
  const deleteChannelWithConfirm = useCallback(async (): Promise<boolean> => {
    if (!channel || !channelId) return false;

    try {
      const confirmed = await dialog.confirmAsync({
        title: "Delete Channel",
        message: `Are you sure you want to delete the channel "${channel.display_name}"? This action cannot be undone.`,
        confirmText: "Delete",
        isDestructive: true,
      });

      if (!confirmed) return false;

      await deleteChannel();
      return true;
    } catch (error) {
      throw error;
    }
  }, [channel, channelId, deleteChannel, dialog]);

  // Leave a channel with confirmation
  const leaveChannelWithConfirm = useCallback(async (): Promise<boolean> => {
    if (!channel || !channelId) return false;

    try {
      const confirmed = await dialog.confirmAsync({
        title: "Leave Channel",
        message: `Are you sure you want to leave the channel "${channel.display_name}"?`,
        confirmText: "Leave",
        isDestructive: true,
      });

      if (!confirmed) return false;

      await leaveChannel();
      return true;
    } catch (error) {
      throw error;
    }
  }, [channel, channelId, leaveChannel, dialog]);

  // Toggle favorite status with optimistic update
  const toggleFavorite = useCallback(async (): Promise<boolean> => {
    if (!channelId) return false;

    try {
      await toggleFavoriteStatus();
      return true;
    } catch (error) {
      throw error;
    }
  }, [channelId, toggleFavoriteStatus]);

  // Toggle muted status with optimistic update
  const toggleMuted = useCallback(async (): Promise<boolean> => {
    if (!channelId) return false;

    try {
      await toggleMutedStatus();
      return true;
    } catch (error) {
      throw error;
    }
  }, [channelId, toggleMutedStatus]);

  // Mark channel as read
  const markChannelAsRead = useCallback(async (): Promise<boolean> => {
    if (!channelId) return false;

    try {
      await markAsRead();
      return true;
    } catch (error) {
      throw error;
    }
  }, [channelId, markAsRead]);

  return {
    // Channel data
    channel,
    channels,
    publicChannels,
    privateChannels,
    directChannels,
    groupChannels,
    favoriteChannels,
    members,
    directInfo,
    otherUser,
    groupUsers,
    userIds,
    usersWithStatus,

    // Formatted data
    formattedChannel,

    // Status helpers
    isFavorite,
    isChannelMuted,
    hasUnreads,
    hasMentions,
    isDirect,
    isGroup,

    // Unread data
    unreadCount,
    formattedCount,

    // Loading states
    isLoading: isChannelLoading,
    isUpdating,
    isDeleting,

    // Actions
    selectChannel,
    updateChannel,
    deleteChannel,
    joinChannel,
    leaveChannel,
    toggleFavoriteStatus,
    toggleMutedStatus,
    markAsRead,

    // Enhanced actions with confirmation
    createChannel,
    updateChannelWithConfirm,
    deleteChannelWithConfirm,
    leaveChannelWithConfirm,
    toggleFavorite,
    toggleMuted,
    markChannelAsRead,

    // Utilities
    formatChannelData,
    filterChannels,
    refreshChannels,
  };
}

export default useContainerChannel;
