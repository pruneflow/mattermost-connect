// types/message.types.ts
/**
 * Types for message-related data and functions
 */

import { ReactionType } from "./reaction.types";

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
}

/**
 * Message metadata interface
 */
export interface MessageMetadata {
  files?: MessageAttachment[];
  emojis?: string[];
  reactions?: ReactionType[];
}

/**
 * Message interface representing a Mattermost post
 */
export interface Message {
  id: string;
  user_id: string;
  channel_id: string;
  message: string;
  create_at: number;
  update_at: number;
  delete_at?: number;
  metadata?: MessageMetadata;
  is_pinned?: boolean;
  has_reactions?: boolean;
  reply_count?: number;
  root_id?: string;
  file_ids?: string[];
  props?: Record<string, unknown>;
}

/**
 * Message pagination options
 */
export interface MessagePaginationOptions {
  page?: number;
  perPage?: number;
  since?: number;
  before?: string;
  after?: string;
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
}

/**
 * State for message store
 */
export interface MessageState {
  messagesByChannel: Record<string, Message[]>;
  threadMessages: Record<string, Message[]>;
  pinnedMessages: Record<string, Message[]>;
  highlightedMessageId: string | null;
  replyToMessage: Message | null;
  editingMessageId: string | null;
  lastFetchTimes: Record<string, number>;
}
