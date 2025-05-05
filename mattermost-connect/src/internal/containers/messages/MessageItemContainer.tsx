// src/internal/containers/messages/MessageItemContainer.tsx
/**
 * Container for individual message items
 * Handles message display and actions
 */
import React, { useCallback, useMemo } from "react";
import { useBaseContainer } from "../base/BaseContainer";
import { useMessageReactions, useUser } from "../../../hooks";
import { Message, User } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import MessageItemUI from "../../components/messages/MessageItemUI";
import { parseEmojis } from "../../../utils/mattermostUtils";
import { formatDate } from "../../../utils/formatters";
import { ActionOption } from "../../types/componentTypes";

export interface MessageItemContainerProps {
  /** Message object */
  message: Message;
  /** Whether the message is being edited */
  isEditing?: boolean;
  /** Whether the message is being replied to */
  isReplying?: boolean;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Whether the view is compact */
  compact?: boolean;
  /** Whether to show the user avatar */
  showAvatar?: boolean;
  /** Whether to show the timestamp */
  showTimestamp?: boolean;
  /** Whether to highlight mentions */
  highlightMentions?: boolean;
  /** Whether to show reactions */
  showReactions?: boolean;
  /** Callback when an action is performed */
  onAction?: (action: string) => void;
  /** CSS class name */
  className?: string;
  /** Material UI's sx prop for styling */
  sx?: any;
  /** ID for the component */
  id?: string;
}

/**
 * Container for individual message items
 * Handles display and actions for a single message
 */
const MessageItemContainer: React.FC<MessageItemContainerProps> = (props) => {
  const {
    message,
    isEditing = false,
    isReplying = false,
    showActions = true,
    compact = false,
    showAvatar = true,
    showTimestamp = true,
    highlightMentions = true,
    showReactions = true,
    onAction,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();

  // Use message reactions hook for this message
  const {
    reactionCounts,
    hasReacted,
    toggleReaction,
    isLoading: reactionsLoading,
  } = useMessageReactions(message.id);

  // Use user hook for message author
  const {
    user,
    displayName,
    initials,
    profileImageUrl,
    isLoading: userLoading,
  } = useUser(message.user_id);

  // Use BaseContainer for common functionality
  const [baseState, baseAPI] = useBaseContainer({
    initialLoading: reactionsLoading || userLoading,
    id,
    className,
    sx,
  });

  // Format message time
  const formattedTime = useMemo(() => {
    return formatDate(message.create_at, {
      showTime: true,
      showDate: !compact,
      format: compact ? "short" : "medium",
    });
  }, [message.create_at, compact]);

  // Extract emojis from message
  const emojis = useMemo(() => {
    return parseEmojis(message.message);
  }, [message.message]);

  // Handle message actions
  const handleAction = useCallback(
    (action: string) => {
      if (onAction) {
        onAction(action);
      }
    },
    [onAction],
  );

  // Handle reaction click
  const handleReactionClick = useCallback(
    (emoji: string) => {
      toggleReaction(emoji).catch((error) => {
        baseAPI.setError(
          error instanceof Error
            ? error
            : new Error("Failed to toggle reaction"),
        );
      });
    },
    [toggleReaction, baseAPI],
  );

  // Check if user can edit or delete
  const canEdit = useMemo(() => {
    // In a real app, this would check the current user against message.user_id
    // and also check for admin permissions
    return !isEditing && !isReplying;
  }, [isEditing, isReplying]);

  const canDelete = useMemo(() => {
    // Similar to canEdit
    return !isEditing && !isReplying;
  }, [isEditing, isReplying]);

  // Determine available actions
  const availableActions = useMemo(() => {
    const actions: ActionOption[] = [
      { id: "reply", label: "Reply", icon: "reply" },
      { id: "react", label: "React", icon: "emoji" },
    ];

    if (canEdit) {
      actions.push({ id: "edit", label: "Edit", icon: "edit" });
    }

    if (canDelete) {
      actions.push({
        id: "delete",
        label: "Delete",
        icon: "delete",
        destructive: true,
      });
    }

    actions.push({
      id: "pin",
      label: message.is_pinned ? "Unpin" : "Pin",
      icon: "pin",
    });

    return actions;
  }, [canEdit, canDelete, message.is_pinned]);

  // Prepare UI props
  const uiProps = {
    message,
    user: {
      id: message.user_id,
      displayName: displayName,
      initials: initials,
      profileImageUrl: profileImageUrl,
    },
    isEditing,
    isReplying,
    formattedTime,
    reactions: reactionCounts,
    hasReacted: (emoji: string) => hasReacted(emoji),
    showActions,
    compact,
    showAvatar,
    showTimestamp,
    highlightMentions,
    showReactions,
    availableActions,
    onAction: handleAction,
    onReactionClick: handleReactionClick,
    className,
    sx,
    id,
  };

  return <MessageItemUI {...uiProps} />;
};

// Memoize to prevent unnecessary rerenders
export default React.memo(MessageItemContainer);
