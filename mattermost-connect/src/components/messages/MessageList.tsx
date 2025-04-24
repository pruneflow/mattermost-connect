// src/components/messages/MessageList.tsx
/**
 * Component that displays a list of messages for a channel with optional input
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import MessageListContainer from "../../internal/containers/messages/MessageListContainer";
import { Message } from "../../index";

export interface MessageListProps {
  /** Channel ID to display messages for */
  channelId: string;
  /** Whether to show message input */
  showInput?: boolean;
  /** Whether to allow file uploads */
  allowFileUploads?: boolean;
  /** Whether to allow emoji reactions */
  allowEmojis?: boolean;
  /** Maximum number of files that can be attached */
  maxAttachments?: number;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Custom emoji picker component */
  emojiPickerComponent?: React.ReactNode;
  /** Callback when message is sent */
  onMessageSent?: (message: Message) => void;
  /** Callback when message is edited */
  onMessageEdited?: (message: Message) => void;
  /** Callback when message is deleted */
  onMessageDeleted?: (messageId: string) => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Message list component that displays messages for a channel with optional input
 *
 * This component displays a scrollable list of messages for a specific channel
 * with an optional input area for sending new messages.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <MessageList channelId="channel123" />
 *
 * // Without input area
 * <MessageList
 *   channelId="channel123"
 *   showInput={false}
 * />
 *
 * // With callbacks
 * <MessageList
 *   channelId="channel123"
 *   onMessageSent={(message) => console.log('Message sent:', message)}
 *   onMessageEdited={(message) => console.log('Message edited:', message)}
 *   onMessageDeleted={(messageId) => console.log('Message deleted:', messageId)}
 * />
 * ```
 */
const MessageList: React.FC<MessageListProps> = ({
  channelId,
  showInput = true,
  allowFileUploads = true,
  allowEmojis = true,
  maxAttachments = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  emojiPickerComponent,
  onMessageSent,
  onMessageEdited,
  onMessageDeleted,
  className,
  sx,
  id,
}) => {
  return (
    <MessageListContainer
      channelId={channelId}
      showInput={showInput}
      allowFileUploads={allowFileUploads}
      allowEmojis={allowEmojis}
      maxAttachments={maxAttachments}
      maxFileSize={maxFileSize}
      emojiPickerComponent={emojiPickerComponent}
      onMessageSent={onMessageSent}
      onMessageEdited={onMessageEdited}
      onMessageDeleted={onMessageDeleted}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default MessageList;
