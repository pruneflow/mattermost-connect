// types/reaction.types.ts
/**
 * Types for reaction-related data and functions
 */

/**
 * Reaction type representing an emoji reaction to a message
 */
export interface ReactionType {
  emoji_name: string;
  user_id: string;
  post_id: string;
  create_at: number;
}

/**
 * State for reaction store
 */
export interface ReactionState {
  reactionsByMessage: Record<string, ReactionType[]>;
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
 * Reaction count by emoji
 */
export interface ReactionCount {
  emoji_name: string;
  count: number;
  userIds: string[];
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
