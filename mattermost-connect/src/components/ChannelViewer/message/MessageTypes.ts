// src/components/ChannelViewer/message/MessageTypes.ts
import React from "react";
import { Message as MessageType, User } from "../../../types";
import { SxProps, Theme } from "@mui/material";

/**
 * Base props shared across all message components
 */
export interface BaseMessageProps {
  /** The message data object */
  message: MessageType;

  /** Whether the message is from the current user */
  isFromCurrentUser?: boolean;

  /** Additional CSS class */
  className?: string;

  /** Additional inline style */
  style?: React.CSSProperties;

  /** Material-UI sx prop for additional styling */
  sx?: SxProps<Theme>;
}

/**
 * Props for the Message component
 */
export interface MessageProps extends BaseMessageProps {
  /** Custom message renderer (optional) */
  renderer?: (props: {
    message: MessageType;
    author: User | null;
    formattedText: string;
  }) => React.ReactNode;

  /** Whether to show message actions */
  showActions?: boolean;

  /** Callback for reply action */
  onReply?: (message: MessageType) => void;

  /** Callback for edit action */
  onEdit?: (message: MessageType) => void;

  /** Callback for delete action */
  onDelete?: (message: MessageType) => void;

  /** Styling for message bubble */
  bubbleSx?: SxProps<Theme>;

  /** Styling for author area */
  authorSx?: SxProps<Theme>;

  /** Styling for content area */
  contentSx?: SxProps<Theme>;

  /** Styling for actions area */
  actionsSx?: SxProps<Theme>;

  /** Styling for avatar */
  avatarSx?: SxProps<Theme>;
}

/**
 * Props for the MessageHeader component
 */
export interface MessageHeaderProps {
  /** Author user object */
  author: User | null;

  /** Formatted timestamp string */
  timestamp: string;

  /** Whether the message is from the current user */
  isFromCurrentUser?: boolean;

  /** Custom styling */
  sx?: SxProps<Theme>;

  /** Avatar styling */
  avatarSx?: SxProps<Theme>;
}

/**
 * Props for the MessageContent component
 */
export interface MessageContentProps {
  /** The message object */
  message: MessageType;

  /** Pre-formatted HTML text */
  formattedText: string;

  /** Custom styling */
  sx?: SxProps<Theme>;
}

/**
 * Props for the MessageActions component
 */
export interface MessageActionsProps {
  /** The message object */
  message: MessageType;

  /** Whether the message is currently hovered */
  isHovered: boolean;

  /** Whether the message is from the current user */
  isFromCurrentUser?: boolean;

  /** Callback for reply action */
  onReply?: (message: MessageType) => void;

  /** Callback for edit action */
  onEdit?: (message: MessageType) => void;

  /** Callback for delete action */
  onDelete?: (message: MessageType) => void;

  /** Custom styling */
  sx?: SxProps<Theme>;
}

/**
 * Props for the MessageReactions component
 */
export interface MessageReactionsProps {
  /** The message object */
  message: MessageType;

  /** Whether the message is from the current user */
  isFromCurrentUser?: boolean;

  /** Custom styling */
  sx?: SxProps<Theme>;
}

/**
 * Props for the ReferencedMessage component
 */
export interface ReferencedMessageProps {
  /** The referenced message object */
  message: MessageType;

  /** Author of the referenced message */
  author: User | null;

  /** Custom styling */
  sx?: SxProps<Theme>;
}
