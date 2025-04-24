// src/hooks/useMessages.ts
/**
 * Hook pour la gestion des messages
 */
import { useCallback } from "react";
import { useStoreSelector } from "./useStoreSelector";
import { useStoreDispatch } from "./useStoreDispatch";
import { getServices } from "../core/services";
import {
  getMessages,
  getThreadMessages,
  sendMessage as sendMessageAction,
  replyToMessage as replyToMessageAction,
  editMessageAction,
  deleteMessageAction,
  addReactionAction,
  removeReactionAction,
  setHighlightedMessageAction,
  setReplyToMessageAction,
  startEditingMessageAction,
  cancelEditingMessageAction,
} from "../core/store/thunks/messages.thunks";
import { Message } from "../core/store/slices/messages.slice";

interface MessageOptions {
  page?: number;
  perPage?: number;
  since?: number;
  before?: string;
  after?: string;
  forceRefresh?: boolean;
}

interface UseMessagesReturnType {
  // État
  messagesByChannel: Record<string, Message[]>;
  threadMessages: Record<string, Message[]>;
  loadingStates: Record<string, boolean>;
  threadLoadingStates: Record<string, boolean>;
  highlightedMessageId: string | null;
  replyToMessage: Message | null;
  editingMessageId: string | null;

  // Actions pour les messages
  loadMessages: (
    channelId: string,
    options?: MessageOptions,
  ) => Promise<Message[]>;
  loadThreadReplies: (rootMessageId: string) => Promise<Message[]>;
  sendMessage: (
    channelId: string,
    message: string,
    fileIds?: string[],
  ) => Promise<Message | null>;
  replyToMessage: (
    channelId: string,
    rootMessageId: string,
    message: string,
    fileIds?: string[],
  ) => Promise<Message | null>;
  editMessage: (
    messageId: string,
    newMessage: string,
  ) => Promise<Message | null>;
  deleteMessage: (messageId: string, channelId: string) => Promise<boolean>;

  // Actions pour les réactions
  addReaction: (messageId: string, emoji: string) => Promise<boolean>;
  removeReaction: (
    messageId: string,
    emoji: string,
    channelId: string,
  ) => Promise<boolean>;

  // Actions pour l'UI
  setHighlightedMessage: (messageId: string | null) => void;
  setReplyTo: (message: Message | null) => void;
  startEditingMessage: (messageId: string) => void;
  cancelEditingMessage: () => void;
}

export function useMessages(): UseMessagesReturnType {
  const dispatch = useStoreDispatch();
  const { apiClient, cacheService } = getServices();

  // Sélectionner les données de messages du store
  const messagesState = useStoreSelector((state) => state.messages);

  // Action pour charger les messages d'un canal
  const loadMessages = useCallback(
    async (channelId: string, options: MessageOptions = {}) => {
      return dispatch(getMessages(apiClient, cacheService, channelId, options));
    },
    [dispatch, apiClient, cacheService],
  );

  // Action pour charger les réponses d'un thread
  const loadThreadReplies = useCallback(
    async (rootMessageId: string) => {
      return dispatch(getThreadMessages(apiClient, rootMessageId));
    },
    [dispatch, apiClient],
  );

  // Action pour envoyer un message
  const sendMessage = useCallback(
    async (channelId: string, message: string, fileIds?: string[]) => {
      return dispatch(
        sendMessageAction(apiClient, channelId, message, fileIds),
      );
    },
    [dispatch, apiClient],
  );

  // Action pour répondre à un message
  const replyToMessage = useCallback(
    async (
      channelId: string,
      rootMessageId: string,
      message: string,
      fileIds?: string[],
    ) => {
      return dispatch(
        replyToMessageAction(
          apiClient,
          channelId,
          rootMessageId,
          message,
          fileIds,
        ),
      );
    },
    [dispatch, apiClient],
  );

  // Action pour éditer un message
  const editMessage = useCallback(
    async (messageId: string, newMessage: string) => {
      return dispatch(editMessageAction(apiClient, messageId, newMessage));
    },
    [dispatch, apiClient],
  );

  // Action pour supprimer un message
  const deleteMessage = useCallback(
    async (messageId: string, channelId: string) => {
      return dispatch(deleteMessageAction(apiClient, messageId, channelId));
    },
    [dispatch, apiClient],
  );

  // Actions pour les réactions
  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      return dispatch(addReactionAction(apiClient, messageId, emoji));
    },
    [dispatch, apiClient],
  );

  const removeReaction = useCallback(
    async (messageId: string, emoji: string, channelId: string) => {
      return dispatch(
        removeReactionAction(apiClient, messageId, emoji, channelId),
      );
    },
    [dispatch, apiClient],
  );

  // Actions pour l'UI
  const setHighlightedMessage = useCallback(
    (messageId: string | null) => {
      dispatch(setHighlightedMessageAction(messageId));
    },
    [dispatch],
  );

  const setReplyTo = useCallback(
    (message: Message | null) => {
      dispatch(setReplyToMessageAction(message));
    },
    [dispatch],
  );

  const startEditingMessage = useCallback(
    (messageId: string) => {
      dispatch(startEditingMessageAction(messageId));
    },
    [dispatch],
  );

  const cancelEditingMessage = useCallback(() => {
    dispatch(cancelEditingMessageAction());
  }, [dispatch]);

  return {
    // État
    messagesByChannel: messagesState.messagesByChannel,
    threadMessages: messagesState.threadMessages,
    loadingStates: messagesState.loadingStates,
    threadLoadingStates: messagesState.threadLoadingStates,
    highlightedMessageId: messagesState.highlightedMessageId,
    replyToMessage: messagesState.replyToMessage,
    editingMessageId: messagesState.editingMessageId,

    // Actions
    loadMessages,
    loadThreadReplies,
    sendMessage,
    replyToMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    setHighlightedMessage,
    setReplyTo,
    startEditingMessage,
    cancelEditingMessage,
  };
}
