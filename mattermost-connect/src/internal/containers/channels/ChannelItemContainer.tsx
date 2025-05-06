// src/internal/containers/channels/ChannelItemContainer.tsx
/**
 * Container for individual channel items
 * Handles specific actions for a single channel
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAuth,
  useChannel,
  useChannelUnreadCount,
  useDirectChannelUsers,
} from "../../../hooks";
import ChannelItemUI from "../../components/channels/ChannelItemUI";
import { useBaseContainer } from "../base/BaseContainer";
import { Channel } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import { channelService } from "../../../core/services/channelService";
import { userService } from "../../../core/services/userService";
import { useUserStore } from "../../../core/store/userStore";

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

  const dialog = useDialog();
  const { currentUser } = useAuth();
  const { getUserById } = useUserStore();

  // Local state to track if display name is resolved
  const [displayNameResolved, setDisplayNameResolved] = useState(false);

  const {
    otherUser,
    groupUsers,
    usersWithStatus,
    isLoading: isLoadingUsers,
    isInitialized,
    formatDisplayName,
    isDirect,
    isGroup,
    refreshUsers,
    refreshInfo,
  } = useDirectChannelUsers(channel.id);

  // Force refresh when component mounts
  useEffect(() => {
    if ((isDirect || isGroup) && !isInitialized) {
      refreshInfo();
      refreshUsers();
    }
  }, [isDirect, isGroup, isInitialized, refreshInfo, refreshUsers]);

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

  // Enhanced implementation for determining channel display name
  const getChannelDisplayName = useCallback((): string => {
    // For direct messages
    if (isDirect && channel) {
      // First try: Use the otherUser from useDirectChannelUsers
      if (otherUser) {
        setDisplayNameResolved(true);
        return userService.formatUserName(otherUser);
      }

      // Second try: Try to extract the other user ID and get user directly
      if (currentUser && channel.name) {
        const otherUserId = channelService.getOtherUserIdFromDirectChannel(
          channel.name,
          currentUser.id,
        );

        if (otherUserId) {
          const user = getUserById(otherUserId);
          if (user) {
            setDisplayNameResolved(true);
            return userService.formatUserName(user);
          }
        }
      }

      // Third try: Check if we have users with status
      if (usersWithStatus && usersWithStatus.length > 0) {
        setDisplayNameResolved(true);
        return usersWithStatus[0].displayName;
      }

      // Fallback: If we've previously resolved a name, use the channel display_name
      if (displayNameResolved) {
        return channel.display_name || "Direct Message";
      }

      // Loading state: Show loading indicator only if we're actually loading
      if (isLoadingUsers) {
        return "Loading...";
      }

      // Final fallback: Just use the channel display name
      return channel.display_name || "Direct Message";
    }

    // For group messages
    if (isGroup && channel) {
      // If we have group users, format them
      if (groupUsers && groupUsers.length > 0) {
        setDisplayNameResolved(true);
        return groupUsers
          .map((user) => userService.formatUserName(user))
          .join(", ");
      }

      // Check if we have users with status
      if (usersWithStatus && usersWithStatus.length > 0) {
        setDisplayNameResolved(true);
        return usersWithStatus.map((u) => u.displayName).join(", ");
      }

      // Fallback: If we've previously resolved a name, use the channel display_name
      if (displayNameResolved) {
        return channel.display_name || "Group Message";
      }

      // Loading state
      if (isLoadingUsers) {
        return "Loading...";
      }

      // Final fallback
      return channel.display_name || "Group Message";
    }

    // For regular channels, use the display_name
    return channel.display_name;
  }, [
    channel,
    isDirect,
    isGroup,
    otherUser,
    groupUsers,
    usersWithStatus,
    isLoadingUsers,
    currentUser,
    getUserById,
    displayNameResolved,
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
    displayName: getChannelDisplayName(),
  };

  return <ChannelItemUI {...uiProps} />;
};

export default ChannelItemContainer;
