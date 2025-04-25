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
  } = useChannels(teamId);

  // Get current user
  const { currentUser } = useAuthStore();

  // Get direct channel utilities
  const { getChannelsInfo, getDirectMessageDisplayNames } = useDirectChannels();

  // Use our direct channel users hook to ensure users are loaded
  const { isLoadingUsers, userIdsCount, loadedCount, stillMissingCount } =
    useDirectChannelUsers([...directChannels, ...groupChannels]);

  // Channel creation mutation
  const { createChannel, isCreating } = useChannelCreation();

  // Get channel info for all channels
  const channelsInfo = useMemo(() => {
    return getChannelsInfo([...directChannels, ...groupChannels]);
  }, [directChannels, groupChannels, getChannelsInfo, loadedCount]);

  // Collect unread counts (simplified - would need to get from channel store)
  const unreadCounts = useMemo(() => {
    // This is a placeholder. In a real implementation, this would
    // get actual unread counts from the channel store.
    const counts: Record<
      string,
      { messageCount: number; mentionCount: number }
    > = {};

    channels.forEach((channel) => {
      counts[channel.id] = {
        messageCount: 0, // Replace with actual unread counts
        mentionCount: 0, // Replace with actual mention counts
      };
    });

    return counts;
  }, [channels]);

  // Collect favorite channels
  const favoriteChannelSet = useMemo(() => {
    const favoriteSet = new Set<string>();

    favoriteChannels.forEach((channel) => {
      favoriteSet.add(channel.id);
    });

    return favoriteSet;
  }, [favoriteChannels]);

  // Collect muted channels (simplified - would need to get from preferences)
  const mutedChannelSet = useMemo(() => {
    // This is a placeholder. In a real implementation, this would
    // get actual muted channels from preferences.
    return new Set<string>();
  }, []);

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

      if (onChannelSelect) {
        onChannelSelect(channel);
      }
    },
    [setActiveChannel, onChannelSelect],
  );

  // Handle channel action
  const handleChannelAction = useCallback(
    (action: string, channel: Channel) => {
      // Actions can be implemented as needed
      console.log("Channel action:", action, channel);
    },
    [],
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

  // Log loading status for debugging
  useEffect(() => {
    if (directChannels.length > 0 || groupChannels.length > 0) {
      console.log(
        `Direct channel users: ${loadedCount} loaded, ${stillMissingCount} still loading`,
      );
    }
  }, [
    directChannels.length,
    groupChannels.length,
    loadedCount,
    stillMissingCount,
  ]);

  return (
    <ChannelListUI
      items={filteredChannels}
      activeId={activeChannel?.id}
      variant={variant as "list" | "grid" | "sidebar" | "tabs"}
      density={density as "compact" | "comfortable" | "spacious"}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      unreadCounts={unreadCounts}
      allowCreate={allowCreate}
      showSearch={showSearch}
      searchTerm={searchTerm}
      groupByType={groupByType}
      showFavorites={showFavorites}
      displayNamesByChannel={displayNamesByChannel}
      favoriteChannels={favoriteChannelSet}
      mutedChannels={mutedChannelSet}
      channelAvatars={channelAvatars} // Pass avatars data to UI
      onItemClick={handleChannelSelect}
      onCreateChannel={handleCreateChannel}
      onChannelAction={handleChannelAction}
      onToggleFavorite={handleToggleFavorite}
      onSearchChange={handleSearch}
      className={className}
      sx={sx}
      id={id}
      isLoadingUsers={isLoadingUsers && userIdsCount > 0}
      loadingUserIds={userIdsCount}
    />
  );
};

export default ChannelListContainer;
