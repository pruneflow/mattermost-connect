// src/core/store/reactionStore.ts
import { create } from "zustand";
import { MessageReaction } from "./messageStore";

interface ReactionState {
  reactionsByMessage: Record<string, MessageReaction[]>;
}

export const useReactionStore = create<
  ReactionState & {
    addReaction: (messageId: string, userId: string, emoji: string) => void;
    removeReaction: (messageId: string, userId: string, emoji: string) => void;
    setReactions: (messageId: string, reactions: MessageReaction[]) => void;
    getReactions: (messageId: string) => MessageReaction[];
    hasUserReacted: (
      messageId: string,
      userId: string,
      emoji: string,
    ) => boolean;
    reset: () => void;
  }
>((set, get) => ({
  reactionsByMessage: {},

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

      // Add the new reaction
      const newReaction: MessageReaction = {
        emoji_name: emoji,
        user_id: userId,
        post_id: messageId,
        create_at: Date.now(),
      };

      return {
        reactionsByMessage: {
          ...state.reactionsByMessage,
          [messageId]: [...existingReactions, newReaction],
        },
      };
    });
  },

  removeReaction: (messageId: string, userId: string, emoji: string) => {
    set((state) => {
      const existingReactions = state.reactionsByMessage[messageId];

      if (!existingReactions) {
        return state;
      }

      // Filter out the specific reaction
      const updatedReactions = existingReactions.filter(
        (r) => !(r.emoji_name === emoji && r.user_id === userId),
      );

      return {
        reactionsByMessage: {
          ...state.reactionsByMessage,
          [messageId]: updatedReactions,
        },
      };
    });
  },

  setReactions: (messageId: string, reactions: MessageReaction[]) => {
    set((state) => ({
      reactionsByMessage: {
        ...state.reactionsByMessage,
        [messageId]: reactions,
      },
    }));
  },

  getReactions: (messageId: string) => {
    return get().reactionsByMessage[messageId] || [];
  },

  hasUserReacted: (messageId: string, userId: string, emoji: string) => {
    const reactions = get().reactionsByMessage[messageId] || [];
    return reactions.some(
      (r) => r.emoji_name === emoji && r.user_id === userId,
    );
  },

  reset: () => {
    set({ reactionsByMessage: {} });
  },
}));
