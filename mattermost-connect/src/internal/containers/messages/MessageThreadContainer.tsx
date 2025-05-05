// src/internal/containers/messages/MessageThreadContainer.tsx
/**
 * Container for message threads
 * Combines thread message list and input for thread replies
 */
import React, { useCallback, useMemo } from "react";
import { useBaseContainer } from "../base/BaseContainer";
import { useThread } from "../../../hooks";
import { Message, User } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import MessageThreadUI from "../../components/messages/MessageThreadUI";
import MessageListContainer from "./MessageListContainer";
import MessageInputContainer from "./MessageInputContainer";

export interface MessageThreadContainerProps {
  /** Root message ID */
  rootId: string;
  /** Root message object (if already available) */
  rootMessage?: Message;
  /** Channel ID */
  channelId?: string;
  /** Whether to show actions on messages */
  showActions?: boolean;
  /** Whether view is compact */
  compact?: boolean;
  /** Whether to show avatars */
  showAvatars?: boolean;
  /** Callback when thread is closed */
  onClose?: () => void;
  /** Callback when a reply is posted */
  onReplyPosted?: (message: Message) => void;
  /** CSS class name */
  className?: string;
  /** Material UI's sx prop for styling */
  sx?: any;
  /** ID for the component */
  id?: string;
}

/**
 * Container for message threads
 * Manages thread view with message list and reply input
 */
const MessageThreadContainer: React.FC<MessageThreadContainerProps> = (
  props,
) => {
  const {
    rootId,
    rootMessage: propRootMessage,
    channelId: propChannelId,
    showActions = true,
    compact = false,
    showAvatars = true,
    onClose,
    onReplyPosted,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();

  // Use thread hook for data and operations
  const {
    rootMessage: fetchedRootMessage,
    threadMessages,
    sendReply,
    toggleReaction,
    isLoading,
    isReplying,
    refreshThread,
  } = useThread(rootId);

  const rootMessage = propRootMessage || fetchedRootMessage;
  const channelId = propChannelId || rootMessage?.channel_id;

  // Use BaseContainer for common functionality
  const [baseState, baseAPI] = useBaseContainer({
    initialLoading: isLoading,
    id,
    className,
    sx,
  });

  // Handle reply post
  const handleReplyPosted = useCallback(
    (message: Message) => {
      if (onReplyPosted) {
        onReplyPosted(message);
      }
    },
    [onReplyPosted],
  );

  // Handle thread message action
  const handleMessageAction = useCallback(
    (action: string, message: Message) => {
      switch (action) {
        case "react":
          toggleReaction(message.id, "thumbsup");
          break;
        // Add other thread-specific message actions as needed
        default:
          // This would be handled by MessageItemContainer
          break;
      }
    },
    [toggleReaction],
  );

  // Prepare UI props
  const uiProps = {
    rootMessage,
    threadMessages,
    isLoading: baseState.isLoading,
    isReplying,
    onClose,
    renderMessageList: () => (
      <MessageListContainer
        channelId={channelId || ""}
        virtualized={threadMessages.length > 50}
        showDateSeparators={true}
        groupByUser={true}
        enableActions={showActions}
        showAvatars={showAvatars}
        compact={compact}
        onMessageAction={handleMessageAction}
      />
    ),
    renderMessageInput: () => (
      <MessageInputContainer
        channelId={channelId || ""}
        isThreadReply={true}
        rootId={rootId}
        placeholder="Reply to thread..."
        onMessageSent={handleReplyPosted}
      />
    ),
    className,
    sx,
    id,
  };

  // Don't render if we don't have a channel ID
  if (!channelId) {
    return null;
  }

  return <MessageThreadUI {...uiProps} />;
};

// Memoize to prevent unnecessary rerenders
export default React.memo(MessageThreadContainer);
