// src/core/store/messageStore.ts
/**
 * Message store
 * Manages message data, threads, and pinned messages
 */
import { create } from "zustand";
import { MessageState, Message, EventType, ErrorSource } from "../../types";
import { emitEvent } from "./eventStore";
import { handleError } from "./errorStore";

/**
 * Message store state and actions
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
  isChannelLoading: (channelId: string) => boolean;
  isThreadLoading: (rootMessageId: string) => boolean;

  // Reset
  reset: () => void;
}

/**
 * Message store for managing message data
 */
export const useMessageStore = create<MessageStoreState>()((set, get) => ({
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

  /**
   * Sets all messages for a channel
   * @param channelId Channel ID
   * @param messages List of messages
   */
  setMessages: (channelId: string, messages: Message[]) => {
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: messages,
      },
      loadingChannelIds: state.loadingChannelIds.filter(
        (id) => id !== channelId,
      ),
      errors: {
        ...state.errors,
        [channelId]: null,
      },
      lastFetchTimes: {
        ...state.lastFetchTimes,
        [channelId]: Date.now(),
      },
    }));
  },

  /**
   * Adds a single message to the store
   * @param message Message to add
   */
  addMessage: (message: Message) => {
    set((state) => {
      const channelId = message.channel_id;
      const rootId = message.root_id;

      let updatedState = { ...state };

      // Add to thread if it's a reply
      if (rootId) {
        const threadMessages = state.threadMessages[rootId] || [];

        // Check if message already exists
        const existingMsgIndex = threadMessages.findIndex(
          (m) => m.id === message.id,
        );

        if (existingMsgIndex !== -1) {
          // Update existing message
          const updatedThreadMessages = [...threadMessages];
          updatedThreadMessages[existingMsgIndex] = message;

          updatedState = {
            ...updatedState,
            threadMessages: {
              ...updatedState.threadMessages,
              [rootId]: updatedThreadMessages,
            },
          };
        } else {
          // Add new message
          updatedState = {
            ...updatedState,
            threadMessages: {
              ...updatedState.threadMessages,
              [rootId]: [...threadMessages, message],
            },
          };
        }
      }

      // Add to channel messages
      const channelMessages = state.messagesByChannel[channelId] || [];

      // Check if message already exists
      const existingMsgIndex = channelMessages.findIndex(
        (m) => m.id === message.id,
      );

      if (existingMsgIndex !== -1) {
        // Update existing message
        const updatedChannelMessages = [...channelMessages];
        updatedChannelMessages[existingMsgIndex] = message;

        updatedState = {
          ...updatedState,
          messagesByChannel: {
            ...updatedState.messagesByChannel,
            [channelId]: updatedChannelMessages,
          },
        };
      } else {
        // Add new message
        updatedState = {
          ...updatedState,
          messagesByChannel: {
            ...updatedState.messagesByChannel,
            [channelId]: [...channelMessages, message],
          },
        };

        // Emit message received event
        emitEvent(EventType.MESSAGE_RECEIVED, { message });
      }

      // Add to pinned messages if applicable
      if (message.is_pinned) {
        const pinnedMessages = state.pinnedMessages[channelId] || [];

        if (!pinnedMessages.some((m) => m.id === message.id)) {
          updatedState = {
            ...updatedState,
            pinnedMessages: {
              ...updatedState.pinnedMessages,
              [channelId]: [...pinnedMessages, message],
            },
          };
        }
      }

      return updatedState;
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

      let updatedState = { ...state };

      // Update in channel messages
      const channelMessages = state.messagesByChannel[channelId] || [];
      const messageIndex = channelMessages.findIndex(
        (m) => m.id === message.id,
      );

      if (messageIndex !== -1) {
        const updatedChannelMessages = [...channelMessages];
        updatedChannelMessages[messageIndex] = message;

        updatedState = {
          ...updatedState,
          messagesByChannel: {
            ...updatedState.messagesByChannel,
            [channelId]: updatedChannelMessages,
          },
        };
      }

      // Update in thread if it's a reply
      if (rootId) {
        const threadMessages = state.threadMessages[rootId] || [];
        const threadMsgIndex = threadMessages.findIndex(
          (m) => m.id === message.id,
        );

        if (threadMsgIndex !== -1) {
          const updatedThreadMessages = [...threadMessages];
          updatedThreadMessages[threadMsgIndex] = message;

          updatedState = {
            ...updatedState,
            threadMessages: {
              ...updatedState.threadMessages,
              [rootId]: updatedThreadMessages,
            },
          };
        }
      }

      // Update in pinned messages if applicable
      const pinnedMessages = state.pinnedMessages[channelId] || [];
      const pinnedMsgIndex = pinnedMessages.findIndex(
        (m) => m.id === message.id,
      );

      if (message.is_pinned && pinnedMsgIndex === -1) {
        // Add to pinned messages
        updatedState = {
          ...updatedState,
          pinnedMessages: {
            ...updatedState.pinnedMessages,
            [channelId]: [...pinnedMessages, message],
          },
        };
      } else if (!message.is_pinned && pinnedMsgIndex !== -1) {
        // Remove from pinned messages
        const updatedPinnedMessages = [...pinnedMessages];
        updatedPinnedMessages.splice(pinnedMsgIndex, 1);

        updatedState = {
          ...updatedState,
          pinnedMessages: {
            ...updatedState.pinnedMessages,
            [channelId]: updatedPinnedMessages,
          },
        };
      } else if (pinnedMsgIndex !== -1) {
        // Update existing pinned message
        const updatedPinnedMessages = [...pinnedMessages];
        updatedPinnedMessages[pinnedMsgIndex] = message;

        updatedState = {
          ...updatedState,
          pinnedMessages: {
            ...updatedState.pinnedMessages,
            [channelId]: updatedPinnedMessages,
          },
        };
      }

      // Clear editing if this message was being edited
      if (state.editingMessageId === message.id) {
        updatedState = {
          ...updatedState,
          editingMessageId: null,
        };
      }

      // Emit message updated event
      emitEvent(EventType.MESSAGE_UPDATED, { message });

      return updatedState;
    });
  },

  /**
   * Deletes a message
   * @param messageId Message ID to delete
   * @param channelId Channel ID
   */
  deleteMessage: (messageId: string, channelId: string) => {
    set((state) => {
      let updatedState = { ...state };
      let deletedMessage: Message | undefined;

      // Remove from channel messages
      const channelMessages = state.messagesByChannel[channelId] || [];
      deletedMessage = channelMessages.find((m) => m.id === messageId);

      if (deletedMessage) {
        updatedState = {
          ...updatedState,
          messagesByChannel: {
            ...updatedState.messagesByChannel,
            [channelId]: channelMessages.filter((m) => m.id !== messageId),
          },
        };
      }

      // Remove from thread messages if it's a reply
      if (deletedMessage?.root_id) {
        const rootId = deletedMessage.root_id;
        const threadMessages = state.threadMessages[rootId] || [];

        updatedState = {
          ...updatedState,
          threadMessages: {
            ...updatedState.threadMessages,
            [rootId]: threadMessages.filter((m) => m.id !== messageId),
          },
        };
      }

      // Remove from thread messages if it's a root message
      if (state.threadMessages[messageId]) {
        const { [messageId]: _, ...remainingThreads } =
          updatedState.threadMessages;
        updatedState = {
          ...updatedState,
          threadMessages: remainingThreads,
        };
      }

      // Remove from pinned messages
      const pinnedMessages = state.pinnedMessages[channelId] || [];

      if (pinnedMessages.some((m) => m.id === messageId)) {
        updatedState = {
          ...updatedState,
          pinnedMessages: {
            ...updatedState.pinnedMessages,
            [channelId]: pinnedMessages.filter((m) => m.id !== messageId),
          },
        };
      }

      // Clear highlighted message if matching
      if (state.highlightedMessageId === messageId) {
        updatedState = {
          ...updatedState,
          highlightedMessageId: null,
        };
      }

      // Clear reply-to message if matching
      if (state.replyToMessage?.id === messageId) {
        updatedState = {
          ...updatedState,
          replyToMessage: null,
        };
      }

      // Clear editing message if matching
      if (state.editingMessageId === messageId) {
        updatedState = {
          ...updatedState,
          editingMessageId: null,
        };
      }

      // Emit message deleted event
      if (deletedMessage) {
        emitEvent(EventType.MESSAGE_DELETED, {
          messageId,
          channelId,
          message: deletedMessage,
        });
      }

      return updatedState;
    });
  },

  /**
   * Sets thread messages for a root message
   * @param rootMessageId Root message ID
   * @param messages Thread messages
   */
  setThreadMessages: (rootMessageId: string, messages: Message[]) => {
    set((state) => ({
      threadMessages: {
        ...state.threadMessages,
        [rootMessageId]: messages,
      },
      threadLoadingIds: state.threadLoadingIds.filter(
        (id) => id !== rootMessageId,
      ),
      lastFetchTimes: {
        ...state.lastFetchTimes,
        [`thread_${rootMessageId}`]: Date.now(),
      },
    }));
  },

  /**
   * Adds a message to a thread
   * @param rootMessageId Root message ID
   * @param message Thread message
   */
  addThreadMessage: (rootMessageId: string, message: Message) => {
    set((state) => {
      const threadMessages = state.threadMessages[rootMessageId] || [];

      // Check if message already exists
      const messageIndex = threadMessages.findIndex((m) => m.id === message.id);

      if (messageIndex !== -1) {
        // Update existing message
        const updatedThreadMessages = [...threadMessages];
        updatedThreadMessages[messageIndex] = message;

        return {
          threadMessages: {
            ...state.threadMessages,
            [rootMessageId]: updatedThreadMessages,
          },
        };
      } else {
        // Add new message
        return {
          threadMessages: {
            ...state.threadMessages,
            [rootMessageId]: [...threadMessages, message],
          },
        };
      }
    });
  },

  /**
   * Sets pinned messages for a channel
   * @param channelId Channel ID
   * @param messages Pinned messages
   */
  setPinnedMessages: (channelId: string, messages: Message[]) => {
    set((state) => ({
      pinnedMessages: {
        ...state.pinnedMessages,
        [channelId]: messages,
      },
      lastFetchTimes: {
        ...state.lastFetchTimes,
        [`pinned_${channelId}`]: Date.now(),
      },
    }));
  },

  /**
   * Adds a message to pinned messages
   * @param message Pinned message
   */
  addPinnedMessage: (message: Message) => {
    if (!message.is_pinned) {
      return;
    }

    const channelId = message.channel_id;

    set((state) => {
      const pinnedMessages = state.pinnedMessages[channelId] || [];

      // Check if message already exists
      if (pinnedMessages.some((m) => m.id === message.id)) {
        return state;
      }

      return {
        pinnedMessages: {
          ...state.pinnedMessages,
          [channelId]: [...pinnedMessages, message],
        },
      };
    });
  },

  /**
   * Removes a message from pinned messages
   * @param messageId Message ID
   * @param channelId Channel ID
   */
  removePinnedMessage: (messageId: string, channelId: string) => {
    set((state) => {
      const pinnedMessages = state.pinnedMessages[channelId] || [];

      // Check if message exists
      if (!pinnedMessages.some((m) => m.id === messageId)) {
        return state;
      }

      return {
        pinnedMessages: {
          ...state.pinnedMessages,
          [channelId]: pinnedMessages.filter((m) => m.id !== messageId),
        },
      };
    });
  },

  /**
   * Sets the highlighted message
   * @param messageId Message ID to highlight
   */
  setHighlightedMessage: (messageId: string | null) => {
    set({ highlightedMessageId: messageId });
  },

  /**
   * Sets the message being replied to
   * @param message Message to reply to
   */
  setReplyToMessage: (message: Message | null) => {
    set({ replyToMessage: message });
  },

  /**
   * Sets the message being edited
   * @param messageId Message ID to edit
   */
  setEditingMessage: (messageId: string | null) => {
    set({ editingMessageId: messageId });
  },

  /**
   * Sets the loading state for a channel
   * @param channelId Channel ID
   * @param isLoading Whether channel is loading
   */
  setLoading: (channelId: string, isLoading: boolean) => {
    set((state) => {
      if (isLoading) {
        // Add to loading channel IDs if not already there
        if (!state.loadingChannelIds.includes(channelId)) {
          return {
            loadingChannelIds: [...state.loadingChannelIds, channelId],
          };
        }
      } else {
        // Remove from loading channel IDs
        return {
          loadingChannelIds: state.loadingChannelIds.filter(
            (id) => id !== channelId,
          ),
        };
      }
      return state;
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
        // Add to loading thread IDs if not already there
        if (!state.threadLoadingIds.includes(rootMessageId)) {
          return {
            threadLoadingIds: [...state.threadLoadingIds, rootMessageId],
          };
        }
      } else {
        // Remove from loading thread IDs
        return {
          threadLoadingIds: state.threadLoadingIds.filter(
            (id) => id !== rootMessageId,
          ),
        };
      }
      return state;
    });
  },

  /**
   * Sets the error state for a channel
   * @param channelId Channel ID
   * @param error Error object or null
   */
  setError: (channelId: string, error: Error | null) => {
    set((state) => {
      // Stop loading for this channel
      const loadingChannelIds = state.loadingChannelIds.filter(
        (id) => id !== channelId,
      );

      // Update errors record
      const errors = {
        ...state.errors,
        [channelId]: error,
      };

      // Handle error if present
      if (error) {
        handleError(error, ErrorSource.API);
      }

      return {
        loadingChannelIds,
        errors,
      };
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
        (m) => m.id === messageId,
      );
      if (message) return message;
    }

    // Search in thread messages
    for (const rootId in threadMessages) {
      const message = threadMessages[rootId].find((m) => m.id === messageId);
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
    set({
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
    });
  },
}));

/**
 * Gets sorted messages for a channel
 * @param channelId Channel ID
 * @returns Sorted messages
 */
export function getSortedChannelMessages(channelId: string): Message[] {
  const messages = useMessageStore.getState().getChannelMessages(channelId);
  return [...messages].sort((a, b) => a.create_at - b.create_at);
}

/**
 * Gets sorted messages for a thread
 * @param rootMessageId Root message ID
 * @returns Sorted thread messages
 */
export function getSortedThreadMessages(rootMessageId: string): Message[] {
  const messages = useMessageStore.getState().getThreadMessages(rootMessageId);
  return [...messages].sort((a, b) => a.create_at - b.create_at);
}
