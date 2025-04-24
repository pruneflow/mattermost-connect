// src/internal/containers/channels/ChannelDetailContainer.tsx
/**
 * Container component for channel details that manages data fetching and state
 */
import React, { useCallback, useState, useMemo } from "react";
import { useChannel } from "../../../hooks/useChannels";
import { BaseComponentProps } from "../../types/componentTypes";
import ChannelDetailUI from "../../components/channels/ChannelDetailUI";
import { ConfirmDialog } from "../../components/common";
import { useUserStore } from "../../../core/store/userStore";

export interface ChannelDetailContainerProps extends BaseComponentProps {
  /** Channel ID to display */
  channelId: string;
  /** Whether to show channel actions */
  showActions?: boolean;
  /** Maximum number of members to preview */
  memberPreviewCount?: number;
  /** Callback when channel is deleted */
  onDelete?: () => void;
  /** Callback when channel is left */
  onLeave?: () => void;
  /** Callback when channel is updated */
  onUpdate?: () => void;
  /** Callback when view members is clicked */
  onViewMembers?: () => void;
}

const ChannelDetailContainer: React.FC<ChannelDetailContainerProps> = ({
  channelId,
  showActions = true,
  memberPreviewCount = 5,
  onDelete,
  onLeave,
  onUpdate,
  onViewMembers,
  className,
  sx,
  id,
}) => {
  // State for dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  // Get channel data from hook
  const {
    channel,
    members,
    isLoading,
    error,
    deleteChannel,
    leaveChannel,
    updateChannel,
    addToFavorites,
    removeFromFavorites,
  } = useChannel(channelId);

  // Get user store for user data
  const { getUserById, getUserDisplayName, getUserStatus } = useUserStore();

  // Determine if the channel is a favorite (placeholder - would come from preferences)
  const isFavorite = channel?.is_favorite || false;

  // Determine if the channel is muted (placeholder - would come from preferences)
  const isMuted = false;

  // Get member count
  const memberCount = members?.length || 0;

  // Determine if user can manage this channel (placeholder)
  // In a real implementation, this would be based on user roles
  const canManage = true;

  // Create member preview data
  const memberPreview = useMemo(() => {
    if (!members || members.length === 0) return [];

    const previewMembers = members.slice(0, memberPreviewCount);

    return previewMembers.map((member) => {
      const user = getUserById(member.user_id);
      const displayName = user ? getUserDisplayName(user.id) : "Unknown User";
      const status = user ? getUserStatus(user.id) : "offline";

      return {
        id: member.user_id,
        displayName,
        status: status as "online" | "away" | "dnd" | "offline",
        imageUrl: user?.last_picture_update
          ? `users/${user.id}/image?_=${user.last_picture_update}`
          : undefined,
      };
    });
  }, [
    members,
    memberPreviewCount,
    getUserById,
    getUserDisplayName,
    getUserStatus,
  ]);

  // Handle toggle favorite
  const handleToggleFavorite = useCallback(async () => {
    try {
      if (isFavorite) {
        await removeFromFavorites();
      } else {
        await addToFavorites();
      }

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  }, [isFavorite, addToFavorites, removeFromFavorites, onUpdate]);

  // Handle view members
  const handleViewMembers = useCallback(() => {
    if (onViewMembers) {
      onViewMembers();
    }
  }, [onViewMembers]);

  // Handle invite
  const handleInvite = useCallback(() => {
    // This would typically open an invite dialog
    console.log("Invite users to channel:", channelId);
  }, [channelId]);

  // Handle edit
  const handleEdit = useCallback(() => {
    // This would typically open an edit dialog
    console.log("Edit channel:", channelId);
  }, [channelId]);

  // Handle copy link
  const handleCopyLink = useCallback(() => {
    // This would typically copy a link to the channel
    console.log("Copy link for channel:", channelId);
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

  // Don't render if no channel data
  if (!channel && !isLoading) {
    return null;
  }

  return (
    <>
      {channel && (
        <ChannelDetailUI
          channel={channel}
          isFavorite={isFavorite}
          isMuted={isMuted}
          memberCount={memberCount}
          memberPreview={memberPreview}
          showActions={showActions}
          canManage={canManage}
          onToggleFavorite={handleToggleFavorite}
          onViewMembers={handleViewMembers}
          onInvite={handleInvite}
          onEdit={handleEdit}
          onCopyLink={handleCopyLink}
          onLeave={() => setLeaveDialogOpen(true)}
          onDelete={canManage ? () => setDeleteDialogOpen(true) : undefined}
          className={className}
          sx={sx}
          id={id}
        />
      )}

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
        open={leaveDialogOpen}
        title="Leave Channel"
        message={`Are you sure you want to leave the channel "${channel?.display_name}"?`}
        confirmText="Leave"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleLeaveConfirm}
        onCancel={() => setLeaveDialogOpen(false)}
      />
    </>
  );
};

export default ChannelDetailContainer;
