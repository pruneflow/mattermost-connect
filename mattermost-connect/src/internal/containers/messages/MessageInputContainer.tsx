// src/internal/containers/messages/MessageInputContainer.tsx
/**
 * Container component for message input that manages sending and editing messages
 */
import React, { useCallback, useState, useEffect } from "react";
import { useMessages } from "../../../hooks/useMessages";
import { useTypingIndicator } from "../../../hooks/useWebSocket";
import { BaseComponentProps } from "../../types/componentTypes";
import MessageInputUI from "../../components/messages/MessageInputUI";
import { useUserStore } from "../../../core/store/userStore";
import { Message } from "../../../index";

export interface MessageInputContainerProps extends BaseComponentProps {
  /** Channel ID to send messages to */
  channelId: string;
  /** Initial value for the input */
  initialValue?: string;
  /** Whether to allow file attachments */
  allowAttachments?: boolean;
  /** Whether to allow emoji reactions */
  allowEmojis?: boolean;
  /** Message being edited (if any) */
  editingMessage?: Message | null;
  /** Whether to show the reply UI */
  showReply?: boolean;
  /** Message being replied to (if any) */
  replyToMessage?: Message | null;
  /** Maximum number of files that can be attached */
  maxAttachments?: number;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Custom emoji picker component */
  emojiPickerComponent?: React.ReactNode;
  /** Callback when a message is sent */
  onMessageSent?: (message: Message) => void;
  /** Callback when a message is edited */
  onMessageEdited?: (message: Message) => void;
  /** Callback when editing is cancelled */
  onEditCancel?: () => void;
  /** Callback when reply is cancelled */
  onReplyCancel?: () => void;
}

const MessageInputContainer: React.FC<MessageInputContainerProps> = ({
  channelId,
  initialValue = "",
  allowAttachments = true,
  allowEmojis = true,
  editingMessage = null,
  showReply = false,
  replyToMessage = null,
  maxAttachments = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  emojiPickerComponent,
  onMessageSent,
  onMessageEdited,
  onEditCancel,
  onReplyCancel,
  className,
  sx,
  id,
}) => {
  // Get message functions from hook
  const { sendMessage, editMessage, uploadFiles, isSending, isUploading } =
    useMessages(channelId);

  // Get typing indicator hook
  const sendTypingEvent = useTypingIndicator(channelId);

  // Get user store for names
  const { getUserDisplayName } = useUserStore();

  // State for whether the input is sending
  const [isSendingState, setIsSendingState] = useState(false);
  const [isUploadingState, setIsUploadingState] = useState(false);

  // Use effective props for conditional logic
  const isEditing = !!editingMessage;
  const isReply = !!replyToMessage || showReply;

  // Get reply-to user name
  const replyToUserName = replyToMessage
    ? getUserDisplayName(replyToMessage.user_id)
    : "User";

  // Update initial value when editing message changes
  useEffect(() => {
    if (editingMessage) {
      // initialValue is handled by the UI component
      // but we could set a state here if needed
    }
  }, [editingMessage]);

  // Handle message submission
  const handleSubmit = useCallback(
    async (text: string, attachments: File[]) => {
      if (
        (!text && attachments.length === 0) ||
        isSendingState ||
        isUploadingState
      )
        return;

      setIsSendingState(true);

      try {
        if (isEditing && editingMessage) {
          // Edit existing message
          const updatedMessage = await editMessage(editingMessage.id, text);

          if (onMessageEdited) {
            onMessageEdited(updatedMessage);
          }
        } else {
          // Send new message
          let fileIds: string[] = [];

          // Upload files if any
          if (attachments.length > 0) {
            setIsUploadingState(true);
            fileIds = await uploadFiles(attachments);
            setIsUploadingState(false);
          }

          // Determine root ID for replies
          const rootId =
            isReply && replyToMessage ? replyToMessage.id : undefined;

          // Send the message
          const sentMessage = await sendMessage(text, fileIds);

          if (onMessageSent) {
            onMessageSent(sentMessage);
          }
        }
      } catch (error) {
        console.error("Error sending/editing message:", error);
      } finally {
        setIsSendingState(false);
      }
    },
    [
      isEditing,
      isReply,
      editingMessage,
      replyToMessage,
      sendMessage,
      editMessage,
      uploadFiles,
      onMessageSent,
      onMessageEdited,
      isSendingState,
      isUploadingState,
    ],
  );

  // Handle editing cancel
  const handleCancel = useCallback(() => {
    if (onEditCancel) {
      onEditCancel();
    }
  }, [onEditCancel]);

  // Handle reply cancel
  const handleReplyCancel = useCallback(() => {
    if (onReplyCancel) {
      onReplyCancel();
    }
  }, [onReplyCancel]);

  // Handle typing notification
  const handleTyping = useCallback(() => {
    if (sendTypingEvent) {
      sendTypingEvent(
        isReply && replyToMessage ? replyToMessage.id : undefined,
      );
    }
  }, [sendTypingEvent, isReply, replyToMessage]);

  // Get initial value for input
  const effectiveInitialValue =
    isEditing && editingMessage ? editingMessage.message : initialValue;

  return (
    <MessageInputUI
      placeholder={isReply ? "Write a reply..." : "Type a message..."}
      initialValue={effectiveInitialValue}
      allowAttachments={allowAttachments}
      allowEmojis={allowEmojis}
      isEditing={isEditing}
      isReply={isReply}
      replyToMessage={replyToMessage}
      isUploading={isUploadingState || isUploading}
      isSending={isSendingState || isSending}
      maxAttachments={maxAttachments}
      maxFileSize={maxFileSize}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onCancelReply={handleReplyCancel}
      onTyping={handleTyping}
      emojiPickerComponent={emojiPickerComponent}
      replyToUserName={replyToUserName}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default MessageInputContainer;
