// src/internal/containers/channels/ChannelListContainer.tsx
/**
 * Container component for channel list that manages data fetching and state
 */
import React, { useCallback, useState, useMemo, useEffect } from "react";
import { useChannels } from "../../../hooks/useChannels";
import { BaseComponentProps } from "../../types/componentTypes";
import ChannelListUI from "../../components/channels/ChannelListUI";
import { Channel } from "../../../index";
import { useChannelCreation } from "../../../hooks/useChannels";
import { DisplayVariant, DensityVariant } from "../../types/componentTypes";
import { useAuthStore } from "../../../core/store/authStore";
import { useDirectChannels } from "../../../hooks/useDirectChannels";
import { useDirectChannelUsers } from "../../../hooks/useDirectChannelUsers";
import {
  useUnreadCounts,
  useUnreadCountsListener,
  useTeamUnreadCount,
} from "../../../hooks/useUnreadCounts";
import { useWebSocket } from "../../../hooks/useWebSocket";
import {
  isDirectChannel,
  isGroupChannel,
} from "../../../utils/directChannelUtils";

export interface ChannelListContainerProps extends BaseComponentProps {
  /** Team ID for the channels */
  teamId: string;
  /** How to display the channels */
  variant?: DisplayVariant;
  /** Density of items */
  density?: DensityVariant;
  /** Whether to allow creating new channels */
  allowCreate?: boolean;
  /** Whether to show a search input */
  showSearch?: boolean;
  /** Whether to group channels by type */
  groupByType?: boolean;
  /** Whether to show favorite channels separately */
  showFavorites?: boolean;
  /** Custom empty message */
  emptyMessage?: string;
  /** Callback when a channel is selected */
  onChannelSelect?: (channel: Channel) => void;
  /** Callback when create channel is successful */
  onCreateSuccess?: (channel: Channel) => void;
}

const ChannelListContainer: React.FC<ChannelListContainerProps> = ({
  teamId,
  variant = "list",
  density = "comfortable",
  allowCreate = false,
  showSearch = false,
  groupByType = true,
  showFavorites = true,
  emptyMessage,
  onChannelSelect,
  onCreateSuccess,
  className,
  sx,
  id,
}) => {
  // State for search
  const [searchTerm, setSearchTerm] = useState("");

  // State for unread counts to trigger UI updates
  const [channelUnreadCounts, setChannelUnreadCounts] = useState<
    Record<string, { msg_count: number; mention_count: number }>
  >({});

  // Get channels data from hook
  const {
    channels,
    directChannels,
    groupChannels,
    favoriteChannels,
    activeChannel,
    isLoading: isLoadingChannels,
    setActiveChannel,
    unreadCounts,
    mutedChannels,
    favoriteChannelSet,
    refreshChannels,
  } = useChannels(teamId);

  // Team unread count hook for efficient team-level access
  const { unreadCount: teamUnreads } = useTeamUnreadCount(teamId);

  // Get core unread counts functionality
  const {
    markChannelAsRead,
    toggleChannelMuted,
    hasUnreadsInChannel,
    hasMentionsInChannel,
    isChannelMuted,
  } = useUnreadCounts();

  // Get current user
  const { currentUser } = useAuthStore();

  // Get direct channel utilities
  const { getChannelsInfo, getDirectMessageDisplayNames } = useDirectChannels();

  // Use our direct channel users hook to ensure users are loaded
  const { isLoadingUsers, userIdsCount, loadedCount } = useDirectChannelUsers([
    ...directChannels,
    ...groupChannels,
  ]);

  // Monitor WebSocket connection
  const { isConnected, connectionStatus } = useWebSocket();

  // Channel creation mutation
  const { createChannel, isCreating } = useChannelCreation();

  // Listen for unread count updates
  useUnreadCountsListener(() => {
    // Just force a refresh of unread counts when changes occur
    setChannelUnreadCounts({ ...unreadCounts });
  });

  // If WebSocket reconnects after disconnection, refresh data
  useEffect(() => {
    if (isConnected && connectionStatus.hasDisconnected) {
      // Refresh channels to get updated data
      refreshChannels();

      // Force UI to update with latest unread counts
      setChannelUnreadCounts({ ...unreadCounts });
    }
  }, [isConnected, connectionStatus, refreshChannels, unreadCounts]);

  // Update channelUnreadCounts state when unreadCounts changes
  useEffect(() => {
    setChannelUnreadCounts({ ...unreadCounts });
  }, [unreadCounts]);

  // Get channel info for all direct/group channels
  const channelsInfo = useMemo(() => {
    return getChannelsInfo([...directChannels, ...groupChannels]);
  }, [directChannels, groupChannels, getChannelsInfo, loadedCount]);

  // Get display names for direct and group messages
  const displayNamesByChannel = useMemo(() => {
    return getDirectMessageDisplayNames([...directChannels, ...groupChannels]);
  }, [
    directChannels,
    groupChannels,
    getDirectMessageDisplayNames,
    loadedCount,
  ]);

  // Prepare channel avatars data
  const channelAvatars = useMemo(() => {
    const avatars: Record<
      string,
      {
        userImageUrl?: string;
        userStatus?: "online" | "away" | "dnd" | "offline";
        groupAvatarUrls?: string[];
        isLoading?: boolean;
      }
    > = {};

    // Add data for direct and group channels
    Object.entries(channelsInfo).forEach(([channelId, info]) => {
      avatars[channelId] = {
        userImageUrl: info.userImageUrl,
        userStatus: info.userStatus,
        groupAvatarUrls: info.groupAvatarUrls,
        isLoading: info.status === "loading",
      };
    });

    return avatars;
  }, [channelsInfo]);

  // Filter channels based on search term
  const filteredChannels = useMemo(() => {
    if (!searchTerm) return channels;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return channels.filter((channel) => {
      // For direct channels, search in the display name we've generated
      if (isDirectChannel(channel) || isGroupChannel(channel)) {
        const channelDisplayNames = displayNamesByChannel[channel.id];
        if (channelDisplayNames && channelDisplayNames.length > 0) {
          return channelDisplayNames.some((name) =>
            name.toLowerCase().includes(lowerSearchTerm),
          );
        }
      }

      // For regular channels, search in the standard fields
      return (
        channel.display_name.toLowerCase().includes(lowerSearchTerm) ||
        channel.name.toLowerCase().includes(lowerSearchTerm) ||
        (channel.purpose &&
          channel.purpose.toLowerCase().includes(lowerSearchTerm))
      );
    });
  }, [channels, searchTerm, displayNamesByChannel]);

  // Handle channel selection
  const handleChannelSelect = useCallback(
    (channel: Channel) => {
      setActiveChannel(channel);

      // Mark channel as read when selected
      markChannelAsRead(channel.id);

      if (onChannelSelect) {
        onChannelSelect(channel);
      }
    },
    [setActiveChannel, markChannelAsRead, onChannelSelect],
  );

  // Handle channel action
  const handleChannelAction = useCallback(
    (action: string, channel: Channel) => {
      switch (action) {
        case "mute":
          toggleChannelMuted(channel.id, true);
          break;
        case "unmute":
          toggleChannelMuted(channel.id, false);
          break;
        case "markAsRead":
          markChannelAsRead(channel.id);
          break;
        default:
          // Other actions handled by parent component
          console.log("Channel action:", action, channel);
      }
    },
    [toggleChannelMuted, markChannelAsRead],
  );

  // Handle toggle favorite
  const handleToggleFavorite = useCallback((channel: Channel) => {
    // This would typically call an API to toggle favorite status
    console.log("Toggle favorite for channel:", channel.id);
  }, []);

  // Handle search term change
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // Handle create channel (placeholder - would typically open a dialog)
  const handleCreateChannel = useCallback(() => {
    // Example implementation - would typically open a dialog
    // then call createChannel with form data
    console.log("Open create channel dialog");
  }, []);

  // Determine if we're in a loading state
  const isLoading =
    isLoadingChannels || isCreating || (isLoadingUsers && userIdsCount > 0);

  // Create helper functions to check channel state
  const channelHasUnreads = useCallback(
    (channelId: string) => hasUnreadsInChannel(channelId),
    [hasUnreadsInChannel],
  );

  const channelHasMentions = useCallback(
    (channelId: string) => hasMentionsInChannel(channelId),
    [hasMentionsInChannel],
  );

  const channelIsMuted = useCallback(
    (channelId: string) => isChannelMuted(channelId),
    [isChannelMuted],
  );

  // Build props for the UI component
  const uiProps = useMemo(() => {
    return {
      items: filteredChannels,
      activeId: activeChannel?.id,
      variant: variant as "list" | "grid" | "sidebar" | "tabs",
      density: density as "compact" | "comfortable" | "spacious",
      isLoading,
      emptyMessage,
      unreadCounts: channelUnreadCounts, // Use state variable for UI updates
      allowCreate,
      showSearch,
      searchTerm,
      groupByType,
      showFavorites,
      displayNamesByChannel,
      favoriteChannels: favoriteChannelSet,
      mutedChannels,
      channelAvatars,
      totalUnreads: teamUnreads,
      onItemClick: handleChannelSelect,
      onCreateChannel: handleCreateChannel,
      onChannelAction: handleChannelAction,
      onToggleFavorite: handleToggleFavorite,
      onSearchChange: handleSearch,
      isLoadingUsers: isLoadingUsers && userIdsCount > 0,
      loadingUserIds: userIdsCount,
      hasUnreads: channelHasUnreads,
      hasMentions: channelHasMentions,
      isMuted: channelIsMuted,
      className,
      sx,
      id,
    };
  }, [
    filteredChannels,
    activeChannel?.id,
    variant,
    density,
    isLoading,
    emptyMessage,
    channelUnreadCounts,
    allowCreate,
    showSearch,
    searchTerm,
    groupByType,
    showFavorites,
    displayNamesByChannel,
    favoriteChannelSet,
    mutedChannels,
    channelAvatars,
    teamUnreads,
    handleChannelSelect,
    handleCreateChannel,
    handleChannelAction,
    handleToggleFavorite,
    handleSearch,
    isLoadingUsers,
    userIdsCount,
    channelHasUnreads,
    channelHasMentions,
    channelIsMuted,
    className,
    sx,
    id,
  ]);

  return <ChannelListUI {...uiProps} />;
};

export default React.memo(ChannelListContainer);
