/**
 * Message related type definitions
 */
import { CommonState, Entity, PaginationParams } from "./common";

/**
 * Message attachment interface
 */
export interface MessageAttachment {
  id: string;
  name: string;
  type?: string;
  size?: number;
  url?: string;
  link?: string;
  width?: number;
  height?: number;
  mime_type?: string;
  download_url?: string;
  preview_url?: string;
}

/**
 * Message reaction interface
 */
export interface MessageReaction {
  emoji_name: string;
  user_id: string;
  post_id: string;
  create_at: number;
}

/**
 * Message mention interface
 */
export interface MessageMention {
  user_id: string;
  username: string;
  is_channel_mention?: boolean;
}

/**
 * Message metadata interface
 */
export interface MessageMetadata {
  files?: MessageAttachment[];
  emojis?: string[];
  reactions?: MessageReaction[];
  mentions?: MessageMention[];
  images?: {
    height: number;
    width: number;
    url: string;
  }[];
  embeds?: {
    type: string;
    url: string;
    data?: any;
  }[];
}

/**
 * Message props interface
 */
export interface MessageProps {
  mentions?: string[];
  channel_mentions?: Record<string, string>;
  images?: Record<string, any>;
  emojis?: string[];
  attachments?: any[];
  from_webhook?: boolean;
  override_username?: string;
  override_icon_url?: string;
}

/**
 * Message interface representing a Mattermost post
 */
export interface Message extends Entity {
  user_id: string;
  channel_id: string;
  message: string;
  metadata?: MessageMetadata;
  is_pinned?: boolean;
  has_reactions?: boolean;
  reply_count?: number;
  root_id?: string; // Present if message is part of a thread
  original_id?: string; // Present if message is a copy
  file_ids?: string[];
  props?: MessageProps;
  recipients?: string[]; // For direct messages
  is_following?: boolean; // For threads
}

/**
 * Message with user info
 */
export interface MessageWithUser extends Message {
  user?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
  };
}

/**
 * Thread interface
 */
export interface Thread {
  id: string; // Root message ID
  reply_count: number;
  last_reply_at: number;
  participants?: string[];
  is_following?: boolean;
  unread_replies?: number;
  unread_mentions?: number;
}

/**
 * Message pagination options
 */
export interface MessagePaginationOptions extends PaginationParams {
  forceRefresh?: boolean;
}

/**
 * Thread pagination options
 */
export interface ThreadPaginationOptions extends PaginationParams {
  rootId: string;
  forceRefresh?: boolean;
}

/**
 * Message editing options
 */
export interface EditMessageParams {
  messageId: string;
  message: string;
  fileIds?: string[];
}

/**
 * Send message parameters
 */
export interface SendMessageParams {
  channelId: string;
  message: string;
  fileIds?: string[];
  rootId?: string;
  metadata?: Partial<MessageMetadata>;
  props?: MessageProps;
}

/**
 * Reaction count by emoji
 */
export interface ReactionCount {
  emoji_name: string;
  count: number;
  userIds: string[];
}

/**
 * Message state
 */
export interface MessageState extends CommonState {
  messagesByChannel: Record<string, Message[]>;
  threadMessages: Record<string, Message[]>;
  pinnedMessages: Record<string, Message[]>;
  highlightedMessageId: string | null;
  replyToMessage: Message | null;
  editingMessageId: string | null;
}

export interface MessageStore {
  // Message-specific loading states
  loadingChannelIds: string[];
  threadLoadingIds: string[];

  // Actions - Messages
  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  deleteMessage: (messageId: string, channelId: string) => void;

  // Actions - Threads
  setThreadMessages: (rootMessageId: string, messages: Message[]) => void;
  addThreadMessage: (rootMessageId: string, message: Message) => void;

  // Actions - Pinned Messages
  setPinnedMessages: (channelId: string, messages: Message[]) => void;
  addPinnedMessage: (message: Message) => void;
  removePinnedMessage: (messageId: string, channelId: string) => void;

  // Actions - Reactions
  addReaction: (messageId: string, userId: string, emoji: string) => void;
  removeReaction: (messageId: string, userId: string, emoji: string) => void;

  // Actions - UI State
  setHighlightedMessage: (messageId: string | null) => void;
  setReplyToMessage: (message: Message | null) => void;
  setEditingMessage: (messageId: string | null) => void;

  // Actions - Loading State
  setLoading: (channelId: string, isLoading: boolean) => void;
  setThreadLoading: (rootMessageId: string, isLoading: boolean) => void;
  setError: (channelId: string, error: Error | null) => void;

  // Selectors
  getMessageById: (messageId: string) => Message | null;
  getChannelMessages: (channelId: string) => Message[];
  getThreadMessages: (rootMessageId: string) => Message[];
  getPinnedMessages: (channelId: string) => Message[];
  getMessageReactions: (messageId: string) => MessageReaction[];
  getReactionsByEmoji: (messageId: string) => Record<string, MessageReaction[]>;
  getReactionCounts: (messageId: string) => ReactionCount[];
  hasUserReacted: (messageId: string, userId: string, emoji: string) => boolean;
  isChannelLoading: (channelId: string) => boolean;
  isThreadLoading: (rootMessageId: string) => boolean;

  // Reset
  reset: () => void;
}
