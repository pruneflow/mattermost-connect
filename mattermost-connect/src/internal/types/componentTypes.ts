// src/internal/types/componentTypes.ts
/**
 * Common types used across multiple components
 */
import { ReactNode } from "react";
import { SxProps, Theme } from "@mui/material/styles";
import {
  Channel,
  Team,
  User,
  Message,
  MessageAttachment,
  UserStatus,
} from "../../index";

/**
 * Base props interface with common properties for all components
 */
export interface BaseComponentProps {
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Display variants for list components
 */
export type DisplayVariant = "list" | "grid" | "sidebar" | "tabs";

/**
 * Size variants for components
 */
export type SizeVariant = "small" | "medium" | "large";

/**
 * Density variants for components
 */
export type DensityVariant = "compact" | "comfortable" | "spacious";

/**
 * Login mode types
 */
export type LoginMode = "direct" | "proxy";

/**
 * Interface for authentication form credentials
 */
export interface AuthCredentials {
  username: string;
  password: string;
  serverUrl?: string;
  rememberMe?: boolean;
}

/**
 * Props shared by item components displaying an entity (team, channel, message)
 */
export interface ItemComponentProps<T> extends BaseComponentProps {
  /** The item data to display */
  item: T;
  /** Whether the item is currently active/selected */
  isActive?: boolean;
  /** Whether to show available actions */
  showActions?: boolean;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  /** Callback when the item is clicked */
  onClick?: (item: T) => void;
  /** Callback when an action is performed on the item */
  onAction?: (action: string, item: T) => void;
}

/**
 * Props shared by list components
 */
export interface ListComponentProps<T> extends BaseComponentProps {
  /** Array of items to display */
  items: T[];
  /** Currently active/selected item ID */
  activeId?: string;
  /** How to display the list */
  variant?: DisplayVariant;
  /** Density of items */
  density?: DensityVariant;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  /** Message to display when there are no items */
  emptyMessage?: ReactNode;
  /** Callback when an item is clicked */
  onItemClick?: (item: T) => void;
  /** Search term to filter items */
  searchTerm?: string;
}

/**
 * Interface for a notification badge
 */
export interface BadgeData {
  /** Count of unread items */
  count: number;
  /** Count of mentions */
  mentionCount: number;
}

/**
 * Interface for channel header data
 */
export interface ChannelHeaderData extends BaseComponentProps {
  /** Channel information */
  channel: Channel;
  /** Members count in the channel */
  membersCount?: number;
  /** Whether the user has marked the channel as favorite */
  isFavorite?: boolean;
  /** Callback when user clicks on members count */
  onViewMembers?: () => void;
  /** Callback when user toggles favorite status */
  onToggleFavorite?: () => void;
  /** Callback when user clicks on channel settings */
  onSettings?: () => void;
  /** Callback when user clicks on channel info */
  onInfo?: () => void;
}

/**
 * Interface for message input
 */
export interface MessageInputData extends BaseComponentProps {
  /** Placeholder text for the input */
  placeholder?: string;
  /** Initial value for the input */
  initialValue?: string;
  /** Whether to allow file attachments */
  allowAttachments?: boolean;
  /** Whether to allow emoji reactions */
  allowEmojis?: boolean;
  /** Whether the input is in editing state */
  isEditing?: boolean;
  /** Whether the input is in reply state */
  isReply?: boolean;
  /** Message being replied to (if any) */
  replyToMessage?: Message | null;
  /** Maximum number of files that can be attached */
  maxAttachments?: number;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Callback when a message is submitted */
  onSubmit?: (text: string, attachments: File[]) => void;
  /** Callback when editing is cancelled */
  onCancel?: () => void;
  /** Callback when the user is typing */
  onTyping?: () => void;
}

/**
 * Interface for message actions
 */
export interface MessageActions {
  /** Whether to allow editing messages */
  allowEdit?: boolean;
  /** Whether to allow deleting messages */
  allowDelete?: boolean;
  /** Whether to allow replying to messages */
  allowReply?: boolean;
  /** Whether to allow reactions to messages */
  allowReactions?: boolean;
  /** Whether to allow pinning messages */
  allowPin?: boolean;
}

/**
 * Interface for user avatar props
 */
export interface UserAvatarProps extends BaseComponentProps {
  /** User information */
  user?: User;
  /** User ID (alternative to user object) */
  userId?: string;
  /** User's display name */
  displayName?: string;
  /** User's online status */
  status?: UserStatus;
  /** Size of the avatar */
  size?: SizeVariant | number;
  /** Whether to show the status indicator */
  showStatus?: boolean;
}

/**
 * Interface for emoji related props
 */
export interface EmojiData {
  /** Emoji name */
  name: string;
  /** Emoji unified code */
  unified?: string;
  /** URL to emoji image (if custom) */
  url?: string;
  /** Whether this is a custom emoji */
  isCustom?: boolean;
}

/**
 * Interface for file upload props
 */
export interface FileUploadProps extends BaseComponentProps {
  /** Maximum number of files that can be uploaded */
  maxFiles?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Accepted file types */
  accept?: string;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  /** Callback when files are selected */
  onFilesSelected?: (files: File[]) => void;
  /** Callback when a file upload starts */
  onUploadStart?: () => void;
  /** Callback when a file upload completes */
  onUploadComplete?: (fileIds: string[]) => void;
  /** Callback when a file upload fails */
  onUploadError?: (error: Error) => void;
  /** Function to handle file upload */
  onUpload?: (files: File[]) => Promise<string[] | void>;
}

/**
 * Interface for file preview props
 */
export interface FilePreviewProps extends BaseComponentProps {
  /** File to preview */
  file: File | MessageAttachment;
  /** Whether the file is uploading */
  isUploading?: boolean;
  /** Upload progress (0-100) */
  progress?: number;
  /** Callback when remove button is clicked */
  onRemove?: () => void;
}
