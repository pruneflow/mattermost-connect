// src/core/store/messageStore.ts
/**
 * Zustand store for messages state
 */
import { create } from "zustand";

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
 * Message reaction interface
 */
export interface MessageReaction {
  emoji_name: string;
  user_id: string;
  post_id: string;
  create_at: number;
}

/**
 * Message metadata interface
 */
export interface MessageMetadata {
  files?: MessageAttachment[];
  emojis?: string[];
  reactions?: MessageReaction[];
}

/**
 * Message interface
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
 * Messages state
 */
export interface MessageState {
  /** Typing users by channel ID */
  typingUsers: Record<string, string[]>;
  /** Messages by channel ID */
  messagesByChannel: Record<string, Message[]>;
  /** Thread messages by root message ID */
  threadMessages: Record<string, Message[]>;
  /** Loading states by channel ID */
  loadingStates: Record<string, boolean>;
  /** Thread loading states by root message ID */
  threadLoadingStates: Record<string, boolean>;
  /** Errors by channel ID */
  errors: Record<string, Error | null>;
  /** ID of the highlighted message */
  highlightedMessageId: string | null;
  /** Message being replied to */
  replyToMessage: Message | null;
  /** ID of the message being edited */
  editingMessageId: string | null;
  /** Last fetch times by channel ID */
  lastFetchTimes: Record<string, number>;

  // Actions
  /** Sets messages for a channel */
  setMessages: (channelId: string, messages: Message[]) => void;
  /** Sets thread messages for a root message */
  setThreadMessages: (rootMessageId: string, messages: Message[]) => void;
  /** Adds a new message to a channel */
  addMessage: (message: Message) => void;
  /** Updates an existing message */
  updateMessage: (message: Message) => void;
  /** Deletes a message */
  deleteMessage: (messageId: string, channelId: string) => void;
  /** Sets the highlighted message */
  setHighlightedMessage: (messageId: string | null) => void;
  /** Sets the message being replied to */
  setReplyToMessage: (message: Message | null) => void;
  /** Sets the message being edited */
  setEditingMessage: (messageId: string | null) => void;
  /** Sets the loading state for a channel */
  setLoading: (channelId: string, isLoading: boolean) => void;
  /** Sets the loading state for a thread */
  setThreadLoading: (rootMessageId: string, isLoading: boolean) => void;
  /** Sets the error state for a channel */
  setError: (channelId: string, error: Error | null) => void;
  /** Adds a reaction to a message */
  addReaction: (messageId: string, userId: string, emoji: string) => void;
  /** Removes a reaction from a message */
  removeReaction: (messageId: string, userId: string, emoji: string) => void;
  /** Gets a message by ID */
  getMessageById: (messageId: string) => Message | null;
  /** Resets the messages state */
  reset: () => void;
}

/**
 * Create the messages store
 */
export const useMessageStore = create<MessageState>()((set, get) => ({
  // Initial state
  messagesByChannel: {},
  threadMessages: {},
  loadingStates: {},
  threadLoadingStates: {},
  errors: {},
  highlightedMessageId: null,
  replyToMessage: null,
  editingMessageId: null,
  lastFetchTimes: {},

  /**
   * Sets messages for a channel
   * @param channelId Channel ID
   * @param messages List of messages
   */
  setMessages: (channelId: string, messages: Message[]) => {
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: messages,
      },
      loadingStates: {
        ...state.loadingStates,
        [channelId]: false,
      },
      lastFetchTimes: {
        ...state.lastFetchTimes,
        [channelId]: Date.now(),
      },
      errors: {
        ...state.errors,
        [channelId]: null,
      },
    }));
  },

  /**
   * Sets thread messages for a root message
   * @param rootMessageId Root message ID
   * @param messages List of thread messages
   */
  setThreadMessages: (rootMessageId: string, messages: Message[]) => {
    set((state) => ({
      threadMessages: {
        ...state.threadMessages,
        [rootMessageId]: messages,
      },
      threadLoadingStates: {
        ...state.threadLoadingStates,
        [rootMessageId]: false,
      },
    }));
  },

  /**
   * Adds a new message to a channel
   * @param message Message to add
   */
  addMessage: (message: Message) => {
    const channelId = message.channel_id;
    const rootId = message.root_id;

    set((state) => {
      // Update state object
      let updatedState = { ...state };

      // Add to channel messages if channel exists in state
      if (rootId) {
        // If it's a thread message
        const threadMessages = state.threadMessages[rootId] || [];

        updatedState = {
          ...updatedState,
          threadMessages: {
            ...updatedState.threadMessages,
            [rootId]: [...threadMessages, message],
          },
        };
      }

      // Also add to channel messages
      if (channelId in state.messagesByChannel) {
        const channelMessages = state.messagesByChannel[channelId] || [];

        updatedState = {
          ...updatedState,
          messagesByChannel: {
            ...updatedState.messagesByChannel,
            [channelId]: [...channelMessages, message],
          },
        };
      }

      return updatedState;
    });
  },

  /**
   * Updates an existing message
   * @param message Updated message
   */
  updateMessage: (message: Message) => {
    const channelId = message.channel_id;
    const rootId = message.root_id;

    set((state) => {
      // Update state object
      let updatedState = { ...state };

      // Update in channel messages if present
      if (channelId in state.messagesByChannel) {
        const channelMessages = [...state.messagesByChannel[channelId]];
        const messageIndex = channelMessages.findIndex(
          (m) => m.id === message.id,
        );

        if (messageIndex !== -1) {
          channelMessages[messageIndex] = message;

          updatedState = {
            ...updatedState,
            messagesByChannel: {
              ...updatedState.messagesByChannel,
              [channelId]: channelMessages,
            },
          };
        }
      }

      // Update in thread messages if present
      if (rootId && rootId in state.threadMessages) {
        const threadMessages = [...state.threadMessages[rootId]];
        const messageIndex = threadMessages.findIndex(
          (m) => m.id === message.id,
        );

        if (messageIndex !== -1) {
          threadMessages[messageIndex] = message;

          updatedState = {
            ...updatedState,
            threadMessages: {
              ...updatedState.threadMessages,
              [rootId]: threadMessages,
            },
          };
        }
      }

      // If this message was being edited, clear editing state
      if (state.editingMessageId === message.id) {
        updatedState = {
          ...updatedState,
          editingMessageId: null,
        };
      }

      return updatedState;
    });
  },

  /**
   * Deletes a message
   * @param messageId Message ID
   * @param channelId Channel ID
   */
  deleteMessage: (messageId: string, channelId: string) => {
    set((state) => {
      // Update state object
      let updatedState = { ...state };

      // Find the message to check if it's part of a thread
      let message: Message | undefined;

      if (channelId in state.messagesByChannel) {
        message = state.messagesByChannel[channelId].find(
          (m) => m.id === messageId,
        );
      }

      // Remove from channel messages if present
      if (channelId in state.messagesByChannel) {
        updatedState = {
          ...updatedState,
          messagesByChannel: {
            ...updatedState.messagesByChannel,
            [channelId]: updatedState.messagesByChannel[channelId].filter(
              (m) => m.id !== messageId,
            ),
          },
        };
      }

      // Remove from thread messages if present
      if (message?.root_id) {
        const rootId = message.root_id;

        if (rootId in state.threadMessages) {
          updatedState = {
            ...updatedState,
            threadMessages: {
              ...updatedState.threadMessages,
              [rootId]: updatedState.threadMessages[rootId].filter(
                (m) => m.id !== messageId,
              ),
            },
          };
        }
      }

      // If this message was highlighted, clear highlight
      if (state.highlightedMessageId === messageId) {
        updatedState = {
          ...updatedState,
          highlightedMessageId: null,
        };
      }

      // If this message was being replied to, clear reply state
      if (state.replyToMessage?.id === messageId) {
        updatedState = {
          ...updatedState,
          replyToMessage: null,
        };
      }

      // If this message was being edited, clear editing state
      if (state.editingMessageId === messageId) {
        updatedState = {
          ...updatedState,
          editingMessageId: null,
        };
      }

      return updatedState;
    });
  },

  /**
   * Sets the highlighted message
   * @param messageId Message ID
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
   * @param messageId Message ID
   */
  setEditingMessage: (messageId: string | null) => {
    set({ editingMessageId: messageId });
  },

  /**
   * Sets the loading state for a channel
   * @param channelId Channel ID
   * @param isLoading Whether messages are being loaded
   */
  setLoading: (channelId: string, isLoading: boolean) => {
    set((state) => ({
      loadingStates: {
        ...state.loadingStates,
        [channelId]: isLoading,
      },
    }));
  },

  /**
   * Sets the loading state for a thread
   * @param rootMessageId Root message ID
   * @param isLoading Whether thread messages are being loaded
   */
  setThreadLoading: (rootMessageId: string, isLoading: boolean) => {
    set((state) => ({
      threadLoadingStates: {
        ...state.threadLoadingStates,
        [rootMessageId]: isLoading,
      },
    }));
  },

  /**
   * Sets the error state for a channel
   * @param channelId Channel ID
   * @param error Error to set
   */
  setError: (channelId: string, error: Error | null) => {
    set((state) => ({
      errors: {
        ...state.errors,
        [channelId]: error,
      },
      loadingStates: {
        ...state.loadingStates,
        [channelId]: false,
      },
    }));
  },

  /**
   * Adds a reaction to a message
   * @param messageId Message ID
   * @param userId User ID
   * @param emoji Emoji name
   */
  addReaction: (messageId: string, userId: string, emoji: string) => {
    set((state) => {
      // We need to find the message first
      let message: Message | null = null;
      let inChannel: string | null = null;
      let inThread: string | null = null;

      // Search in channel messages
      for (const channelId in state.messagesByChannel) {
        const found = state.messagesByChannel[channelId].find(
          (m) => m.id === messageId,
        );
        if (found) {
          message = found;
          inChannel = channelId;
          break;
        }
      }

      // Search in thread messages if not found in channels
      if (!message) {
        for (const rootId in state.threadMessages) {
          const found = state.threadMessages[rootId].find(
            (m) => m.id === messageId,
          );
          if (found) {
            message = found;
            inThread = rootId;
            break;
          }
        }
      }

      // If message not found, return unchanged state
      if (!message) return state;

      // Create a copy of the message with the new reaction
      const updatedMessage = { ...message };

      // Initialize metadata if needed
      if (!updatedMessage.metadata) {
        updatedMessage.metadata = {};
      }

      // Initialize reactions if needed
      if (!updatedMessage.metadata.reactions) {
        updatedMessage.metadata.reactions = [];
      }

      // Add the reaction if it doesn't exist
      const existingReaction = updatedMessage.metadata.reactions.find(
        (r) => r.emoji_name === emoji && r.user_id === userId,
      );

      if (!existingReaction) {
        updatedMessage.metadata.reactions.push({
          emoji_name: emoji,
          user_id: userId,
          post_id: messageId,
          create_at: Date.now(),
        });

        updatedMessage.has_reactions = true;
      }

      // Update the message in the appropriate collection(s)
      let newState = { ...state };

      if (inChannel) {
        const updatedChannelMessages = [...state.messagesByChannel[inChannel]];
        const messageIndex = updatedChannelMessages.findIndex(
          (m) => m.id === messageId,
        );
        updatedChannelMessages[messageIndex] = updatedMessage;

        newState = {
          ...newState,
          messagesByChannel: {
            ...newState.messagesByChannel,
            [inChannel]: updatedChannelMessages,
          },
        };
      }

      if (inThread) {
        const updatedThreadMessages = [...state.threadMessages[inThread]];
        const messageIndex = updatedThreadMessages.findIndex(
          (m) => m.id === messageId,
        );
        updatedThreadMessages[messageIndex] = updatedMessage;

        newState = {
          ...newState,
          threadMessages: {
            ...newState.threadMessages,
            [inThread]: updatedThreadMessages,
          },
        };
      }

      return newState;
    });
  },

  /**
   * Removes a reaction from a message
   * @param messageId Message ID
   * @param userId User ID
   * @param emoji Emoji name
   */
  removeReaction: (messageId: string, userId: string, emoji: string) => {
    set((state) => {
      // We need to find the message first
      let message: Message | null = null;
      let inChannel: string | null = null;
      let inThread: string | null = null;

      // Search in channel messages
      for (const channelId in state.messagesByChannel) {
        const found = state.messagesByChannel[channelId].find(
          (m) => m.id === messageId,
        );
        if (found) {
          message = found;
          inChannel = channelId;
          break;
        }
      }

      // Search in thread messages if not found in channels
      if (!message) {
        for (const rootId in state.threadMessages) {
          const found = state.threadMessages[rootId].find(
            (m) => m.id === messageId,
          );
          if (found) {
            message = found;
            inThread = rootId;
            break;
          }
        }
      }

      // If message not found, return unchanged state
      if (!message) return state;

      // Create a copy of the message
      const updatedMessage = { ...message };

      // Return if no metadata or reactions
      if (!updatedMessage.metadata?.reactions) return state;

      // Filter out the reaction
      updatedMessage.metadata.reactions =
        updatedMessage.metadata.reactions.filter(
          (r) => !(r.emoji_name === emoji && r.user_id === userId),
        );

      // Update has_reactions flag
      updatedMessage.has_reactions =
        updatedMessage.metadata.reactions.length > 0;

      // Update the message in the appropriate collection(s)
      let newState = { ...state };

      if (inChannel) {
        const updatedChannelMessages = [...state.messagesByChannel[inChannel]];
        const messageIndex = updatedChannelMessages.findIndex(
          (m) => m.id === messageId,
        );
        updatedChannelMessages[messageIndex] = updatedMessage;

        newState = {
          ...newState,
          messagesByChannel: {
            ...newState.messagesByChannel,
            [inChannel]: updatedChannelMessages,
          },
        };
      }

      if (inThread) {
        const updatedThreadMessages = [...state.threadMessages[inThread]];
        const messageIndex = updatedThreadMessages.findIndex(
          (m) => m.id === messageId,
        );
        updatedThreadMessages[messageIndex] = updatedMessage;

        newState = {
          ...newState,
          threadMessages: {
            ...newState.threadMessages,
            [inThread]: updatedThreadMessages,
          },
        };
      }

      return newState;
    });
  },

  /**
   * Gets a message by ID
   * @param messageId Message ID
   * @returns Message or null if not found
   */
  getMessageById: (messageId: string): Message | null => {
    const state = get();

    // Search in channel messages
    for (const channelId in state.messagesByChannel) {
      const message = state.messagesByChannel[channelId].find(
        (m) => m.id === messageId,
      );
      if (message) return message;
    }

    // Search in thread messages
    for (const rootId in state.threadMessages) {
      const message = state.threadMessages[rootId].find(
        (m) => m.id === messageId,
      );
      if (message) return message;
    }

    return null;
  },

  /**
   * Resets the messages state
   */
  reset: () => {
    set({
      messagesByChannel: {},
      threadMessages: {},
      loadingStates: {},
      threadLoadingStates: {},
      errors: {},
      highlightedMessageId: null,
      replyToMessage: null,
      editingMessageId: null,
      lastFetchTimes: {},
    });
  },
}));

/**
 * Gets sorted messages for a channel
 * @param channelId Channel ID
 * @returns Sorted messages for the channel
 */
export const getSortedChannelMessages = (channelId: string): Message[] => {
  const messages =
    useMessageStore.getState().messagesByChannel[channelId] || [];
  return [...messages].sort((a, b) => a.create_at - b.create_at);
};

/**
 * Gets sorted messages for a thread
 * @param rootMessageId Root message ID
 * @returns Sorted messages for the thread
 */
export const getSortedThreadMessages = (rootMessageId: string): Message[] => {
  const messages =
    useMessageStore.getState().threadMessages[rootMessageId] || [];
  return [...messages].sort((a, b) => a.create_at - b.create_at);
};
