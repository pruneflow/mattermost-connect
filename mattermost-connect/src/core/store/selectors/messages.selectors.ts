// src/core/store/selectors/messages.selectors.ts
/**
 * Sélecteurs pour l'état des messages
 */

import { createSelector, createParameterizedSelector } from "../selector-utils";
import { RootState } from "../store.config";
import { Message } from "../../types/messages.types";

/**
 * Sélectionne l'état complet des messages
 */
export const selectMessagesState = (state: RootState) => state.messages;

/**
 * Sélectionne les messages par canal
 */
export const selectMessagesByChannel = createSelector(
  selectMessagesState,
  (messagesState) => messagesState.messagesByChannel,
);

/**
 * Sélectionne les messages de thread
 */
export const selectThreadMessages = createSelector(
  selectMessagesState,
  (messagesState) => messagesState.threadMessages,
);

/**
 * Sélectionne les états de chargement des messages par canal
 */
export const selectMessagesLoadingStates = createSelector(
  selectMessagesState,
  (messagesState) => messagesState.loadingStates,
);

/**
 * Sélectionne les états de chargement des threads
 */
export const selectThreadLoadingStates = createSelector(
  selectMessagesState,
  (messagesState) => messagesState.threadLoadingStates,
);

/**
 * Sélectionne les erreurs de chargement des messages
 */
export const selectMessagesErrors = createSelector(
  selectMessagesState,
  (messagesState) => messagesState.errors,
);

/**
 * Sélectionne l'ID du message en surbrillance
 */
export const selectHighlightedMessageId = createSelector(
  selectMessagesState,
  (messagesState) => messagesState.highlightedMessageId,
);

/**
 * Sélectionne le message auquel on répond
 */
export const selectReplyToMessage = createSelector(
  selectMessagesState,
  (messagesState) => messagesState.replyToMessage,
);

/**
 * Sélectionne l'ID du message en cours d'édition
 */
export const selectEditingMessageId = createSelector(
  selectMessagesState,
  (messagesState) => messagesState.editingMessageId,
);

/**
 * Crée un sélecteur pour obtenir les messages d'un canal spécifique
 */
export const makeSelectMessagesByChannelId = createParameterizedSelector(
  (channelId: string) =>
    createSelector(
      selectMessagesByChannel,
      (messagesByChannel): Message[] => messagesByChannel[channelId] || [],
    ),
);

/**
 * Crée un sélecteur pour obtenir les messages triés d'un canal spécifique
 */
export const makeSelectSortedMessagesByChannelId = createParameterizedSelector(
  (channelId: string) =>
    createSelector(selectMessagesByChannel, (messagesByChannel): Message[] => {
      const messages = messagesByChannel[channelId] || [];
      return [...messages].sort((a, b) => a.create_at - b.create_at);
    }),
);

/**
 * Crée un sélecteur pour obtenir les réponses d'un thread
 */
export const makeSelectThreadRepliesByRootId = createParameterizedSelector(
  (rootMessageId: string) =>
    createSelector(
      selectThreadMessages,
      (threadMessages): Message[] => threadMessages[rootMessageId] || [],
    ),
);

/**
 * Crée un sélecteur pour obtenir les réponses triées d'un thread
 */
export const makeSelectSortedThreadRepliesByRootId =
  createParameterizedSelector((rootMessageId: string) =>
    createSelector(selectThreadMessages, (threadMessages): Message[] => {
      const replies = threadMessages[rootMessageId] || [];
      return [...replies].sort((a, b) => a.create_at - b.create_at);
    }),
  );

/**
 * Crée un sélecteur pour vérifier si un canal est en cours de chargement
 */
export const makeSelectIsChannelMessagesLoading = createParameterizedSelector(
  (channelId: string) =>
    createSelector(
      selectMessagesLoadingStates,
      (loadingStates): boolean => loadingStates[channelId] || false,
    ),
);

/**
 * Crée un sélecteur pour vérifier si un thread est en cours de chargement
 */
export const makeSelectIsThreadMessagesLoading = createParameterizedSelector(
  (rootMessageId: string) =>
    createSelector(
      selectThreadLoadingStates,
      (loadingStates): boolean => loadingStates[rootMessageId] || false,
    ),
);

/**
 * Crée un sélecteur pour trouver un message par son ID
 */
export const makeSelectMessageById = createParameterizedSelector(
  (messageId: string) =>
    createSelector(
      selectMessagesByChannel,
      selectThreadMessages,
      (messagesByChannel, threadMessages): Message | null => {
        // Chercher dans les messages de canal
        for (const channelMessages of Object.values(messagesByChannel)) {
          const message = channelMessages.find((m) => m.id === messageId);
          if (message) {
            return message;
          }
        }

        // Chercher dans les messages de thread
        for (const threadReplies of Object.values(threadMessages)) {
          const message = threadReplies.find((m) => m.id === messageId);
          if (message) {
            return message;
          }
        }

        return null;
      },
    ),
);

/**
 * Sélectionne l'état pour le hook useMessages
 */
export const selectMessagesStateForHook = createSelector(
  selectMessagesByChannel,
  selectThreadMessages,
  selectMessagesLoadingStates,
  selectThreadLoadingStates,
  selectHighlightedMessageId,
  selectReplyToMessage,
  selectEditingMessageId,
  (
    messagesByChannel,
    threadMessages,
    loadingStates,
    threadLoadingStates,
    highlightedMessageId,
    replyToMessage,
    editingMessageId,
  ) => ({
    messagesByChannel,
    threadMessages,
    loadingStates,
    threadLoadingStates,
    highlightedMessageId,
    replyToMessage,
    editingMessageId,
  }),
);
