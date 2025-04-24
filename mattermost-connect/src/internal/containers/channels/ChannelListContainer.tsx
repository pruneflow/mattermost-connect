// src/internal/containers/channels/ChannelListContainer.tsx
/**
 * Container component for channel list that manages data fetching and state
 */
import React, { useCallback, useState, useMemo } from "react";
import { useChannels } from "../../../hooks/useChannels";
import { BaseComponentProps } from "../../types/componentTypes";
import ChannelListUI from "../../components/channels/ChannelListUI";
import { Channel, ChannelGroupType } from "../../../index";
import { useChannelCreation } from "../../../hooks/useChannels";
import { DisplayVariant, DensityVariant } from "../../types/componentTypes";
import { useUserStore } from "../../../core/store/userStore";

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
    publicChannels,
    privateChannels,
    directChannels,
    groupChannels,
    favoriteChannels,
    activeChannel,
    isLoading,
    error,
    setActiveChannel,
    refreshChannels,
  } = useChannels(teamId);

  // Get user store for display names in direct messages
  const { getUserDisplayName } = useUserStore();

  // Channel creation mutation
  const { createChannel, isCreating } = useChannelCreation();

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

  // Get display names for direct messages
  const displayNamesByChannel = useMemo(() => {
    const displayNames: Record<string, string[]> = {};

    [...directChannels, ...groupChannels].forEach((channel) => {
      // This is simplified. In a real implementation, this would parse
      // the channel.name to get user IDs for direct messages,
      // or fetch members for group messages.
      displayNames[channel.id] = [channel.display_name];
    });

    return displayNames;
  }, [directChannels, groupChannels, getUserDisplayName]);

  // Filter channels based on search term
  const filteredChannels = useMemo(() => {
    if (!searchTerm) return channels;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return channels.filter(
      (channel) =>
        channel.display_name.toLowerCase().includes(lowerSearchTerm) ||
        channel.name.toLowerCase().includes(lowerSearchTerm) ||
        (channel.purpose &&
          channel.purpose.toLowerCase().includes(lowerSearchTerm)),
    );
  }, [channels, searchTerm]);

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

  return (
    <ChannelListUI
      items={filteredChannels}
      activeId={activeChannel?.id}
      variant={variant as "list" | "grid" | "sidebar" | "tabs"}
      density={density as "compact" | "comfortable" | "spacious"}
      isLoading={isLoading || isCreating}
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
      onItemClick={handleChannelSelect}
      onCreateChannel={handleCreateChannel}
      onChannelAction={handleChannelAction}
      onToggleFavorite={handleToggleFavorite}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default ChannelListContainer;
