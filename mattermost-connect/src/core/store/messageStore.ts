// src/core/store/messageStore.ts
import { create } from "zustand";

export interface MessageAttachment {
  id: string;
  name: string;
  type?: string;
  size?: number;
  url?: string;
  link?: string;
}

export interface MessageReaction {
  emoji_name: string;
  user_id: string;
  post_id: string;
  create_at: number;
}

export interface MessageMetadata {
  files?: MessageAttachment[];
  emojis?: string[];
  reactions?: MessageReaction[];
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
  root_id?: string;
  file_ids?: string[];
  props?: Record<string, unknown>;
}

interface MessageState {
  messagesByChannel: Record<string, Message[]>;
  threadMessages: Record<string, Message[]>;
  loadingStates: Record<string, boolean>;
  threadLoadingStates: Record<string, boolean>;
  errors: Record<string, Error | null>;
  highlightedMessageId: string | null;
  replyToMessage: Message | null;
  editingMessageId: string | null;
  lastFetchTimes: Record<string, number>;
}

export const useMessageStore = create<
  MessageState & {
    setMessages: (channelId: string, messages: Message[]) => void;
    setThreadMessages: (rootMessageId: string, messages: Message[]) => void;
    addMessage: (message: Message) => void;
    updateMessage: (message: Message) => void;
    deleteMessage: (messageId: string, channelId: string) => void;
    setHighlightedMessage: (messageId: string | null) => void;
    setReplyToMessage: (message: Message | null) => void;
    setEditingMessage: (messageId: string | null) => void;
    setLoading: (channelId: string, isLoading: boolean) => void;
    setThreadLoading: (rootMessageId: string, isLoading: boolean) => void;
    setError: (channelId: string, error: Error | null) => void;
    getMessageById: (messageId: string) => Message | null;
    reset: () => void;
  }
>((set, get) => ({
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

  addMessage: (message: Message) => {
    const channelId = message.channel_id;
    const rootId = message.root_id;

    set((state) => {
      let updatedState = { ...state };

      if (rootId) {
        const threadMessages = state.threadMessages[rootId] || [];
        updatedState = {
          ...updatedState,
          threadMessages: {
            ...updatedState.threadMessages,
            [rootId]: [...threadMessages, message],
          },
        };
      }

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

  updateMessage: (message: Message) => {
    const channelId = message.channel_id;
    const rootId = message.root_id;

    set((state) => {
      let updatedState = { ...state };

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

      if (state.editingMessageId === message.id) {
        updatedState = {
          ...updatedState,
          editingMessageId: null,
        };
      }

      return updatedState;
    });
  },

  deleteMessage: (messageId: string, channelId: string) => {
    set((state) => {
      let updatedState = { ...state };
      let message: Message | undefined;

      if (channelId in state.messagesByChannel) {
        message = state.messagesByChannel[channelId].find(
          (m) => m.id === messageId,
        );

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

      if (state.highlightedMessageId === messageId) {
        updatedState = {
          ...updatedState,
          highlightedMessageId: null,
        };
      }

      if (state.replyToMessage?.id === messageId) {
        updatedState = {
          ...updatedState,
          replyToMessage: null,
        };
      }

      if (state.editingMessageId === messageId) {
        updatedState = {
          ...updatedState,
          editingMessageId: null,
        };
      }

      return updatedState;
    });
  },

  setHighlightedMessage: (messageId: string | null) => {
    set({ highlightedMessageId: messageId });
  },

  setReplyToMessage: (message: Message | null) => {
    set({ replyToMessage: message });
  },

  setEditingMessage: (messageId: string | null) => {
    set({ editingMessageId: messageId });
  },

  setLoading: (channelId: string, isLoading: boolean) => {
    set((state) => ({
      loadingStates: {
        ...state.loadingStates,
        [channelId]: isLoading,
      },
    }));
  },

  setThreadLoading: (rootMessageId: string, isLoading: boolean) => {
    set((state) => ({
      threadLoadingStates: {
        ...state.threadLoadingStates,
        [rootMessageId]: isLoading,
      },
    }));
  },

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

export function getSortedChannelMessages(channelId: string): Message[] {
  const messages =
    useMessageStore.getState().messagesByChannel[channelId] || [];
  return [...messages].sort((a, b) => a.create_at - b.create_at);
}

export function getSortedThreadMessages(rootMessageId: string): Message[] {
  const messages =
    useMessageStore.getState().threadMessages[rootMessageId] || [];
  return [...messages].sort((a, b) => a.create_at - b.create_at);
}
