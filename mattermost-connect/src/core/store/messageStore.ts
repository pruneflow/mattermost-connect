// src/core/store/messageStore.ts
/**
 * Message store
 * Manages message data, threads, reactions, and related states
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  Message,
  MessageReaction,
  ReactionCount,
  ErrorSource,
  MessageState,
} from "../../types";
import { handleError } from "./errorStore";
import { messageService } from "../services/messageService";
import { createLoadingSlice } from "./storeUtils";
import { subscribeWithSelector } from "zustand/middleware";

/**
 * Enhanced message store state with actions
 */
interface MessageStoreState extends MessageState {
  // Fields not in base state
  loadingChannelIds: string[];
  threadLoadingIds: string[];
  errors: Record<string, Error | null>;

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

  // Actions - Reactions (integrated from reactionStore)
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

/**
 * Message store for managing message data using immer middleware
 * and subscribeWithSelector for observing state changes
 */
export const useMessageStore = create<MessageStoreState>()(
  subscribeWithSelector(
    immer((set, get) => {
      // Create loading/error slice
      const loadingSlice = createLoadingSlice(set);

      return {
        // Initial state
        messagesByChannel: {},
        threadMessages: {},
        pinnedMessages: {},
        highlightedMessageId: null,
        replyToMessage: null,
        editingMessageId: null,
        loadingChannelIds: [],
        threadLoadingIds: [],
        errors: {},
        lastFetchTimes: {},

        // Include loading state from loading slice
        isLoading: loadingSlice.isLoading,
        loadingIds: loadingSlice.loadingIds,
        error: loadingSlice.error,
        setLoading: loadingSlice.setLoading,
        setError: loadingSlice.setError,

        /**
         * Sets all messages for a channel
         * @param channelId Channel ID
         * @param messages List of messages
         */
        setMessages: (channelId: string, messages: Message[]) => {
          set((state) => {
            state.messagesByChannel[channelId] = messages;
            state.loadingChannelIds = state.loadingChannelIds.filter(
              (id: string) => id !== channelId,
            );
            state.errors[channelId] = null;
            state.lastFetchTimes[channelId] = Date.now();
          });
        },

        /**
         * Adds a single message to the store
         * @param message Message to add
         */
        addMessage: (message: Message) => {
          set((state) => {
            const channelId = message.channel_id;
            const rootId = message.root_id;

            // Add to thread if it's a reply
            if (rootId) {
              if (!state.threadMessages[rootId]) {
                state.threadMessages[rootId] = [];
              }

              // Check if message already exists
              const existingThreadMsgIndex = state.threadMessages[
                rootId
              ].findIndex((m: Message) => m.id === message.id);

              if (existingThreadMsgIndex !== -1) {
                // Update existing message
                state.threadMessages[rootId][existingThreadMsgIndex] = message;
              } else {
                // Add new message
                state.threadMessages[rootId].push(message);
              }
            }

            // Add to channel messages
            if (!state.messagesByChannel[channelId]) {
              state.messagesByChannel[channelId] = [];
            }

            // Check if message already exists
            const existingMsgIndex = state.messagesByChannel[
              channelId
            ].findIndex((m: Message) => m.id === message.id);

            if (existingMsgIndex !== -1) {
              // Update existing message
              state.messagesByChannel[channelId][existingMsgIndex] = message;
            } else {
              // Add new message
              state.messagesByChannel[channelId].push(message);
            }

            // Add to pinned messages if applicable
            if (message.is_pinned) {
              if (!state.pinnedMessages[channelId]) {
                state.pinnedMessages[channelId] = [];
              }

              if (
                !state.pinnedMessages[channelId].some(
                  (m: Message) => m.id === message.id,
                )
              ) {
                state.pinnedMessages[channelId].push(message);
              }
            }
          });
        },

        /**
         * Updates an existing message
         * @param message Updated message
         */
        updateMessage: (message: Message) => {
          set((state) => {
            const channelId = message.channel_id;
            const rootId = message.root_id;

            // Update in channel messages
            if (state.messagesByChannel[channelId]) {
              const msgIndex = state.messagesByChannel[channelId].findIndex(
                (m: Message) => m.id === message.id,
              );

              if (msgIndex !== -1) {
                state.messagesByChannel[channelId][msgIndex] = message;
              }
            }

            // Update in thread if it's a reply
            if (rootId && state.threadMessages[rootId]) {
              const threadMsgIndex = state.threadMessages[rootId].findIndex(
                (m: Message) => m.id === message.id,
              );

              if (threadMsgIndex !== -1) {
                state.threadMessages[rootId][threadMsgIndex] = message;
              }
            }

            // Update in pinned messages
            if (state.pinnedMessages[channelId]) {
              const pinnedMsgIndex = state.pinnedMessages[channelId].findIndex(
                (m: Message) => m.id === message.id,
              );

              if (message.is_pinned && pinnedMsgIndex === -1) {
                // Add to pinned messages
                state.pinnedMessages[channelId].push(message);
              } else if (!message.is_pinned && pinnedMsgIndex !== -1) {
                // Remove from pinned messages
                state.pinnedMessages[channelId].splice(pinnedMsgIndex, 1);
              } else if (pinnedMsgIndex !== -1) {
                // Update existing pinned message
                state.pinnedMessages[channelId][pinnedMsgIndex] = message;
              }
            }

            // Clear editing if necessary
            if (state.editingMessageId === message.id) {
              state.editingMessageId = null;
            }
          });
        },

        /**
         * Deletes a message
         * @param messageId Message ID to delete
         * @param channelId Channel ID
         */
        deleteMessage: (messageId: string, channelId: string) => {
          set((state) => {
            // Get the message to determine if it's a thread message
            let message: Message | undefined;

            // Remove from channel messages
            if (state.messagesByChannel[channelId]) {
              message = state.messagesByChannel[channelId].find(
                (m: Message) => m.id === messageId,
              );
              state.messagesByChannel[channelId] = state.messagesByChannel[
                channelId
              ].filter((m: Message) => m.id !== messageId);
            }

            // Remove from thread messages if it's a reply
            if (message?.root_id && state.threadMessages[message.root_id]) {
              state.threadMessages[message.root_id] = state.threadMessages[
                message.root_id
              ].filter((m: Message) => m.id !== messageId);
            }

            // Remove thread messages if it's a root message
            if (state.threadMessages[messageId]) {
              delete state.threadMessages[messageId];
            }

            // Remove from pinned messages
            if (state.pinnedMessages[channelId]) {
              state.pinnedMessages[channelId] = state.pinnedMessages[
                channelId
              ].filter((m: Message) => m.id !== messageId);
            }

            // Clear other message-related states
            if (state.highlightedMessageId === messageId) {
              state.highlightedMessageId = null;
            }

            if (state.replyToMessage?.id === messageId) {
              state.replyToMessage = null;
            }

            if (state.editingMessageId === messageId) {
              state.editingMessageId = null;
            }
          });
        },

        /**
         * Sets thread messages for a root message
         * @param rootMessageId Root message ID
         * @param messages Thread messages
         */
        setThreadMessages: (rootMessageId: string, messages: Message[]) => {
          set((state) => {
            state.threadMessages[rootMessageId] = messages;
            state.threadLoadingIds = state.threadLoadingIds.filter(
              (id: string) => id !== rootMessageId,
            );
            state.lastFetchTimes[`thread_${rootMessageId}`] = Date.now();
          });
        },

        /**
         * Adds a message to a thread
         * @param rootMessageId Root message ID
         * @param message Thread message
         */
        addThreadMessage: (rootMessageId: string, message: Message) => {
          set((state) => {
            if (!state.threadMessages[rootMessageId]) {
              state.threadMessages[rootMessageId] = [];
            }

            // Check if message already exists
            const messageIndex = state.threadMessages[rootMessageId].findIndex(
              (m: Message) => m.id === message.id,
            );

            if (messageIndex !== -1) {
              // Update existing message
              state.threadMessages[rootMessageId][messageIndex] = message;
            } else {
              // Add new message
              state.threadMessages[rootMessageId].push(message);
            }
          });
        },

        /**
         * Sets pinned messages for a channel
         * @param channelId Channel ID
         * @param messages Pinned messages
         */
        setPinnedMessages: (channelId: string, messages: Message[]) => {
          set((state) => {
            state.pinnedMessages[channelId] = messages;
            state.lastFetchTimes[`pinned_${channelId}`] = Date.now();
          });
        },

        /**
         * Adds a message to pinned messages
         * @param message Pinned message
         */
        addPinnedMessage: (message: Message) => {
          if (!message.is_pinned) return;

          set((state) => {
            const channelId = message.channel_id;

            if (!state.pinnedMessages[channelId]) {
              state.pinnedMessages[channelId] = [];
            }

            // Only add if not already present
            if (
              !state.pinnedMessages[channelId].some(
                (m: Message) => m.id === message.id,
              )
            ) {
              state.pinnedMessages[channelId].push(message);
            }
          });
        },

        /**
         * Removes a message from pinned messages
         * @param messageId Message ID
         * @param channelId Channel ID
         */
        removePinnedMessage: (messageId: string, channelId: string) => {
          set((state) => {
            if (state.pinnedMessages[channelId]) {
              state.pinnedMessages[channelId] = state.pinnedMessages[
                channelId
              ].filter((m: Message) => m.id !== messageId);
            }
          });
        },

        /**
         * Adds a reaction to a message
         * @param messageId Message ID
         * @param userId User ID who reacted
         * @param emoji Emoji name
         */
        addReaction: (messageId: string, userId: string, emoji: string) => {
          set((state) => {
            // Helper function to find and update a message with a reaction
            const updateMessageWithReaction = (message: Message): boolean => {
              // Initialize metadata and reactions if needed
              if (!message.metadata) {
                message.metadata = {};
              }

              if (!message.metadata.reactions) {
                message.metadata.reactions = [];
              }

              // Check if reaction already exists
              const existingReaction = message.metadata.reactions.find(
                (r: MessageReaction) =>
                  r.emoji_name === emoji && r.user_id === userId,
              );

              if (!existingReaction) {
                // Create new reaction
                const reaction = messageService.createReaction(
                  messageId,
                  userId,
                  emoji,
                );
                message.metadata.reactions.push(reaction);
                message.has_reactions = true;
                return true;
              }

              return false;
            };

            // Process channel messages
            for (const channelId in state.messagesByChannel) {
              const channelMessages = state.messagesByChannel[channelId];
              const messageIndex = channelMessages.findIndex(
                (m: Message) => m.id === messageId,
              );

              if (messageIndex !== -1) {
                updateMessageWithReaction(channelMessages[messageIndex]);
              }
            }

            // Process thread messages
            for (const rootId in state.threadMessages) {
              const threadMessages = state.threadMessages[rootId];
              const messageIndex = threadMessages.findIndex(
                (m: Message) => m.id === messageId,
              );

              if (messageIndex !== -1) {
                updateMessageWithReaction(threadMessages[messageIndex]);
              }
            }

            // Process pinned messages
            for (const channelId in state.pinnedMessages) {
              const pinnedMessages = state.pinnedMessages[channelId];
              const messageIndex = pinnedMessages.findIndex(
                (m: Message) => m.id === messageId,
              );

              if (messageIndex !== -1) {
                updateMessageWithReaction(pinnedMessages[messageIndex]);
              }
            }
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
            // Helper function to find and update a message to remove a reaction
            const updateMessageToRemoveReaction = (
              message: Message,
            ): boolean => {
              // Skip if no reactions
              if (!message.metadata?.reactions) return false;

              // Filter out the specific reaction
              message.metadata.reactions = message.metadata.reactions.filter(
                (r: MessageReaction) =>
                  !(r.emoji_name === emoji && r.user_id === userId),
              );

              // Update has_reactions flag
              message.has_reactions = message.metadata.reactions.length > 0;

              return true;
            };

            // Process channel messages
            for (const channelId in state.messagesByChannel) {
              const channelMessages = state.messagesByChannel[channelId];
              const messageIndex = channelMessages.findIndex(
                (m: Message) => m.id === messageId,
              );

              if (messageIndex !== -1) {
                updateMessageToRemoveReaction(channelMessages[messageIndex]);
              }
            }

            // Process thread messages
            for (const rootId in state.threadMessages) {
              const threadMessages = state.threadMessages[rootId];
              const messageIndex = threadMessages.findIndex(
                (m: Message) => m.id === messageId,
              );

              if (messageIndex !== -1) {
                updateMessageToRemoveReaction(threadMessages[messageIndex]);
              }
            }

            // Process pinned messages
            for (const channelId in state.pinnedMessages) {
              const pinnedMessages = state.pinnedMessages[channelId];
              const messageIndex = pinnedMessages.findIndex(
                (m: Message) => m.id === messageId,
              );

              if (messageIndex !== -1) {
                updateMessageToRemoveReaction(pinnedMessages[messageIndex]);
              }
            }
          });
        },

        /**
         * Sets the highlighted message
         * @param messageId Message ID to highlight
         */
        setHighlightedMessage: (messageId: string | null) => {
          set((state) => {
            state.highlightedMessageId = messageId;
          });
        },

        /**
         * Sets the message being replied to
         * @param message Message to reply to
         */
        setReplyToMessage: (message: Message | null) => {
          set((state) => {
            state.replyToMessage = message;
          });
        },

        /**
         * Sets the message being edited
         * @param messageId Message ID to edit
         */
        setEditingMessage: (messageId: string | null) => {
          set((state) => {
            state.editingMessageId = messageId;
          });
        },

        /**
         * Sets the loading state for a thread
         * @param rootMessageId Root message ID
         * @param isLoading Whether thread is loading
         */
        setThreadLoading: (rootMessageId: string, isLoading: boolean) => {
          set((state) => {
            if (isLoading) {
              if (!state.threadLoadingIds.includes(rootMessageId)) {
                state.threadLoadingIds.push(rootMessageId);
              }
            } else {
              state.threadLoadingIds = state.threadLoadingIds.filter(
                (id: string) => id !== rootMessageId,
              );
            }
          });
        },

        /**
         * Gets a message by ID
         * @param messageId Message ID
         * @returns Message or null if not found
         */
        getMessageById: (messageId: string): Message | null => {
          const { messagesByChannel, threadMessages } = get();

          // Search in channel messages
          for (const channelId in messagesByChannel) {
            const message = messagesByChannel[channelId].find(
              (m: Message) => m.id === messageId,
            );
            if (message) return message;
          }

          // Search in thread messages
          for (const rootId in threadMessages) {
            const message = threadMessages[rootId].find(
              (m: Message) => m.id === messageId,
            );
            if (message) return message;
          }

          return null;
        },

        /**
         * Gets all messages for a channel
         * @param channelId Channel ID
         * @returns Channel messages
         */
        getChannelMessages: (channelId: string): Message[] => {
          return get().messagesByChannel[channelId] || [];
        },

        /**
         * Gets thread messages for a root message
         * @param rootMessageId Root message ID
         * @returns Thread messages
         */
        getThreadMessages: (rootMessageId: string): Message[] => {
          return get().threadMessages[rootMessageId] || [];
        },

        /**
         * Gets pinned messages for a channel
         * @param channelId Channel ID
         * @returns Pinned messages
         */
        getPinnedMessages: (channelId: string): Message[] => {
          return get().pinnedMessages[channelId] || [];
        },

        /**
         * Gets all reactions for a message
         * @param messageId Message ID
         * @returns Array of reactions
         */
        getMessageReactions: (messageId: string): MessageReaction[] => {
          const message = get().getMessageById(messageId);
          return message?.metadata?.reactions || [];
        },

        /**
         * Gets reactions for a message grouped by emoji
         * @param messageId Message ID
         * @returns Record of emoji names to reactions
         */
        getReactionsByEmoji: (
          messageId: string,
        ): Record<string, MessageReaction[]> => {
          const reactions = get().getMessageReactions(messageId);
          return messageService.getReactionsByEmoji({
            metadata: { reactions },
          } as Message);
        },

        /**
         * Gets reaction counts grouped by emoji
         * @param messageId Message ID
         * @returns List of emoji count objects
         */
        getReactionCounts: (messageId: string): ReactionCount[] => {
          const message = get().getMessageById(messageId);
          if (!message) return [];
          return messageService.getReactionCounts(message);
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
          const message = get().getMessageById(messageId);
          if (!message) return false;
          return messageService.hasUserReacted(message, userId, emoji);
        },

        /**
         * Checks if messages for a channel are loading
         * @param channelId Channel ID
         * @returns Whether channel is loading
         */
        isChannelLoading: (channelId: string): boolean => {
          return get().loadingChannelIds.includes(channelId);
        },

        /**
         * Checks if messages for a thread are loading
         * @param rootMessageId Root message ID
         * @returns Whether thread is loading
         */
        isThreadLoading: (rootMessageId: string): boolean => {
          return get().threadLoadingIds.includes(rootMessageId);
        },

        /**
         * Resets the store to initial state
         */
        reset: () => {
          set((state) => {
            state.messagesByChannel = {};
            state.threadMessages = {};
            state.pinnedMessages = {};
            state.highlightedMessageId = null;
            state.replyToMessage = null;
            state.editingMessageId = null;
            state.loadingChannelIds = [];
            state.threadLoadingIds = [];
            state.errors = {};
            state.lastFetchTimes = {};
            state.isLoading = false;
            state.loadingIds = [];
            state.error = null;
          });
        },
      };
    }),
  ),
);

/**
 * Gets sorted messages for a channel
 * @param channelId Channel ID
 * @returns Sorted messages
 */
export function getSortedChannelMessages(channelId: string): Message[] {
  const messages = useMessageStore.getState().getChannelMessages(channelId);
  return messageService.sortMessages(messages);
}

/**
 * Gets sorted messages for a thread
 * @param rootMessageId Root message ID
 * @returns Sorted thread messages
 */
export function getSortedThreadMessages(rootMessageId: string): Message[] {
  const messages = useMessageStore.getState().getThreadMessages(rootMessageId);
  return messageService.sortMessages(messages);
}
