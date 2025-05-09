// src/components/messages/MessageThread.tsx
/**
 * Component that displays a message thread with replies
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import MessageThreadContainer from "../../internal/containers/messages/MessageThreadContainer";
import { Message } from "../../types";

export interface MessageThreadProps {
  /** Root message ID - ID of the message for which to display the thread */
  rootMessageId: string;
  /** Channel ID - Optional, will be determined from root message if not provided */
  channelId?: string;
  /** Whether to show an input for replying */
  showReplyInput?: boolean;
  /** Whether to allow file attachments */
  allowAttachments?: boolean;
  /** Whether to allow emoji reactions */
  allowEmojis?: boolean;
  /** Maximum number of files that can be attached */
  maxAttachments?: number;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Emoji picker component */
  emojiPickerComponent?: React.ReactNode;
  /** Callback when a reply is sent */
  onReplySent?: (message: Message) => void;
  /** Callback when thread is closed */
  onClose?: () => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Message thread component that displays a conversation thread
 *
 * This component displays a thread view with the root message and all its replies,
 * with an optional input area for adding new replies.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <MessageThread
 *   rootMessageId="message123"
 * />
 *
 * // With explicit channel ID (optional)
 * <MessageThread
 *   rootMessageId="message123"
 *   channelId="channel123"
 * />
 *
 * // With callbacks
 * <MessageThread
 *   rootMessageId="message123"
 *   onReplySent={(reply) => console.log('Reply sent:', reply)}
 *   onClose={() => console.log('Thread closed')}
 * />
 * ```
 */
const MessageThread: React.FC<MessageThreadProps> = ({
  rootMessageId,
  channelId,
  showReplyInput = true,
  allowAttachments = true,
  allowEmojis = true,
  maxAttachments = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  emojiPickerComponent,
  onReplySent,
  onClose,
  className,
  sx,
  id,
}) => {
  console.log(`MessageThread component rendering with rootMessageId: ${rootMessageId}`);
  return (
    <MessageThreadContainer
      rootId={rootMessageId}
      channelId={channelId}
      onReplyPosted={onReplySent}
      onClose={onClose}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default React.memo(MessageThread);
