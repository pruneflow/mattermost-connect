// src/types/message.types.ts
/**
 * Types for Mattermost messages and posts
 */

export interface MessageAttachment {
  id: string;
  name: string;
  type?: string;
  size?: number;
  url?: string;
  link?: string;
}

export interface MessageMetadata {
  files?: MessageAttachment[];
  emojis?: string[];
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  emoji_name: string;
  user_id: string;
  post_id: string;
  create_at: number;
}

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
  // Additional properties
  props?: Record<string, unknown>;
}
