// src/core/store/slices/messages.slice.ts
/**
 * Slice pour la gestion des messages
 */
import { createReducer, createAction } from "../store";

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
  root_id?: string;
  file_ids?: string[];
  props?: Record<string, unknown>;
}

export interface MessagesState {
  // Messages par canal
  messagesByChannel: Record<string, Message[]>;
  // Messages de thread par message parent
  threadMessages: Record<string, Message[]>;
  // État de chargement par canal
  loadingStates: Record<string, boolean>;
  // État de chargement par thread
  threadLoadingStates: Record<string, boolean>;
  // Erreurs par canal
  errors: Record<string, Error | null>;
  // Message à mettre en évidence
  highlightedMessageId: string | null;
  // Message en cours de réponse
  replyToMessage: Message | null;
  // Messages en cours d'édition
  editingMessageId: string | null;
  // Derniers timestamps de chargement par canal
  lastFetchTimes: Record<string, number>;
}

// État initial
const initialState: MessagesState = {
  messagesByChannel: {},
  threadMessages: {},
  loadingStates: {},
  threadLoadingStates: {},
  errors: {},
  highlightedMessageId: null,
  replyToMessage: null,
  editingMessageId: null,
  lastFetchTimes: {},
};

// Actions
export const fetchMessages = createAction<{
  channelId: string;
  options?: {
    page?: number;
    perPage?: number;
    since?: number;
    before?: string;
    after?: string;
  };
}>("MESSAGES_FETCH_REQUEST");

export const fetchMessagesSuccess = createAction<{
  channelId: string;
  messages: Message[];
  fromCache?: boolean;
}>("MESSAGES_FETCH_SUCCESS");

export const fetchMessagesError = createAction<{
  channelId: string;
  error: Error;
}>("MESSAGES_FETCH_ERROR");

export const fetchThreadMessages = createAction<{
  rootMessageId: string;
}>("THREAD_MESSAGES_FETCH_REQUEST");

export const fetchThreadMessagesSuccess = createAction<{
  rootMessageId: string;
  messages: Message[];
}>("THREAD_MESSAGES_FETCH_SUCCESS");

export const fetchThreadMessagesError = createAction<{
  rootMessageId: string;
  error: Error;
}>("THREAD_MESSAGES_FETCH_ERROR");

export const sendMessage = createAction<{
  channelId: string;
  message: string;
  fileIds?: string[];
}>("MESSAGE_SEND_REQUEST");

export const sendMessageSuccess = createAction<{
  channelId: string;
  message: Message;
}>("MESSAGE_SEND_SUCCESS");

export const sendMessageError = createAction<{
  channelId: string;
  error: Error;
}>("MESSAGE_SEND_ERROR");

export const setHighlightedMessage = createAction<{
  messageId: string | null;
}>("MESSAGE_SET_HIGHLIGHTED");

export const setReplyToMessage = createAction<{
  message: Message | null;
}>("MESSAGE_SET_REPLY_TO");

export const startEditingMessage = createAction<{
  messageId: string;
}>("MESSAGE_START_EDITING");

export const cancelEditingMessage = createAction("MESSAGE_CANCEL_EDITING");

export const editMessage = createAction<{
  messageId: string;
  newMessage: string;
}>("MESSAGE_EDIT_REQUEST");

export const editMessageSuccess = createAction<{
  message: Message;
}>("MESSAGE_EDIT_SUCCESS");

export const editMessageError = createAction<{
  messageId: string;
  error: Error;
}>("MESSAGE_EDIT_ERROR");

export const deleteMessage = createAction<{
  messageId: string;
  channelId: string;
}>("MESSAGE_DELETE_REQUEST");

export const deleteMessageSuccess = createAction<{
  messageId: string;
  channelId: string;
}>("MESSAGE_DELETE_SUCCESS");

export const deleteMessageError = createAction<{
  messageId: string;
  error: Error;
}>("MESSAGE_DELETE_ERROR");

export const replyToMessage = createAction<{
  channelId: string;
  rootMessageId: string;
  message: string;
  fileIds?: string[];
}>("MESSAGE_REPLY_REQUEST");

export const replyToMessageSuccess = createAction<{
  message: Message;
}>("MESSAGE_REPLY_SUCCESS");

export const replyToMessageError = createAction<{
  rootMessageId: string;
  error: Error;
}>("MESSAGE_REPLY_ERROR");

export const addReaction = createAction<{
  messageId: string;
  emoji: string;
}>("REACTION_ADD_REQUEST");

export const addReactionSuccess = createAction<{
  messageId: string;
  emoji: string;
  userId: string;
}>("REACTION_ADD_SUCCESS");

export const addReactionError = createAction<{
  messageId: string;
  emoji: string;
  error: Error;
}>("REACTION_ADD_ERROR");

export const removeReaction = createAction<{
  messageId: string;
  emoji: string;
  channelId: string;
}>("REACTION_REMOVE_REQUEST");

export const removeReactionSuccess = createAction<{
  messageId: string;
  emoji: string;
  userId: string;
}>("REACTION_REMOVE_SUCCESS");

export const removeReactionError = createAction<{
  messageId: string;
  emoji: string;
  error: Error;
}>("REACTION_REMOVE_ERROR");

export const receiveNewMessage = createAction<{
  message: Message;
}>("MESSAGE_RECEIVED");

export const receiveEditedMessage = createAction<{
  message: Message;
}>("MESSAGE_UPDATED");

export const receiveDeletedMessage = createAction<{
  messageId: string;
  channelId: string;
}>("MESSAGE_DELETED");

// Helper function to update messages in a channel
const updateMessageInChannel = (
  state: MessagesState,
  channelId: string,
  messageId: string,
  updateFn: (message: Message) => Message,
): MessagesState => {
  if (!state.messagesByChannel[channelId]) {
    return state;
  }

  const messageIndex = state.messagesByChannel[channelId].findIndex(
    (msg) => msg.id === messageId,
  );

  if (messageIndex === -1) {
    return state;
  }

  const updatedMessages = [...state.messagesByChannel[channelId]];
  updatedMessages[messageIndex] = updateFn(updatedMessages[messageIndex]);

  return {
    ...state,
    messagesByChannel: {
      ...state.messagesByChannel,
      [channelId]: updatedMessages,
    },
  };
};

// Helper function to update a message in a thread
const updateMessageInThread = (
  state: MessagesState,
  rootMessageId: string,
  messageId: string,
  updateFn: (message: Message) => Message,
): MessagesState => {
  if (!state.threadMessages[rootMessageId]) {
    return state;
  }

  const messageIndex = state.threadMessages[rootMessageId].findIndex(
    (msg) => msg.id === messageId,
  );

  if (messageIndex === -1) {
    return state;
  }

  const updatedMessages = [...state.threadMessages[rootMessageId]];
  updatedMessages[messageIndex] = updateFn(updatedMessages[messageIndex]);

  return {
    ...state,
    threadMessages: {
      ...state.threadMessages,
      [rootMessageId]: updatedMessages,
    },
  };
};

// Reducer
export const messagesReducer = createReducer<MessagesState>(initialState, {
  // Chargement des messages d'un canal
  [fetchMessages.type]: (state, payload) => ({
    ...state,
    loadingStates: {
      ...state.loadingStates,
      [payload.channelId]: true,
    },
    errors: {
      ...state.errors,
      [payload.channelId]: null,
    },
  }),

  [fetchMessagesSuccess.type]: (state, payload) => ({
    ...state,
    messagesByChannel: {
      ...state.messagesByChannel,
      [payload.channelId]: payload.messages,
    },
    loadingStates: {
      ...state.loadingStates,
      [payload.channelId]: false,
    },
    lastFetchTimes: {
      ...state.lastFetchTimes,
      [payload.channelId]: Date.now(),
    },
  }),

  [fetchMessagesError.type]: (state, payload) => ({
    ...state,
    loadingStates: {
      ...state.loadingStates,
      [payload.channelId]: false,
    },
    errors: {
      ...state.errors,
      [payload.channelId]: payload.error,
    },
  }),

  // Chargement des messages d'un thread
  [fetchThreadMessages.type]: (state, payload) => ({
    ...state,
    threadLoadingStates: {
      ...state.threadLoadingStates,
      [payload.rootMessageId]: true,
    },
  }),

  [fetchThreadMessagesSuccess.type]: (state, payload) => ({
    ...state,
    threadMessages: {
      ...state.threadMessages,
      [payload.rootMessageId]: payload.messages,
    },
    threadLoadingStates: {
      ...state.threadLoadingStates,
      [payload.rootMessageId]: false,
    },
  }),

  [fetchThreadMessagesError.type]: (state, payload) => ({
    ...state,
    threadLoadingStates: {
      ...state.threadLoadingStates,
      [payload.rootMessageId]: false,
    },
  }),

  // Envoi d'un nouveau message
  [sendMessageSuccess.type]: (state, payload) => {
    const channelId = payload.message.channel_id;
    const messages = state.messagesByChannel[channelId] || [];

    return {
      ...state,
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: [...messages, payload.message],
      },
    };
  },

  // Édition d'un message
  [startEditingMessage.type]: (state, payload) => ({
    ...state,
    editingMessageId: payload.messageId,
  }),

  [cancelEditingMessage.type]: (state) => ({
    ...state,
    editingMessageId: null,
  }),

  [editMessageSuccess.type]: (state, payload) => {
    let updatedState = state;
    const message = payload.message;

    // Mettre à jour le message dans le canal
    updatedState = updateMessageInChannel(
      updatedState,
      message.channel_id,
      message.id,
      () => message,
    );

    // Mettre à jour également dans le thread si c'est une réponse
    if (message.root_id) {
      updatedState = updateMessageInThread(
        updatedState,
        message.root_id,
        message.id,
        () => message,
      );
    }

    return {
      ...updatedState,
      editingMessageId: null,
    };
  },

  // Suppression d'un message
  [deleteMessageSuccess.type]: (state, payload) => {
    const { messageId, channelId } = payload;
    let updatedState = state;

    // Trouver le message pour vérifier s'il a un root_id
    const message = state.messagesByChannel[channelId]?.find(
      (msg) => msg.id === messageId,
    );

    // Supprimer le message du canal
    if (state.messagesByChannel[channelId]) {
      updatedState = {
        ...updatedState,
        messagesByChannel: {
          ...updatedState.messagesByChannel,
          [channelId]: updatedState.messagesByChannel[channelId].filter(
            (msg) => msg.id !== messageId,
          ),
        },
      };
    }

    // Supprimer également le message du thread s'il est dans un thread
    if (message?.root_id && state.threadMessages[message.root_id]) {
      updatedState = {
        ...updatedState,
        threadMessages: {
          ...updatedState.threadMessages,
          [message.root_id]: updatedState.threadMessages[
            message.root_id
          ].filter((msg) => msg.id !== messageId),
        },
      };
    }

    // Effacer le message de réponse s'il est sélectionné
    if (updatedState.replyToMessage?.id === messageId) {
      updatedState = {
        ...updatedState,
        replyToMessage: null,
      };
    }

    return updatedState;
  },

  // Réponse à un message
  [setReplyToMessage.type]: (state, payload) => ({
    ...state,
    replyToMessage: payload.message,
  }),

  [replyToMessageSuccess.type]: (state, payload) => {
    const message = payload.message;
    const rootMessageId = message.root_id!;
    const channelId = message.channel_id;
    let updatedState = state;

    // Ajouter la réponse au thread
    const threadMessages = state.threadMessages[rootMessageId] || [];

    updatedState = {
      ...updatedState,
      threadMessages: {
        ...updatedState.threadMessages,
        [rootMessageId]: [...threadMessages, message],
      },
      replyToMessage: null, // Effacer le message de réponse
    };

    // Ajouter également au canal si le message est dans le canal actif
    if (state.messagesByChannel[channelId]) {
      updatedState = {
        ...updatedState,
        messagesByChannel: {
          ...updatedState.messagesByChannel,
          [channelId]: [...updatedState.messagesByChannel[channelId], message],
        },
      };
    }

    return updatedState;
  },

  // Reactions
  [addReactionSuccess.type]: (state, payload) => {
    const { messageId, emoji, userId } = payload;
    let updatedState = state;

    // Trouver le message dans tous les canaux
    for (const channelId in state.messagesByChannel) {
      const messageIndex = state.messagesByChannel[channelId].findIndex(
        (msg) => msg.id === messageId,
      );

      if (messageIndex !== -1) {
        updatedState = updateMessageInChannel(
          updatedState,
          channelId,
          messageId,
          (message) => {
            // Ajouter la réaction au message
            const metadata = message.metadata || { reactions: [] };
            const reactions = metadata.reactions || [];

            // Vérifier si la réaction existe déjà
            const existingReaction = reactions.find(
              (r) => r.emoji_name === emoji && r.user_id === userId,
            );

            if (!existingReaction) {
              const newReactions = [
                ...reactions,
                {
                  emoji_name: emoji,
                  user_id: userId,
                  post_id: messageId,
                  create_at: Date.now(),
                },
              ];

              return {
                ...message,
                has_reactions: true,
                metadata: {
                  ...metadata,
                  reactions: newReactions,
                },
              };
            }

            return message;
          },
        );

        break;
      }
    }

    // Vérifier également dans les threads
    for (const rootMessageId in state.threadMessages) {
      const messageIndex = state.threadMessages[rootMessageId].findIndex(
        (msg) => msg.id === messageId,
      );

      if (messageIndex !== -1) {
        updatedState = updateMessageInThread(
          updatedState,
          rootMessageId,
          messageId,
          (message) => {
            // Ajouter la réaction au message
            const metadata = message.metadata || { reactions: [] };
            const reactions = metadata.reactions || [];

            // Vérifier si la réaction existe déjà
            const existingReaction = reactions.find(
              (r) => r.emoji_name === emoji && r.user_id === userId,
            );

            if (!existingReaction) {
              const newReactions = [
                ...reactions,
                {
                  emoji_name: emoji,
                  user_id: userId,
                  post_id: messageId,
                  create_at: Date.now(),
                },
              ];

              return {
                ...message,
                has_reactions: true,
                metadata: {
                  ...metadata,
                  reactions: newReactions,
                },
              };
            }

            return message;
          },
        );

        break;
      }
    }

    return updatedState;
  },

  [removeReactionSuccess.type]: (state, payload) => {
    const { messageId, emoji, userId } = payload;
    let updatedState = state;

    // Trouver le message dans tous les canaux
    for (const channelId in state.messagesByChannel) {
      const messageIndex = state.messagesByChannel[channelId].findIndex(
        (msg) => msg.id === messageId,
      );

      if (messageIndex !== -1) {
        updatedState = updateMessageInChannel(
          updatedState,
          channelId,
          messageId,
          (message) => {
            // Supprimer la réaction du message
            const metadata = message.metadata || { reactions: [] };
            const reactions = metadata.reactions || [];

            const newReactions = reactions.filter(
              (r) => !(r.emoji_name === emoji && r.user_id === userId),
            );

            return {
              ...message,
              has_reactions: newReactions.length > 0,
              metadata: {
                ...metadata,
                reactions: newReactions,
              },
            };
          },
        );

        break;
      }
    }

    // Vérifier également dans les threads
    for (const rootMessageId in state.threadMessages) {
      const messageIndex = state.threadMessages[rootMessageId].findIndex(
        (msg) => msg.id === messageId,
      );

      if (messageIndex !== -1) {
        updatedState = updateMessageInThread(
          updatedState,
          rootMessageId,
          messageId,
          (message) => {
            // Supprimer la réaction du message
            const metadata = message.metadata || { reactions: [] };
            const reactions = metadata.reactions || [];

            const newReactions = reactions.filter(
              (r) => !(r.emoji_name === emoji && r.user_id === userId),
            );

            return {
              ...message,
              has_reactions: newReactions.length > 0,
              metadata: {
                ...metadata,
                reactions: newReactions,
              },
            };
          },
        );

        break;
      }
    }

    return updatedState;
  },

  // Messages reçus via WebSocket
  [receiveNewMessage.type]: (state, payload) => {
    const message = payload.message;
    const channelId = message.channel_id;

    // Si c'est une réponse à un thread
    if (message.root_id) {
      let updatedState = state;
      const threadMessages = state.threadMessages[message.root_id] || [];

      // Ajouter au thread correspondant
      updatedState = {
        ...updatedState,
        threadMessages: {
          ...updatedState.threadMessages,
          [message.root_id]: [...threadMessages, message],
        },
      };

      // Ajouter également au canal si on a déjà des messages pour ce canal
      if (state.messagesByChannel[channelId]) {
        updatedState = {
          ...updatedState,
          messagesByChannel: {
            ...updatedState.messagesByChannel,
            [channelId]: [
              ...updatedState.messagesByChannel[channelId],
              message,
            ],
          },
        };
      }

      return updatedState;
    }

    // Message normal (pas une réponse)
    if (state.messagesByChannel[channelId]) {
      return {
        ...state,
        messagesByChannel: {
          ...state.messagesByChannel,
          [channelId]: [...state.messagesByChannel[channelId], message],
        },
      };
    }

    // Si ce canal n'a pas encore de messages, créer le tableau
    return {
      ...state,
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: [message],
      },
    };
  },

  [receiveEditedMessage.type]: (state, payload) => {
    const message = payload.message;
    let updatedState = state;

    // Mettre à jour le message dans le canal
    updatedState = updateMessageInChannel(
      updatedState,
      message.channel_id,
      message.id,
      () => message,
    );

    // Mettre à jour également dans le thread si c'est une réponse
    if (message.root_id) {
      updatedState = updateMessageInThread(
        updatedState,
        message.root_id,
        message.id,
        () => message,
      );
    }

    return updatedState;
  },

  [receiveDeletedMessage.type]: (state, payload) => {
    const { messageId, channelId } = payload;
    let updatedState = state;

    // Trouver le message pour vérifier s'il a un root_id
    const message = state.messagesByChannel[channelId]?.find(
      (msg) => msg.id === messageId,
    );

    // Supprimer le message du canal
    if (state.messagesByChannel[channelId]) {
      updatedState = {
        ...updatedState,
        messagesByChannel: {
          ...updatedState.messagesByChannel,
          [channelId]: updatedState.messagesByChannel[channelId].filter(
            (msg) => msg.id !== messageId,
          ),
        },
      };
    }

    // Supprimer également le message du thread s'il est dans un thread
    if (message?.root_id && state.threadMessages[message.root_id]) {
      updatedState = {
        ...updatedState,
        threadMessages: {
          ...updatedState.threadMessages,
          [message.root_id]: updatedState.threadMessages[
            message.root_id
          ].filter((msg) => msg.id !== messageId),
        },
      };
    }

    return updatedState;
  },

  // Highlight d'un message
  [setHighlightedMessage.type]: (state, payload) => ({
    ...state,
    highlightedMessageId: payload.messageId,
  }),

  // Réinitialiser l'état lors de la déconnexion
  AUTH_LOGOUT: () => ({
    ...initialState,
  }),
});
