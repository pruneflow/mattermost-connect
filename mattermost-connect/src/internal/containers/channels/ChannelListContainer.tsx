// src/internal/containers/channels/ChannelListContainer.tsx
/**
 * Container for channel lists
 * Handles loading, filtering, grouping, and actions for channels
 */
import React, { useCallback, useEffect, useMemo } from "react";
import { useListContainer } from "../base/ListContainer";
import { useContainerChannel } from "../../hooks/useContainerChannel";
import { Channel, ChannelGroupType } from "../../../types";
import ChannelListUI from "../../components/channels/ChannelListUI";
import { useDialog } from "../../hooks/useDialog";
import { useUnreadCounts } from "../../../hooks";

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

  // Use channel container hook
  const {
    channels: fetchedChannels,
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
    toggleFavorite,
    toggleMuted,
    filterChannels,
  } = useContainerChannel();

  // Get unread counts
  const { unreadChannels, getUnreadCount, getFormattedUnreadCount } =
    useUnreadCounts(teamId);

  // Use list container hook
  const [listState, listAPI] = useListContainer({
    items: propChannels || fetchedChannels,
    idField: "id",
    displayField: "display_name",
    searchFields: ["display_name", "name", "header", "purpose"],
    emptyMessage: "No channels available",
    onItemSelect: (channel) => {
      selectChannel(channel);
      if (onSelectChannel) {
        onSelectChannel(channel);
      }
    },
  });

  // Filter channels based on props
  const filteredChannels = useMemo(() => {
    // Use provided channels or apply filters to fetched channels
    const baseChannels =
      propChannels ||
      filterChannels({
        includePublic: channelType === "all" || channelType === "public",
        includePrivate: channelType === "all" || channelType === "private",
        includeDirect: channelType === "all" || channelType === "direct",
        includeGroup: channelType === "all" || channelType === "group",
        onlyFavorites: channelType === "favorite",
        onlyUnreads: unreadOnly,
      });

    return baseChannels;
  }, [propChannels, filterChannels, channelType, unreadOnly]);

  // Map of unread counts by channel ID
  const unreadCountsMap = useMemo(() => {
    const map: Record<string, { msg_count: number; mention_count: number }> =
      {};

    filteredChannels.forEach((channel) => {
      const count = getUnreadCount(channel.id);
      if (count) {
        map[channel.id] = {
          msg_count: count.msg_count,
          mention_count: count.mention_count,
        };
      } else {
        map[channel.id] = { msg_count: 0, mention_count: 0 };
      }
    });

    return map;
  }, [filteredChannels, getUnreadCount]);

  // Set initial items in the list container
  useEffect(() => {
    listAPI.setItems(filteredChannels);
  }, [filteredChannels, listAPI]);

  // Handle channel actions
  const handleChannelAction = useCallback(
    (action: string, channel: Channel) => {
      if (action === "more" && onChannelAction) {
        onChannelAction(action, channel);
        return;
      }

      if (action === "favorite") {
        toggleFavorite();
        return;
      }

      if (action === "mute") {
        toggleMuted();
        return;
      }

      if (onChannelAction) {
        onChannelAction(action, channel);
      }
    },
    [onChannelAction, toggleFavorite, toggleMuted],
  );

  // Handle toggle favorite
  const handleToggleFavorite = useCallback(
    (channel: Channel) => {
      toggleFavorite();
    },
    [toggleFavorite],
  );

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

  // Prepare data needed for channel avatars
  const channelAvatars = useMemo(() => {
    const avatars: Record<string, any> = {};

    filteredChannels.forEach((channel) => {
      if (!channel) return;

      // For direct and group channels
      if (channel.type === "D" || channel.type === "G") {
        // This would normally be filled with data from directInfo
        avatars[channel.id] = {
          isLoading: false, // Set based on actual loading state
        };
      }
    });

    return avatars;
  }, [filteredChannels]);

  // Create favorite channels set
  const favoriteChannelsSet = useMemo(() => {
    const set = new Set<string>();
    if (favoriteChannels) {
      favoriteChannels.forEach((channel) => set.add(channel.id));
    }
    return set;
  }, [favoriteChannels]);

  // Create muted channels set
  const mutedChannelsSet = useMemo(() => {
    const set = new Set<string>();
    filteredChannels.forEach((channel) => {
      if (isChannelMuted(channel.id)) {
        set.add(channel.id);
      }
    });
    return set;
  }, [filteredChannels, isChannelMuted]);

  // Get display names for direct/group channels
  const displayNamesByChannel = useMemo(() => {
    const result: Record<string, string[]> = {};

    filteredChannels.forEach((channel) => {
      if (channel.type === "D" || channel.type === "G") {
        // This would be filled with actual display names
        result[channel.id] = [channel.display_name];
      }
    });

    return result;
  }, [filteredChannels]);

  const uiProps = {
    items: listState.items,
    activeId: listState.selectedIds[0],
    variant,
    density,
    isLoading: listState.isLoading,
    emptyMessage: listState.isEmpty
      ? "No channels found"
      : "No channels available",
    unreadCounts: unreadCountsMap,
    allowCreate,
    showSearch,
    searchTerm: listState.searchTerm,
    groupByType,
    showFavorites,
    displayNamesByChannel,
    favoriteChannels: favoriteChannelsSet,
    mutedChannels: mutedChannelsSet,
    channelAvatars,
    onItemClick: listAPI.selectItem,
    onCreateChannel: handleCreateChannel,
    onChannelAction: handleChannelAction,
    onToggleFavorite: handleToggleFavorite,
    onSearchChange: handleSearch,
    className,
    sx,
    id,
  };

  return <ChannelListUI {...uiProps} />;
};

export default ChannelListContainer;
