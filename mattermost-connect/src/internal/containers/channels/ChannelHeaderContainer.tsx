// src/internal/containers/channels/ChannelHeaderContainer.tsx
/**
 * Container for channel header
 * Handles minimized channel information and quick actions
 */
import React, { useCallback, useMemo } from "react";
import { useBaseContainer } from "../base/BaseContainer";
import { useChannel } from "../../../hooks";
import ChannelHeaderUI from "../../components/channels/ChannelHeaderUI";
import { Channel } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import { isChannelMuted } from "../../../core/store/userSettingsStore";
import { ChannelHeaderData } from "../../types/componentTypes";

export interface ChannelHeaderContainerProps {
  /** Channel ID */
  channelId?: string;
  /** Channel object (if already available) */
  channel?: Channel;
  /** Size variant */
  size?: "small" | "medium" | "large";
  /** Whether to show search button */
  showSearch?: boolean;
  /** Whether to show channel settings option */
  showSettings?: boolean;
  /** Whether to show leave channel option */
  showLeave?: boolean;
  /** Callback when action is performed */
  onAction?: (action: string, channel: Channel) => void;
  /** Callback when view members is clicked */
  onViewMembers?: () => void;
  /** Callback when info button is clicked */
  onInfo?: () => void;
  /** Callback when settings is clicked */
  onSettings?: () => void;
  /** Callback when search is clicked */
  onSearch?: () => void;
  /** CSS class name */
  className?: string;
  /** Material UI's sx prop for styling */
  sx?: any;
  /** ID for the component */
  id?: string;
}

/**
 * Container for channel header
 * Manages minimized channel information and quick actions
 */
const ChannelHeaderContainer: React.FC<ChannelHeaderContainerProps> = (
  props,
) => {
  const {
    channelId,
    channel: propChannel,
    size = "medium",
    showSearch = true,
    showSettings = true,
    showLeave = true,
    onAction,
    onViewMembers,
    onInfo,
    onSettings,
    onSearch,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();

  // Use channel hook for data and operations
  const {
    channel: fetchedChannel,
    members,
    toggleFavoriteStatus,
    toggleMutedStatus,
    leaveChannel,
    deleteChannel,
    isFavorite,
    isLoading,
  } = useChannel(channelId);

  const channel = propChannel || fetchedChannel;

  // Use base container for loading/error state
  const [baseState, baseAPI] = useBaseContainer({
    id,
    className,
    sx,
    initialLoading: isLoading,
  });

  // Handle toggle favorite
  const handleToggleFavorite = useCallback(async () => {
    if (!channel) return;

    try {
      await toggleFavoriteStatus();

      if (onAction) {
        onAction("favorite", channel);
      }
    } catch (error) {
      baseAPI.setError(error as Error);
    }
  }, [channel, toggleFavoriteStatus, onAction, baseAPI]);

  // Handle toggle mute
  const handleToggleMute = useCallback(async () => {
    if (!channel) return;

    try {
      await toggleMutedStatus();

      if (onAction) {
        onAction("mute", channel);
      }
    } catch (error) {
      baseAPI.setError(error as Error);
    }
  }, [channel, toggleMutedStatus, onAction, baseAPI]);

  // Handle view members
  const handleViewMembers = useCallback(() => {
    if (onViewMembers) {
      onViewMembers();
    } else if (onAction && channel) {
      onAction("view_members", channel);
    }
  }, [onViewMembers, onAction, channel]);

  // Handle info
  const handleInfo = useCallback(() => {
    if (onInfo) {
      onInfo();
    } else if (onAction && channel) {
      onAction("info", channel);
    }
  }, [onInfo, onAction, channel]);

  // Handle settings
  const handleSettings = useCallback(() => {
    if (onSettings) {
      onSettings();
    } else if (onAction && channel) {
      onAction("settings", channel);
    }
  }, [onSettings, onAction, channel]);

  // Handle search
  const handleSearch = useCallback(() => {
    if (onSearch) {
      onSearch();
    } else if (onAction && channel) {
      onAction("search", channel);
    }
  }, [onSearch, onAction, channel]);

  // Handle invite
  const handleInvite = useCallback(() => {
    if (!channel) return;

    if (onAction) {
      onAction("invite", channel);
    }
  }, [onAction, channel]);

  // Handle leave channel with confirmation
  const handleLeave = useCallback(async () => {
    if (!channel) return;

    try {
      const confirmed = await dialog.confirmAsync({
        title: "Leave Channel",
        message: `Are you sure you want to leave "${channel.display_name}"?`,
        confirmText: "Leave",
        isDestructive: true,
      });

      if (!confirmed) return;

      await leaveChannel();

      if (onAction) {
        onAction("leave", channel);
      }
    } catch (error) {
      baseAPI.setError(error as Error);
    }
  }, [channel, dialog, leaveChannel, onAction, baseAPI]);

  // Handle delete channel with confirmation
  const handleDelete = useCallback(async () => {
    if (!channel) return;

    try {
      const confirmed = await dialog.confirmAsync({
        title: "Delete Channel",
        message: `Are you sure you want to delete "${channel.display_name}"? This action cannot be undone.`,
        confirmText: "Delete",
        isDestructive: true,
      });

      if (!confirmed) return;

      await deleteChannel();

      if (onAction) {
        onAction("delete", channel);
      }
    } catch (error) {
      baseAPI.setError(error as Error);
    }
  }, [channel, dialog, deleteChannel, onAction, baseAPI]);

  // Create header data for UI
  const headerData: ChannelHeaderData = useMemo(() => {
    if (!channel) {
      return {
        channel: {} as Channel,
        isFavorite: false,
      };
    }

    return {
      channel,
      membersCount: members?.length,
      isFavorite,
      onToggleFavorite: handleToggleFavorite,
      onViewMembers: handleViewMembers,
      onSettings: handleSettings,
      onInfo: handleInfo,
    };
  }, [
    channel,
    members?.length,
    isFavorite,
    handleToggleFavorite,
    handleViewMembers,
    handleSettings,
    handleInfo,
  ]);

  // Prepare UI props
  const uiProps = {
    ...headerData,
    isMuted: channel ? isChannelMuted(channel.id) : false,
    hasSearch: showSearch,
    showSettings,
    showLeave,
    size,
    onToggleMute: handleToggleMute,
    onSearch: handleSearch,
    onInvite: handleInvite,
    onLeave: handleLeave,
    onDelete: handleDelete,
    className,
    sx,
    id,
  };

  if (!channel) {
    return null;
  }

  return <ChannelHeaderUI {...uiProps} />;
};

export default ChannelHeaderContainer;
