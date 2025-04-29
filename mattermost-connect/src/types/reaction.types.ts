/**
 * Types for reaction-related data and functions
 */
import { MessageReaction } from "./message.types";

/**
 * State for reaction store
 */
export interface ReactionState {
  reactionsByMessage: Record<string, MessageReaction[]>;
  lastFetchTimes: Record<string, number>;
}

/**
 * Emoji data
 */
export interface EmojiData {
  name: string;
  unified?: string;
  url?: string;
  isCustom?: boolean;
}

/**
 * Custom emoji information
 */
export interface CustomEmoji {
  id: string;
  name: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  creator_id: string;
}

/**
 * Parameters for adding a reaction
 */
export interface AddReactionParams {
  messageId: string;
  emoji: string;
  userId: string;
}

/**
 * Parameters for removing a reaction
 */
export interface RemoveReactionParams {
  messageId: string;
  emoji: string;
  userId: string;
}
