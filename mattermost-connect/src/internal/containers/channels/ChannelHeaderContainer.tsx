// src/internal/containers/channels/ChannelHeaderContainer.tsx
/**
 * Container for channel header
 * Handles minimized channel information and quick actions
 */
import React, { useCallback, useMemo } from "react";
import { useContainerChannel } from "../../hooks/useContainerChannel";
import { useBaseContainer } from "../base/BaseContainer";
import ChannelHeaderUI from "../../components/channels/ChannelHeaderUI";
import { Channel, ChannelHeaderData } from "../../../types";
import { useDialog } from "../../hooks/useDialog";

export interface ChannelHeaderContainerProps {
  /** Channel ID */
  channelId: string;
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

  // Use channel container hook
  const {
    channel: fetchedChannel,
    members,
    formattedChannel,
    toggleFavorite,
    toggleMuted,
    leaveChannelWithConfirm,
    deleteChannelWithConfirm,
    isFavorite,
    isChannelMuted,
  } = useContainerChannel(channelId);

  const channel = propChannel || fetchedChannel;

  // Use base container for loading/error state
  const [baseState, baseAPI] = useBaseContainer({
    id,
    className,
    sx,
  });

  // Handle toggle favorite
  const handleToggleFavorite = useCallback(async () => {
    if (!channel) return;

    try {
      await toggleFavorite();

      if (onAction) {
        onAction("favorite", channel);
      }
    } catch (error) {
      baseAPI.setError(error as Error);
    }
  }, [channel, toggleFavorite, onAction, baseAPI]);

  // Handle toggle mute
  const handleToggleMute = useCallback(async () => {
    if (!channel) return;

    try {
      await toggleMuted();

      if (onAction) {
        onAction("mute", channel);
      }
    } catch (error) {
      baseAPI.setError(error as Error);
    }
  }, [channel, toggleMuted, onAction, baseAPI]);

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

  // Handle leave channel
  const handleLeave = useCallback(async () => {
    if (!channel) return;

    try {
      const success = await leaveChannelWithConfirm();

      if (success && onAction) {
        onAction("leave", channel);
      }
    } catch (error) {
      baseAPI.setError(error as Error);
    }
  }, [channel, leaveChannelWithConfirm, onAction, baseAPI]);

  // Handle delete channel
  const handleDelete = useCallback(async () => {
    if (!channel) return;

    try {
      const success = await deleteChannelWithConfirm();

      if (success && onAction) {
        onAction("delete", channel);
      }
    } catch (error) {
      baseAPI.setError(error as Error);
    }
  }, [channel, deleteChannelWithConfirm, onAction, baseAPI]);

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
      isFavorite: isFavorite(channel.id),
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
