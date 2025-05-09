// src/internal/containers/channels/ChannelItemContainer.tsx
/**
 * Container for individual channel items
 * Handles specific actions for a single channel
 */
import React, { useCallback, useMemo } from "react";
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

  // Only use useDirectChannelUsers for direct/group channels if really needed
  const isDirect = channelService.isDirectChannel(channel);
  const isGroup = channelService.isGroupChannel(channel);
  const isDirectOrGroup = isDirect || isGroup;

  // Only extract the data we need from useDirectChannelUsers, not the action functions
  const {
    otherUser,
    groupUsers,
    usersWithStatus,
    isLoading: isLoadingUsers,
  } = isDirectOrGroup
    ? useDirectChannelUsers(channel.id)
    : {
        otherUser: null,
        groupUsers: [],
        usersWithStatus: [],
        isLoading: false,
      };

  // Use channel hook for this specific channel
  const {
    isFavorite,
    toggleFavoriteStatus,
    toggleMutedStatus,
    isLoading: isLoadingChannel,
    isMuted,
    directInfo,
  } = useChannel(channel.id);

  const { unreadCount } = useChannelUnreadCount(channel.id);

  // Use base container for common functionality
  const [baseState, baseAPI] = useBaseContainer({
    id,
    className,
    sx,
    initialLoading: isLoadingChannel,
  });

  const isLoading = isLoadingChannel || isLoadingUsers || baseState.isLoading;

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

  // Derive the display name directly from available data
  const displayName = useMemo(() => {
    // If not a direct/group channel, use normal display name
    if (!isDirectOrGroup) {
      return channel.display_name || "";
    }

    // For direct/group channels, use better fallbacks
    if (directInfo && directInfo.displayName) {
      return directInfo.displayName;
    }

    // Extract user IDs for better fallback
    if (isDirect) {
      const userIds = channelService.getUserIdsFromDirectChannel(channel.name);
      const otherUserId = userIds.find((id) => id !== currentUser?.id);
      if (otherUserId) {
        // Get the user from the store or from usersWithStatus
        const directUser = otherUser || usersWithStatus.find(u => u.user.id === otherUserId)?.user;
        // Use formatUserName from userService
        if (directUser) {
          return userService.formatUserName(directUser);
        }
        // If user not found, use display_name as fallback or a more user-friendly ID
        return channel.display_name || `User ${otherUserId.substring(0, 6)}...`;
      }
    }

    // For group channels
    if (isGroup) {
      // Try to create a group name from participants if we have them
      if (groupUsers && groupUsers.length > 0) {
        const userNames = groupUsers.slice(0, 3).map(user => 
          userService.formatUserName(user)
        );
        const remaining = groupUsers.length > 3 ? ` +${groupUsers.length - 3}` : '';
        return `${userNames.join(', ')}${remaining}`;
      }
      return "Group Message";
    }

    // Last resort
    return channel.display_name || "Loading...";
  }, [isDirectOrGroup, isDirect, isGroup, directInfo, channel, currentUser, otherUser, usersWithStatus, groupUsers]);

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
