// src/internal/containers/channels/ChannelItemContainer.tsx
/**
 * Container for individual channel items
 * Handles specific actions for a single channel
 */
import React, { useCallback, useEffect, useMemo } from "react";
import {
  useAuth,
  useChannel,
  useChannelUnreadCount,
  useDirectChannelUsers,
  useUsers,
} from "../../../hooks";
import ChannelItemUI from "../../components/channels/ChannelItemUI";
import { useBaseContainer } from "../base/BaseContainer";
import { Channel } from "../../../types";
import { useDialog } from "../../hooks/useDialog";

export interface ChannelItemContainerProps {
  /** Channel object */
  channel: Channel;
  /** Display variant */
  variant?: "list" | "grid" | "sidebar" | "tabs";
  /** Whether the channel is active/selected */
  isActive?: boolean;
  /** Whether to show actions for this item */
  showActions?: boolean;
  /** Whether the display is compact */
  compact?: boolean;
  /** Callback when the channel is clicked */
  onClick?: (channel: Channel) => void;
  /** Callback when an action is performed */
  onAction?: (action: string, channel: Channel) => void;
  /** CSS class name */
  className?: string;
  /** Material UI's sx prop for styling */
  sx?: any;
  /** ID for the component */
  id?: string;
}

/**
 * Container component for individual channel items
 * Responsible for actions specific to a single channel
 */
const ChannelItemContainer: React.FC<ChannelItemContainerProps> = (props) => {
  const {
    channel,
    variant = "list",
    isActive = false,
    showActions = false,
    compact = false,
    onClick,
    onAction,
    className,
    sx,
    id,
  } = props;

  const { currentUser } = useAuth();
  const dialog = useDialog();

  // Get direct service methods through hooks
  const {
    isDirect,
    isGroup,
    refreshInfo,
    refreshUsers,
    isLoading: isLoadingUsers,
    otherUser,
    usersWithStatus,
    groupUsers,
    otherUserIds,
  } = useDirectChannelUsers(channel.id);

  // Use channel hook for this specific channel
  const {
    isFavorite,
    toggleFavoriteStatus,
    toggleMutedStatus,
    isLoading: isLoadingChannel,
    isMuted,
  } = useChannel(channel.id);

  const { unreadCount } = useChannelUnreadCount(channel.id);

  // Use base container for common functionality
  const [baseState, baseAPI] = useBaseContainer({
    id,
    className,
    sx,
    initialLoading: isLoadingChannel || isLoadingUsers,
  });

  // Force refresh of direct channel info if needed
  useEffect(() => {
    if ((isDirect || isGroup) && currentUser) {
      console.log("Refreshing channel info for:", channel.id);
      refreshInfo();
    }
  }, [channel.id, isDirect, isGroup, currentUser, refreshInfo]);

  // Force refresh des utilisateurs quand otherUserIds change
  useEffect(() => {
    if (otherUserIds.length > 0) {
      console.log("Refreshing users for IDs:", otherUserIds);
      refreshUsers();
    }
  }, [otherUserIds, refreshUsers]);

  // Handle click
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(channel);
    }
  }, [onClick, channel]);

  // Handle toggle favorite with error handling
  const handleToggleFavorite = useCallback(async () => {
    try {
      await toggleFavoriteStatus();

      if (onAction) {
        onAction("favorite", channel);
      }
    } catch (error) {
      baseAPI.setError(error as Error);

      dialog.showError(
        "Action Failed",
        error instanceof Error
          ? error.message
          : "Failed to toggle favorite status",
      );
    }
  }, [toggleFavoriteStatus, onAction, channel, baseAPI, dialog]);

  // Handle toggle muted with error handling
  const handleToggleMuted = useCallback(async () => {
    try {
      await toggleMutedStatus();

      if (onAction) {
        onAction("mute", channel);
      }
    } catch (error) {
      baseAPI.setError(error as Error);

      dialog.showError(
        "Action Failed",
        error instanceof Error
          ? error.message
          : "Failed to toggle muted status",
      );
    }
  }, [toggleMutedStatus, onAction, channel, baseAPI, dialog]);

  // Handle other actions
  const handleAction = useCallback(
    (action: string) => {
      if (onAction) {
        onAction(action, channel);
      }
    },
    [onAction, channel],
  );

  // Get unread info for this channel
  const unreadInfo = useMemo(() => {
    return {
      unreadCount: unreadCount?.msg_count || 0,
      mention_count: unreadCount?.mention_count || 0,
    };
  }, [unreadCount]);

  // Determine channel display name based on channel type
  const displayName = useMemo(() => {
    // Pour les canaux directs
    if (isDirect) {
      // Si nous avons l'autre utilisateur chargé
      if (otherUser) {
        return (
          otherUser.username ||
          (otherUser.first_name && otherUser.last_name
            ? `${otherUser.first_name} ${otherUser.last_name}`
            : otherUser.first_name) ||
          "Direct Message"
        );
      }

      // Si nous avons des utilisateurs avec statut
      if (usersWithStatus && usersWithStatus.length > 0) {
        return usersWithStatus[0].displayName;
      }

      // Fallback pour les canaux directs
      return isLoadingUsers ? "Loading..." : "Direct Message";
    }

    // Pour les messages de groupe
    if (isGroup) {
      // Si nous avons des utilisateurs de groupe
      if (groupUsers && groupUsers.length > 0) {
        return groupUsers
          .map((user) => user.username || user.first_name || "User")
          .join(", ");
      }

      // Fallback pour les canaux de groupe
      return isLoadingUsers ? "Loading..." : "Group Message";
    }

    // Pour les canaux réguliers, utilisez display_name
    return channel.display_name;
  }, [
    channel.display_name,
    isDirect,
    isGroup,
    isLoadingUsers,
    otherUser,
    groupUsers,
    usersWithStatus,
  ]);

  // Prepare UI props
  const uiProps = {
    item: channel,
    isActive,
    showActions,
    isLoading: baseState.isLoading,
    variant,
    unreadCount: unreadInfo.unreadCount,
    mention_count: unreadInfo.mention_count,
    isFavorite,
    showFavoriteToggle: true,
    isMuted,
    compact,
    onClick: handleClick,
    onAction: handleAction,
    onToggleFavorite: handleToggleFavorite,
    className,
    sx,
    id,
    displayName: displayName,
  };

  return <ChannelItemUI {...uiProps} />;
};

export default ChannelItemContainer;
