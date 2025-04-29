// src/core/store/messageStore.ts
/**
 * Message store
 * Manages message data, threads, reactions, and related states
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import {
  Message,
  MessageReaction,
  ReactionCount,
  MessageState,
  ErrorSource,
  EventType,
} from "../../types";
import { messageService } from "../services/messageService";
import { createCommonSlice } from "./slices/commonSlice";
import { emitEvent } from "../api/eventUtils";
import { handleError } from "./errorStore";

/**
 * Message store implementation with Zustand
 * Uses immer middleware for immutable state updates
 * Uses subscribeWithSelector for observing state changes
 */
export const useMessageStore = create<
  MessageState & {
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
    getReactionsByEmoji: (
      messageId: string,
    ) => Record<string, MessageReaction[]>;
    getReactionCounts: (messageId: string) => ReactionCount[];
    hasUserReacted: (
      messageId: string,
      userId: string,
      emoji: string,
    ) => boolean;
    isChannelLoading: (channelId: string) => boolean;
    isThreadLoading: (rootMessageId: string) => boolean;

    // Reset
    reset: () => void;
  }
>()(
  subscribeWithSelector(
    immer((set, get) => {
      // Create common slice for standardized loading/error state
      const commonSlice = createCommonSlice<MessageState>(set);

      return {
        // Include common slice for standardized state
        ...commonSlice,

        // Initial state
        messagesByChannel: {},
        threadMessages: {},
        pinnedMessages: {},
        highlightedMessageId: null,
        replyToMessage: null,
        editingMessageId: null,
        loadingChannelIds: [],
        threadLoadingIds: [],

        /**
         * Sets global loading state for channel messages
         * @param channelId Channel ID
         * @param isLoading Whether channel is loading
         */
        setLoading: (channelId: string, isLoading: boolean) => {
          try {
            set((state) => {
              if (isLoading) {
                if (!state.loadingChannelIds.includes(channelId)) {
                  state.loadingChannelIds.push(channelId);
                }
                // Update global loading state
                state.isLoading = true;
              } else {
                state.loadingChannelIds = state.loadingChannelIds.filter(
                  (id: string) => id !== channelId,
                );
                // Global state is false only if no channels are loading
                state.isLoading = state.loadingChannelIds.length > 0;
              }

              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setLoading",
              channelId,
              isLoading,
            });
          }
        },

        /**
         * Sets error state for a channel
         * @param channelId Channel ID
         * @param error Error object or null
         */
        setError: (channelId: string, error: Error | null) => {
          try {
            set((state) => {
              if (error) {
                state.errors[channelId] = error;
                state.error = error;
              } else {
                delete state.errors[channelId];

                // Clear global error if it was from this channel
                if (state.error && state.errors[channelId] === state.error) {
                  state.error = null;
                }
              }

              state.lastUpdated = Date.now();
            });
          } catch (e) {
            // Don't use handleError here to avoid potential loops
            console.error("Error in setError:", e);
          }
        },

        /**
         * Sets all messages for a channel
         * @param channelId Channel ID
         * @param messages List of messages
         */
        setMessages: (channelId: string, messages: Message[]) => {
          try {
            set((state) => {
              state.messagesByChannel[channelId] = messages;
              state.loadingChannelIds = state.loadingChannelIds.filter(
                (id: string) => id !== channelId,
              );
              state.lastFetchTimes[channelId] = Date.now();
              state.lastUpdated = Date.now();

              if (state.errors[channelId]) {
                delete state.errors[channelId];
              }
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setMessages",
              channelId,
              messageCount: messages.length,
            });
          }
        },

        /**
         * Adds a single message to the store
         * @param message Message to add
         */
        addMessage: (message: Message) => {
          try {
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
                  state.threadMessages[rootId][existingThreadMsgIndex] =
                    message;
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

                // Emit message received event
                messageService.notifyMessageEvent(message, "received");
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

              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "addMessage",
              messageId: message.id,
              channelId: message.channel_id,
            });
          }
        },

        /**
         * Updates an existing message
         * @param message Updated message
         */
        updateMessage: (message: Message) => {
          try {
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
                const pinnedMsgIndex = state.pinnedMessages[
                  channelId
                ].findIndex((m: Message) => m.id === message.id);

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

              state.lastUpdated = Date.now();

              // Emit message updated event
              messageService.notifyMessageEvent(message, "updated");
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "updateMessage",
              messageId: message.id,
              channelId: message.channel_id,
            });
          }
        },

        /**
         * Deletes a message
         * @param messageId Message ID to delete
         * @param channelId Channel ID
         */
        deleteMessage: (messageId: string, channelId: string) => {
          try {
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

              state.lastUpdated = Date.now();

              // Emit message deleted event if message was found
              if (message) {
                messageService.notifyMessageEvent(message, "deleted");
              }
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "deleteMessage",
              messageId,
              channelId,
            });
          }
        },

        /**
         * Sets thread messages for a root message
         * @param rootMessageId Root message ID
         * @param messages Thread messages
         */
        setThreadMessages: (rootMessageId: string, messages: Message[]) => {
          try {
            set((state) => {
              state.threadMessages[rootMessageId] = messages;
              state.threadLoadingIds = state.threadLoadingIds.filter(
                (id: string) => id !== rootMessageId,
              );
              state.lastFetchTimes[`thread_${rootMessageId}`] = Date.now();
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setThreadMessages",
              rootMessageId,
              messageCount: messages.length,
            });
          }
        },

        /**
         * Sets the loading state for a thread
         * @param rootMessageId Root message ID
         * @param isLoading Whether thread is loading
         */
        setThreadLoading: (rootMessageId: string, isLoading: boolean) => {
          try {
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

              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setThreadLoading",
              rootMessageId,
              isLoading,
            });
          }
        },

        /**
         * Adds a message to a thread
         * @param rootMessageId Root message ID
         * @param message Thread message
         */
        addThreadMessage: (rootMessageId: string, message: Message) => {
          try {
            set((state) => {
              if (!state.threadMessages[rootMessageId]) {
                state.threadMessages[rootMessageId] = [];
              }

              // Check if message already exists
              const messageIndex = state.threadMessages[
                rootMessageId
              ].findIndex((m: Message) => m.id === message.id);

              if (messageIndex !== -1) {
                // Update existing message
                state.threadMessages[rootMessageId][messageIndex] = message;
              } else {
                // Add new message
                state.threadMessages[rootMessageId].push(message);
              }

              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "addThreadMessage",
              rootMessageId,
              messageId: message.id,
            });
          }
        },

        /**
         * Sets pinned messages for a channel
         * @param channelId Channel ID
         * @param messages Pinned messages
         */
        setPinnedMessages: (channelId: string, messages: Message[]) => {
          try {
            set((state) => {
              state.pinnedMessages[channelId] = messages;
              state.lastFetchTimes[`pinned_${channelId}`] = Date.now();
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setPinnedMessages",
              channelId,
              messageCount: messages.length,
            });
          }
        },

        /**
         * Adds a message to pinned messages
         * @param message Pinned message
         */
        addPinnedMessage: (message: Message) => {
          try {
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
                state.lastUpdated = Date.now();
              }
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "addPinnedMessage",
              messageId: message.id,
              channelId: message.channel_id,
            });
          }
        },

        /**
         * Removes a message from pinned messages
         * @param messageId Message ID
         * @param channelId Channel ID
         */
        removePinnedMessage: (messageId: string, channelId: string) => {
          try {
            set((state) => {
              if (state.pinnedMessages[channelId]) {
                state.pinnedMessages[channelId] = state.pinnedMessages[
                  channelId
                ].filter((m: Message) => m.id !== messageId);
                state.lastUpdated = Date.now();
              }
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "removePinnedMessage",
              messageId,
              channelId,
            });
          }
        },

        /**
         * Adds a reaction to a message
         * @param messageId Message ID
         * @param userId User ID who reacted
         * @param emoji Emoji name
         */
        addReaction: (messageId: string, userId: string, emoji: string) => {
          try {
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

              state.lastUpdated = Date.now();

              // Emit reaction added event
              emitEvent(EventType.REACTION_ADDED, {
                messageId,
                userId,
                emoji,
                timestamp: Date.now(),
              });
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "addReaction",
              messageId,
              userId,
              emoji,
            });
          }
        },

        /**
         * Removes a reaction from a message
         * @param messageId Message ID
         * @param userId User ID who reacted
         * @param emoji Emoji name
         */
        removeReaction: (messageId: string, userId: string, emoji: string) => {
          try {
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

              state.lastUpdated = Date.now();

              // Emit reaction removed event
              emitEvent(EventType.REACTION_REMOVED, {
                messageId,
                userId,
                emoji,
                timestamp: Date.now(),
              });
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "removeReaction",
              messageId,
              userId,
              emoji,
            });
          }
        },

        /**
         * Sets the highlighted message
         * @param messageId Message ID to highlight
         */
        setHighlightedMessage: (messageId: string | null) => {
          try {
            set((state) => {
              state.highlightedMessageId = messageId;
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setHighlightedMessage",
              messageId,
            });
          }
        },

        /**
         * Sets the message being replied to
         * @param message Message to reply to
         */
        setReplyToMessage: (message: Message | null) => {
          try {
            set((state) => {
              state.replyToMessage = message;
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setReplyToMessage",
              messageId: message?.id,
            });
          }
        },

        /**
         * Sets the message being edited
         * @param messageId Message ID to edit
         */
        setEditingMessage: (messageId: string | null) => {
          try {
            set((state) => {
              state.editingMessageId = messageId;
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setEditingMessage",
              messageId,
            });
          }
        },

        /**
         * Gets a message by ID
         * @param messageId Message ID
         * @returns Message or null if not found
         */
        getMessageById: (messageId: string): Message | null => {
          try {
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
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getMessageById",
              messageId,
            });
            return null;
          }
        },

        /**
         * Gets all messages for a channel
         * @param channelId Channel ID
         * @returns Channel messages
         */
        getChannelMessages: (channelId: string): Message[] => {
          try {
            return get().messagesByChannel[channelId] || [];
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getChannelMessages",
              channelId,
            });
            return [];
          }
        },

        /**
         * Gets thread messages for a root message
         * @param rootMessageId Root message ID
         * @returns Thread messages
         */
        getThreadMessages: (rootMessageId: string): Message[] => {
          try {
            return get().threadMessages[rootMessageId] || [];
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getThreadMessages",
              rootMessageId,
            });
            return [];
          }
        },

        /**
         * Gets pinned messages for a channel
         * @param channelId Channel ID
         * @returns Pinned messages
         */
        getPinnedMessages: (channelId: string): Message[] => {
          try {
            return get().pinnedMessages[channelId] || [];
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getPinnedMessages",
              channelId,
            });
            return [];
          }
        },

        /**
         * Gets all reactions for a message
         * @param messageId Message ID
         * @returns Array of reactions
         */
        getMessageReactions: (messageId: string): MessageReaction[] => {
          try {
            const message = get().getMessageById(messageId);
            return message?.metadata?.reactions || [];
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getMessageReactions",
              messageId,
            });
            return [];
          }
        },

        /**
         * Gets reactions for a message grouped by emoji
         * @param messageId Message ID
         * @returns Record of emoji names to reactions
         */
        getReactionsByEmoji: (
          messageId: string,
        ): Record<string, MessageReaction[]> => {
          try {
            const message = get().getMessageById(messageId);
            if (!message) return {};

            return messageService.getReactionsByEmoji(message);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getReactionsByEmoji",
              messageId,
            });
            return {};
          }
        },

        /**
         * Gets reaction counts grouped by emoji
         * @param messageId Message ID
         * @returns List of emoji count objects
         */
        getReactionCounts: (messageId: string): ReactionCount[] => {
          try {
            const message = get().getMessageById(messageId);
            if (!message) return [];

            return messageService.getReactionCounts(message);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getReactionCounts",
              messageId,
            });
            return [];
          }
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
          try {
            const message = get().getMessageById(messageId);
            if (!message) return false;

            return messageService.hasUserReacted(message, userId, emoji);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "hasUserReacted",
              messageId,
              userId,
              emoji,
            });
            return false;
          }
        },

        /**
         * Checks if messages for a channel are loading
         * @param channelId Channel ID
         * @returns Whether channel is loading
         */
        isChannelLoading: (channelId: string): boolean => {
          try {
            return get().loadingChannelIds.includes(channelId);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "isChannelLoading",
              channelId,
            });
            return false;
          }
        },

        /**
         * Checks if messages for a thread are loading
         * @param rootMessageId Root message ID
         * @returns Whether thread is loading
         */
        isThreadLoading: (rootMessageId: string): boolean => {
          try {
            return get().threadLoadingIds.includes(rootMessageId);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "isThreadLoading",
              rootMessageId,
            });
            return false;
          }
        },

        /**
         * Resets the store to initial state
         */
        reset: () => {
          try {
            set((state) => {
              // Reset domain-specific state
              state.messagesByChannel = {};
              state.threadMessages = {};
              state.pinnedMessages = {};
              state.highlightedMessageId = null;
              state.replyToMessage = null;
              state.editingMessageId = null;
              state.loadingChannelIds = [];
              state.threadLoadingIds = [];
              state.errors = {};

              // Reset common state from CommonSlice
              state.isLoading = false;
              state.loadingIds = [];
              state.error = null;
              state.errors = {};
              state.lastFetchTimes = {};
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "reset",
            });
          }
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
  try {
    const messages = useMessageStore.getState().getChannelMessages(channelId);
    return messageService.sortMessages(messages);
  } catch (error) {
    handleError(error as Error, ErrorSource.UI, undefined, {
      action: "getSortedChannelMessages",
      channelId,
    });
    return [];
  }
}

/**
 * Gets sorted messages for a thread
 * @param rootMessageId Root message ID
 * @returns Sorted thread messages
 */
export function getSortedThreadMessages(rootMessageId: string): Message[] {
  try {
    const messages = useMessageStore
      .getState()
      .getThreadMessages(rootMessageId);
    return messageService.sortMessages(messages);
  } catch (error) {
    handleError(error as Error, ErrorSource.UI, undefined, {
      action: "getSortedThreadMessages",
      rootMessageId,
    });
    return [];
  }
}

/**
 * Gets the formatted display text for a message
 * @param messageId Message ID
 * @param truncate Whether to truncate long messages
 * @param maxLength Maximum length if truncating
 * @returns Formatted message text
 */
export function getMessageDisplayText(
  messageId: string,
  truncate: boolean = false,
  maxLength: number = 100,
): string {
  try {
    const message = useMessageStore.getState().getMessageById(messageId);
    if (!message) return "";

    let text = message.message;

    if (truncate && text.length > maxLength) {
      text = text.substring(0, maxLength) + "...";
    }

    return text;
  } catch (error) {
    handleError(error as Error, ErrorSource.UI, undefined, {
      action: "getMessageDisplayText",
      messageId,
    });
    return "";
  }
}
