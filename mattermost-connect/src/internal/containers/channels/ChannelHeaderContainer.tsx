// src/internal/containers/channels/ChannelHeaderContainer.tsx
/**
 * Container component for channel header that manages state and actions
 */
import React, { useCallback, useState } from "react";
import { useChannel } from "../../../hooks/useChannels";
import { BaseComponentProps } from "../../types/componentTypes";
import ChannelHeaderUI from "../../components/channels/ChannelHeaderUI";
import { ConfirmDialog } from "../../components/common";

export interface ChannelHeaderContainerProps extends BaseComponentProps {
  /** Channel ID */
  channelId: string;
  /** Size variant */
  size?: "small" | "medium" | "large";
  /** Whether to show search option */
  showSearch?: boolean;
  /** Whether to show settings option */
  showSettings?: boolean;
  /** Whether to show leave option */
  showLeave?: boolean;
  /** Callback when search is clicked */
  onSearch?: () => void;
  /** Callback when channel is deleted */
  onDelete?: () => void;
  /** Callback when channel is left */
  onLeave?: () => void;
  /** Callback when view members is clicked */
  onViewMembers?: () => void;
}

const ChannelHeaderContainer: React.FC<ChannelHeaderContainerProps> = ({
  channelId,
  size = "medium",
  showSearch = true,
  showSettings = true,
  showLeave = true,
  onSearch,
  onDelete,
  onLeave,
  onViewMembers,
  className,
  sx,
  id,
}) => {
  // State for dialogs
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [muteDialogOpen, setMuteDialogOpen] = useState(false);

  // Get channel data from hook
  const {
    channel,
    members,
    isLoading,
    error,
    addToFavorites,
    removeFromFavorites,
    updateChannel,
    deleteChannel,
    leaveChannel,
    viewChannel,
  } = useChannel(channelId);

  // Determine favorite status (placeholder - would come from preferences)
  const isFavorite = channel?.is_favorite || false;

  // Determine mute status (placeholder - would come from preferences)
  const isMuted = false;

  // Get member count from members data
  const membersCount = members?.length || 0;

  // Handle toggle favorite
  const handleToggleFavorite = useCallback(async () => {
    if (!channel) return;

    try {
      if (isFavorite) {
        await removeFromFavorites();
      } else {
        await addToFavorites();
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  }, [channel, isFavorite, addToFavorites, removeFromFavorites]);

  // Handle toggle mute
  const handleToggleMute = useCallback(() => {
    // This would typically interact with preferences
    setMuteDialogOpen(false);
    console.log("Toggle mute for channel:", channelId);
  }, [channelId]);

  // Handle settings
  const handleSettings = useCallback(() => {
    // This would typically open a settings dialog or navigate to settings
    console.log("Channel settings for:", channelId);
  }, [channelId]);

  // Handle info
  const handleInfo = useCallback(() => {
    // This would typically open an info dialog or navigate to info page
    console.log("Channel info for:", channelId);
  }, [channelId]);

  // Handle view members
  const handleViewMembers = useCallback(() => {
    if (onViewMembers) {
      onViewMembers();
    } else {
      // Fallback behavior
      console.log("View members for channel:", channelId);
    }
  }, [channelId, onViewMembers]);

  // Handle invite
  const handleInvite = useCallback(() => {
    // This would typically open an invite dialog
    console.log("Invite to channel:", channelId);
  }, [channelId]);

  // Handle leave confirm
  const handleLeaveConfirm = useCallback(async () => {
    setLeaveDialogOpen(false);

    try {
      await leaveChannel();

      if (onLeave) {
        onLeave();
      }
    } catch (error) {
      console.error("Error leaving channel:", error);
    }
  }, [channelId, leaveChannel, onLeave]);

  // Handle delete confirm
  const handleDeleteConfirm = useCallback(async () => {
    setDeleteDialogOpen(false);

    try {
      await deleteChannel();

      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error("Error deleting channel:", error);
    }
  }, [channelId, deleteChannel, onDelete]);

  // Handle search
  const handleSearch = useCallback(() => {
    if (onSearch) {
      onSearch();
    } else {
      // Fallback behavior
      console.log("Search in channel:", channelId);
    }
  }, [channelId, onSearch]);

  // Don't render if no channel data
  if (!channel && !isLoading) {
    return null;
  }

  return (
    <>
      {channel && (
        <ChannelHeaderUI
          channel={channel}
          membersCount={membersCount}
          isFavorite={isFavorite}
          isMuted={isMuted}
          hasSearch={showSearch}
          showSettings={showSettings}
          showLeave={showLeave}
          size={size}
          onToggleFavorite={handleToggleFavorite}
          onToggleMute={() => setMuteDialogOpen(true)}
          onViewMembers={handleViewMembers}
          onSettings={handleSettings}
          onInfo={handleInfo}
          onInvite={handleInvite}
          onLeave={() => setLeaveDialogOpen(true)}
          onDelete={() => setDeleteDialogOpen(true)}
          onSearch={handleSearch}
          className={className}
          sx={sx}
          id={id}
        />
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={leaveDialogOpen}
        title="Leave Channel"
        message={`Are you sure you want to leave the channel "${channel?.display_name}"?`}
        confirmText="Leave"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleLeaveConfirm}
        onCancel={() => setLeaveDialogOpen(false)}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Channel"
        message={`Are you sure you want to delete the channel "${channel?.display_name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      <ConfirmDialog
        open={muteDialogOpen}
        title={isMuted ? "Unmute Channel" : "Mute Channel"}
        message={
          isMuted
            ? `Are you sure you want to unmute the channel "${channel?.display_name}"? You will receive notifications for this channel.`
            : `Are you sure you want to mute the channel "${channel?.display_name}"? You will not receive notifications for this channel.`
        }
        confirmText={isMuted ? "Unmute" : "Mute"}
        cancelText="Cancel"
        isDestructive={false}
        onConfirm={handleToggleMute}
        onCancel={() => setMuteDialogOpen(false)}
      />
    </>
  );
};

export default ChannelHeaderContainer;
