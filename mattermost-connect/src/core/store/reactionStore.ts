// src/core/store/reactionStore.ts
/**
 * Reaction store
 * Manages emoji reactions for messages
 */
import { create } from "zustand";
import {
  ReactionState,
  ReactionType,
  ReactionCount,
  EmojiData,
} from "../../types/reaction.types";
import { emitEvent } from "./eventStore";
import { EventType } from "../../types/event.types";

/**
 * Reaction store state and actions
 */
interface ReactionStoreState extends ReactionState {
  // Actions
  addReaction: (messageId: string, userId: string, emoji: string) => void;
  removeReaction: (messageId: string, userId: string, emoji: string) => void;
  setReactions: (messageId: string, reactions: ReactionType[]) => void;

  // Selectors
  getReactions: (messageId: string) => ReactionType[];
  getReactionsByEmoji: (messageId: string) => Record<string, ReactionType[]>;
  getReactionCounts: (messageId: string) => ReactionCount[];
  hasUserReacted: (messageId: string, userId: string, emoji: string) => boolean;

  // Reset
  reset: () => void;
}

/**
 * Reaction store for managing emoji reactions
 */
export const useReactionStore = create<ReactionStoreState>()((set, get) => ({
  // Initial state
  reactionsByMessage: {},
  lastFetchTimes: {},

  /**
   * Adds a reaction to a message
   * @param messageId Message ID
   * @param userId User ID who reacted
   * @param emoji Emoji name
   */
  addReaction: (messageId: string, userId: string, emoji: string) => {
    set((state) => {
      const existingReactions = state.reactionsByMessage[messageId] || [];

      // Check if reaction already exists
      const reactionExists = existingReactions.some(
        (r) => r.emoji_name === emoji && r.user_id === userId,
      );

      if (reactionExists) {
        return state;
      }

      // Create new reaction
      const newReaction: ReactionType = {
        emoji_name: emoji,
        user_id: userId,
        post_id: messageId,
        create_at: Date.now(),
      };

      // Emit reaction added event
      emitEvent(EventType.REACTION_ADDED, {
        reaction: newReaction,
      });

      return {
        reactionsByMessage: {
          ...state.reactionsByMessage,
          [messageId]: [...existingReactions, newReaction],
        },
        lastFetchTimes: {
          ...state.lastFetchTimes,
          [messageId]: Date.now(),
        },
      };
    });
  },

  /**
   * Removes a reaction from a message
   * @param messageId Message ID
   * @param userId User ID who reacted
   * @param emoji Emoji name
   */
  removeReaction: (messageId: string, userId: string, emoji: string) => {
    set((state) => {
      const existingReactions = state.reactionsByMessage[messageId];

      if (!existingReactions) {
        return state;
      }

      // Find the reaction to remove
      const reactionToRemove = existingReactions.find(
        (r) => r.emoji_name === emoji && r.user_id === userId,
      );

      // Filter out the specific reaction
      const updatedReactions = existingReactions.filter(
        (r) => !(r.emoji_name === emoji && r.user_id === userId),
      );

      // Emit reaction removed event if reaction was found
      if (reactionToRemove) {
        emitEvent(EventType.REACTION_REMOVED, {
          reaction: reactionToRemove,
        });
      }

      return {
        reactionsByMessage: {
          ...state.reactionsByMessage,
          [messageId]: updatedReactions,
        },
        lastFetchTimes: {
          ...state.lastFetchTimes,
          [messageId]: Date.now(),
        },
      };
    });
  },

  /**
   * Sets all reactions for a message
   * @param messageId Message ID
   * @param reactions List of reactions
   */
  setReactions: (messageId: string, reactions: ReactionType[]) => {
    set((state) => ({
      reactionsByMessage: {
        ...state.reactionsByMessage,
        [messageId]: reactions,
      },
      lastFetchTimes: {
        ...state.lastFetchTimes,
        [messageId]: Date.now(),
      },
    }));
  },

  /**
   * Gets all reactions for a message
   * @param messageId Message ID
   * @returns List of reactions
   */
  getReactions: (messageId: string): ReactionType[] => {
    return get().reactionsByMessage[messageId] || [];
  },

  /**
   * Gets reactions for a message grouped by emoji
   * @param messageId Message ID
   * @returns Record of emoji names to reactions
   */
  getReactionsByEmoji: (messageId: string): Record<string, ReactionType[]> => {
    const reactions = get().getReactions(messageId);
    const groupedReactions: Record<string, ReactionType[]> = {};

    reactions.forEach((reaction) => {
      const emoji = reaction.emoji_name;
      if (!groupedReactions[emoji]) {
        groupedReactions[emoji] = [];
      }

      groupedReactions[emoji].push(reaction);
    });

    return groupedReactions;
  },

  /**
   * Gets reaction counts grouped by emoji
   * @param messageId Message ID
   * @returns List of emoji count objects
   */
  getReactionCounts: (messageId: string): ReactionCount[] => {
    const groupedReactions = get().getReactionsByEmoji(messageId);

    return Object.entries(groupedReactions).map(([emoji, reactions]) => ({
      emoji_name: emoji,
      count: reactions.length,
      userIds: reactions.map((r) => r.user_id),
    }));
  },

  /**
   * Checks if a user has reacted with a specific emoji
   * @param messageId Message ID
   * @param userId User ID
   * @param emoji Emoji name
   * @returns Whether user has reacted
   */
  hasUserReacted: (
    messageId: string,
    userId: string,
    emoji: string,
  ): boolean => {
    const reactions = get().getReactions(messageId);

    return reactions.some(
      (r) => r.emoji_name === emoji && r.user_id === userId,
    );
  },

  /**
   * Resets the store to initial state
   */
  reset: () => {
    set({
      reactionsByMessage: {},
      lastFetchTimes: {},
    });
  },
}));
