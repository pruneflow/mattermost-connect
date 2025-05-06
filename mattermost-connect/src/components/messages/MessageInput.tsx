// src/components/messages/MessageInput.tsx
/**
 * Component for composing and sending messages
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import MessageInputContainer from "../../internal/containers/messages/MessageInputContainer";
import { Message } from "../../types";

export interface MessageInputProps {
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
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Message input component for composing and sending messages
 *
 * This component provides a rich text input area with support for attachments,
 * emoji, message editing, and replying.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <MessageInput channelId="channel123" />
 *
 * // With editing functionality
 * <MessageInput
 *   channelId="channel123"
 *   editingMessage={messageToEdit}
 *   onMessageEdited={(message) => console.log('Edited:', message)}
 *   onEditCancel={() => console.log('Edit cancelled')}
 * />
 *
 * // With reply functionality
 * <MessageInput
 *   channelId="channel123"
 *   showReply={true}
 *   replyToMessage={messageToReplyTo}
 *   onMessageSent={(message) => console.log('Reply sent:', message)}
 *   onReplyCancel={() => console.log('Reply cancelled')}
 * />
 * ```
 */
const MessageInput: React.FC<MessageInputProps> = ({
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
  return (
    <MessageInputContainer
      channelId={channelId}
      editingMessage={editingMessage}
      replyToMessage={replyToMessage}
      onMessageSent={onMessageSent}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default React.memo(MessageInput);
