// src/internal/containers/channels/ChannelListContainer.tsx
/**
 * Container for channel lists
 * Handles loading, filtering, grouping, and actions for channels
 */
import React, { useCallback, useEffect, useMemo } from "react";
import { useListContainer } from "../base/ListContainer";
import { useChannels, useTeamUnreadCount } from "../../../hooks";
import { Channel, ChannelGroupType } from "../../../types";
import ChannelListUI from "../../components/channels/ChannelListUI";
import { useDialog } from "../../hooks/useDialog";

export interface ChannelListContainerProps {
  /** Team ID to filter channels */
  teamId?: string;
  /** Channels to display (if not using teamId) */
  channels?: Channel[];
  /** Display variant */
  variant?: "list" | "grid" | "sidebar" | "tabs";
  /** Density of the list */
  density?: "compact" | "comfortable" | "spacious";
  /** Channel type to display */
  channelType?: ChannelGroupType | "all";
  /** Whether to show search input */
  showSearch?: boolean;
  /** Whether to show filtering options */
  showFilters?: boolean;
  /** Whether to group channels by type */
  groupByType?: boolean;
  /** Whether to show a separate favorites section */
  showFavorites?: boolean;
  /** Whether to allow creating new channels */
  allowCreate?: boolean;
  /** Whether to show unread channels only */
  unreadOnly?: boolean;
  /** Callback when a channel is selected */
  onSelectChannel?: (channel: Channel) => void;
  /** Callback when a channel action is performed */
  onChannelAction?: (action: string, channel: Channel) => void;
  /** Callback when channel creation is requested */
  onCreateChannel?: () => void;
  /** CSS class name */
  className?: string;
  /** Material UI's sx prop for styling */
  sx?: any;
  /** ID for the component */
  id?: string;
}

/**
 * Container for displaying and managing channel lists
 * Supports different view variants, filtering, and actions
 */
const ChannelListContainer: React.FC<ChannelListContainerProps> = (props) => {
  const {
    teamId,
    channels: propChannels,
    variant = "list",
    density = "comfortable",
    channelType = "all",
    showSearch = true,
    showFilters = false,
    groupByType = true,
    showFavorites = true,
    allowCreate = false,
    unreadOnly = false,
    onSelectChannel,
    onChannelAction,
    onCreateChannel,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();

  // Use channels hook for channel data - now with preloading status
  const {
    channels: fetchedChannels,
    publicChannels,
    privateChannels,
    directChannels,
    groupChannels,
    favoriteChannels,
    selectChannel,
    hasUnreads,
    hasMentions,
    isLoading: channelsLoading,
    hasPreloadedUsers,
    refreshChannels,
  } = useChannels(teamId);

  // Filter channels based on props
  const filteredChannels = useMemo(() => {
    let channels = propChannels || fetchedChannels;

    if (!channels.length) return [];

    // Filter by channel type if specified
    if (channelType !== "all") {
      if (channelType === "public") {
        channels = publicChannels;
      } else if (channelType === "private") {
        channels = privateChannels;
      } else if (channelType === "direct") {
        channels = directChannels;
      } else if (channelType === "group") {
        channels = groupChannels;
      } else if (channelType === "favorite") {
        channels = favoriteChannels;
      }
    }

    // Filter by unread status if requested
    if (unreadOnly) {
      channels = channels.filter((channel) => hasUnreads(channel.id));
    }

    return channels;
  }, [
    propChannels,
    fetchedChannels,
    channelType,
    unreadOnly,
    publicChannels,
    privateChannels,
    directChannels,
    groupChannels,
    favoriteChannels,
    hasUnreads,
  ]);

  // Use ListContainer base for list management
  const [listState, listAPI] = useListContainer({
    items: filteredChannels,
    idField: "id",
    displayField: "display_name",
    searchFields: ["display_name", "name", "header", "purpose"],
    emptyMessage: "No channels available",
    initialLoading: channelsLoading && !hasPreloadedUsers,
    onItemSelect: (channel) => {
      selectChannel(channel);
      if (onSelectChannel) {
        onSelectChannel(channel);
      }
    },
  });

  // Effect to force refresh if needed
  useEffect(() => {
    if (teamId && directChannels.length > 0 && !hasPreloadedUsers) {
      refreshChannels();
    }
  }, [teamId, directChannels.length, hasPreloadedUsers, refreshChannels]);

  // Update list items when filtered channels change
  useEffect(() => {
    listAPI.setItems(filteredChannels);
  }, [filteredChannels, listAPI]);

  // Handle search
  const handleSearch = useCallback(
    (term: string) => {
      listAPI.setSearchTerm(term);
    },
    [listAPI],
  );

  // Handle create channel request
  const handleCreateChannel = useCallback(() => {
    if (onCreateChannel) {
      onCreateChannel();
    }
  }, [onCreateChannel]);

  // Handle channel action (delegated from ChannelItemContainer)
  const handleChannelAction = useCallback(
    (action: string, channel: Channel) => {
      if (onChannelAction) {
        onChannelAction(action, channel);
      }
    },
    [onChannelAction],
  );

  // Handle channel selection
  const handleChannelClick = useCallback(
    (channel: Channel) => {
      listAPI.selectItem(channel);
    },
    [listAPI],
  );

  // Determine if the list is actually loading
  const isActuallyLoading = useMemo(() => {
    // For direct channels, we need special handling
    if (
      channelType === "direct" ||
      channelType === "group" ||
      channelType === "all"
    ) {
      // If we have channels but haven't preloaded users, we're still effectively loading
      if (directChannels.length > 0 && !hasPreloadedUsers) {
        return true;
      }
    }

    return listState.items.length > 0 ? false : listState.isLoading;
  }, [
    channelType,
    directChannels.length,
    hasPreloadedUsers,
    listState.items.length,
    listState.isLoading,
  ]);

  // Prepare UI props
  const uiProps = {
    items: listState.items,
    activeId: listState.selectedIds[0],
    variant,
    density,
    isLoading: isActuallyLoading,
    emptyMessage: listState.isEmpty
      ? "No channels match your criteria"
      : "No channels available",
    allowCreate,
    showSearch,
    searchTerm: listState.searchTerm,
    groupByType,
    showFavorites,
    onItemClick: handleChannelClick,
    onCreateChannel: handleCreateChannel,
    onChannelAction: handleChannelAction,
    onSearchChange: handleSearch,
    className,
    sx,
    id,
  };

  return <ChannelListUI {...uiProps} />;
};

export default ChannelListContainer;
