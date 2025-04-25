// src/internal/containers/channels/ChannelListContainer.tsx
/**
 * Container component for channel list that manages data fetching and state
 */
import React, { useCallback, useState, useMemo, useEffect } from "react";
import { useChannels } from "../../../hooks/useChannels";
import { BaseComponentProps } from "../../types/componentTypes";
import ChannelListUI from "../../components/channels/ChannelListUI";
import { Channel, ChannelGroupType } from "../../../index";
import { useChannelCreation } from "../../../hooks/useChannels";
import { DisplayVariant, DensityVariant } from "../../types/componentTypes";
import { useAuthStore } from "../../../core/store/authStore";
import { useDirectChannels } from "../../../hooks/useDirectChannels";
import { useDirectChannelUsers } from "../../../hooks/useDirectChannelUsers";
import { useUnreadCounts } from "../../../hooks/useUnreadCounts";
import { useUnreadWebSocketEvents } from "../../../hooks/useWebSocket";
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
    markChannelAsRead,
    toggleChannelMuted,
  } = useChannels(teamId);

  // Get current user
  const { currentUser } = useAuthStore();

  // Get direct channel utilities
  const { getChannelsInfo, getDirectMessageDisplayNames } = useDirectChannels();

  // Use our direct channel users hook to ensure users are loaded
  const { isLoadingUsers, userIdsCount, loadedCount, stillMissingCount } =
    useDirectChannelUsers([...directChannels, ...groupChannels]);

  // Use unread counts hook
  const {
    getAllUnreadCounts,
    hasUnreadsInChannel,
    hasMentionsInChannel,
    isChannelMuted: checkChannelMuted,
  } = useUnreadCounts();

  // Register WebSocket handlers for unread counts
  useUnreadWebSocketEvents();

  // Channel creation mutation
  const { createChannel, isCreating } = useChannelCreation();

  // Get channel info for all channels
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

  // Total unread counts for the team
  const totalUnreads = useMemo(() => {
    return getAllUnreadCounts();
  }, [getAllUnreadCounts]);

  // Build props for the UI component
  const uiProps = useMemo(() => {
    return {
      items: filteredChannels,
      activeId: activeChannel?.id,
      variant: variant as "list" | "grid" | "sidebar" | "tabs",
      density: density as "compact" | "comfortable" | "spacious",
      isLoading,
      emptyMessage,
      unreadCounts,
      allowCreate,
      showSearch,
      searchTerm,
      groupByType,
      showFavorites,
      displayNamesByChannel,
      favoriteChannels: favoriteChannelSet,
      mutedChannels,
      channelAvatars,
      totalUnreads,
      onItemClick: handleChannelSelect,
      onCreateChannel: handleCreateChannel,
      onChannelAction: handleChannelAction,
      onToggleFavorite: handleToggleFavorite,
      onSearchChange: handleSearch,
      isLoadingUsers: isLoadingUsers && userIdsCount > 0,
      loadingUserIds: userIdsCount,
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
    unreadCounts,
    allowCreate,
    showSearch,
    searchTerm,
    groupByType,
    showFavorites,
    displayNamesByChannel,
    favoriteChannelSet,
    mutedChannels,
    channelAvatars,
    totalUnreads,
    handleChannelSelect,
    handleCreateChannel,
    handleChannelAction,
    handleToggleFavorite,
    handleSearch,
    isLoadingUsers,
    userIdsCount,
    className,
    sx,
    id,
  ]);

  return <ChannelListUI {...uiProps} />;
};

export default React.memo(ChannelListContainer);
