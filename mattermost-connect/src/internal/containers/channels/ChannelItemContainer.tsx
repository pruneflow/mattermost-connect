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
import { channelLoadingService } from "../../../core/services/channelLoadingService";
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

  // Track display name and loading state locally to avoid loops
  const [displayName, setDisplayName] = useState(channel.display_name || "");
  const [displayNameLoading, setDisplayNameLoading] = useState(false);

  // Only use useDirectChannelUsers for direct/group channels
  const isDirect = channelService.isDirectChannel(channel);
  const isGroup = channelService.isGroupChannel(channel);
  const isDirectOrGroup = isDirect || isGroup;

  const {
    otherUser,
    groupUsers,
    usersWithStatus,
    isLoading: isLoadingUsers,
    isInitialized,
    refreshUsers,
    refreshInfo,
  } = isDirectOrGroup
    ? useDirectChannelUsers(channel.id)
    : {
        otherUser: null,
        groupUsers: [],
        usersWithStatus: [],
        isLoading: false,
        isInitialized: true,
        refreshUsers: () => Promise.resolve(null),
        refreshInfo: () => {},
      };

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
    initialLoading: isLoadingChannel,
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

  // Load user data for direct channels only if needed
  useEffect(() => {
    if (
      isDirectOrGroup &&
      !isInitialized &&
      !displayNameLoading &&
      !channelLoadingService.isChannelLoading(channel.id)
    ) {
      setDisplayNameLoading(true);

      // Call both refresh functions to ensure data is loaded
      refreshInfo();
      refreshUsers()
        .then(() => {
          setDisplayNameLoading(false);
        })
        .catch(() => {
          setDisplayNameLoading(false);
        });
    }
  }, [
    isDirectOrGroup,
    isInitialized,
    refreshInfo,
    refreshUsers,
    channel.id,
    displayNameLoading,
  ]);

  // Update display name whenever channel or user data changes
  useEffect(() => {
    // Special handling for direct/group channels
    if (isDirectOrGroup) {
      // Handle direct channels
      if (isDirect) {
        // Use other user if available
        if (otherUser) {
          setDisplayName(userService.formatUserName(otherUser));
          return;
        }

        // Try to extract the other user ID and get user directly
        if (currentUser) {
          const otherUserId = channelService.getOtherUserIdFromDirectChannel(
            channel.name,
            currentUser.id,
          );

          if (otherUserId) {
            const user = getUserById(otherUserId);
            if (user) {
              setDisplayName(userService.formatUserName(user));
              return;
            }
          }
        }

        // If users are loading, show loading indicator
        if (isLoadingUsers || displayNameLoading) {
          setDisplayName("Loading...");
          return;
        }

        // Use usersWithStatus as fallback
        if (usersWithStatus && usersWithStatus.length > 0) {
          setDisplayName(usersWithStatus[0].displayName);
          return;
        }
      }
      // Handle group channels
      else if (isGroup) {
        // Use group users if available
        if (groupUsers && groupUsers.length > 0) {
          const formattedName = groupUsers
            .map((user) => userService.formatUserName(user))
            .join(", ");
          setDisplayName(formattedName);
          return;
        }

        // If users are loading, show loading indicator
        if (isLoadingUsers || displayNameLoading) {
          setDisplayName("Loading...");
          return;
        }

        // Use usersWithStatus as fallback
        if (usersWithStatus && usersWithStatus.length > 0) {
          const formattedName = usersWithStatus
            .map((status) => status.displayName)
            .join(", ");
          setDisplayName(formattedName);
          return;
        }
      }
    }

    // Default to channel display name for non-direct channels
    setDisplayName(channel.display_name || "");
  }, [
    channel,
    isDirect,
    isGroup,
    isDirectOrGroup,
    otherUser,
    groupUsers,
    usersWithStatus,
    isLoadingUsers,
    currentUser,
    getUserById,
    displayNameLoading,
  ]);

  // Determine loading state - optimize to avoid unnecessary renders
  const isLoading = useMemo(() => {
    if (baseState.isLoading) return true;

    // Only consider user loading state for direct/group channels
    if (isDirectOrGroup) {
      // If display name is already resolved and not loading, don't show loading
      if (displayName && displayName !== "Loading..." && !displayNameLoading) {
        return false;
      }
      return isLoadingUsers || displayNameLoading;
    }

    return false;
  }, [
    baseState.isLoading,
    isDirectOrGroup,
    displayName,
    isLoadingUsers,
    displayNameLoading,
  ]);

  // Prepare UI props
  const uiProps = {
    item: channel,
    isActive,
    showActions,
    isLoading,
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
    displayName,
  };

  return <ChannelItemUI {...uiProps} />;
};

export default ChannelItemContainer;
