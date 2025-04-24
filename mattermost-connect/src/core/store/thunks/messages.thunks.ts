// src/core/store/thunks/messages.thunks.ts
import { ApiClient } from "../../api/client";
import { CacheService } from "../../services/cache.service";
import { Dispatch } from "../store";
import { Message } from "../slices/messages.slice";

/**
 * Charge les messages d'un canal
 */
export const getMessages =
  (
    apiClient: ApiClient,
    cacheService: CacheService,
    channelId: string,
    options: any = {},
  ) =>
  async (dispatch: Dispatch) => {
    if (!channelId) return [];

    dispatch({
      type: "MESSAGES_FETCH_REQUEST",
      payload: { channelId, options },
    });

    try {
      // Vérifier le cache seulement si on ne force pas le rechargement
      // et qu'on ne demande pas une pagination spécifique
      const cacheKey = `messages_${channelId}`;
      if (
        !options.forceRefresh &&
        !options.before &&
        !options.after &&
        !options.since
      ) {
        const cachedMessages = cacheService.get(cacheKey) as
          | Message[]
          | undefined;
        if (cachedMessages) {
          dispatch({
            type: "MESSAGES_FETCH_SUCCESS",
            payload: { channelId, messages: cachedMessages, fromCache: true },
          });
          return cachedMessages;
        }
      }

      // Préparer les paramètres de requête
      const { page = 0, perPage = 60, since = 0, before, after } = options;
      let endpoint = `channels/${channelId}/posts?page=${page}&per_page=${perPage}`;

      if (since) endpoint += `&since=${since}`;
      if (before) endpoint += `&before=${before}`;
      if (after) endpoint += `&after=${after}`;

      // Appel API
      const response = await apiClient.get(endpoint);

      // Transformer les posts en tableau ordonné
      const { posts, order } = response.data;
      const messages = order
        .map((postId: string) => posts[postId])
        .filter(Boolean);

      // Mettre en cache uniquement si c'est la première page sans filtre
      if (!before && !after && !since && page === 0) {
        cacheService.set(cacheKey, messages);
      }

      // Dispatch du succès
      dispatch({
        type: "MESSAGES_FETCH_SUCCESS",
        payload: { channelId, messages },
      });

      return messages;
    } catch (error) {
      dispatch({
        type: "MESSAGES_FETCH_ERROR",
        payload: { channelId, error },
      });
      return [];
    }
  };

/**
 * Charge les messages d'un thread
 */
export const getThreadMessages =
  (apiClient: ApiClient, rootMessageId: string) =>
  async (dispatch: Dispatch) => {
    if (!rootMessageId) return [];

    dispatch({
      type: "THREAD_MESSAGES_FETCH_REQUEST",
      payload: { rootMessageId },
    });

    try {
      // Appel API pour récupérer le thread complet
      const response = await apiClient.get(`posts/${rootMessageId}/thread`);

      // Transformer les posts en tableau (similaire à getMessages)
      const { posts, order } = response.data;
      const messages = order
        .map((postId: string) => posts[postId])
        .filter((message: Message) => message.id !== rootMessageId); // Exclure le message racine

      // Dispatch du succès
      dispatch({
        type: "THREAD_MESSAGES_FETCH_SUCCESS",
        payload: { rootMessageId, messages },
      });

      return messages;
    } catch (error) {
      dispatch({
        type: "THREAD_MESSAGES_FETCH_ERROR",
        payload: { rootMessageId, error },
      });
      return [];
    }
  };

/**
 * Envoie un message dans un canal
 */
export const sendMessage =
  (
    apiClient: ApiClient,
    channelId: string,
    message: string,
    fileIds?: string[],
  ) =>
  async (dispatch: Dispatch) => {
    if (!channelId || (!message && (!fileIds || fileIds.length === 0))) {
      return null;
    }

    try {
      const response = await apiClient.post("posts", {
        channel_id: channelId,
        message: message || "",
        file_ids: fileIds || [],
      });

      const newMessage = response.data;

      dispatch({
        type: "MESSAGE_SEND_SUCCESS",
        payload: { channelId, message: newMessage },
      });

      return newMessage;
    } catch (error) {
      dispatch({
        type: "MESSAGE_SEND_ERROR",
        payload: { channelId, error },
      });
      return null;
    }
  };

/**
 * Répond à un message
 */
export const replyToMessageAction =
  (
    apiClient: ApiClient,
    channelId: string,
    rootMessageId: string,
    message: string,
    fileIds?: string[],
  ) =>
  async (dispatch: Dispatch) => {
    if (
      !channelId ||
      !rootMessageId ||
      (!message && (!fileIds || fileIds.length === 0))
    ) {
      return null;
    }

    try {
      const response = await apiClient.post("posts", {
        channel_id: channelId,
        message: message || "",
        root_id: rootMessageId,
        file_ids: fileIds || [],
      });

      const newMessage = response.data;

      dispatch({
        type: "MESSAGE_REPLY_SUCCESS",
        payload: { message: newMessage },
      });

      return newMessage;
    } catch (error) {
      dispatch({
        type: "MESSAGE_REPLY_ERROR",
        payload: { rootMessageId, error },
      });
      return null;
    }
  };

/**
 * Actions UI pour les messages
 */
export const setHighlightedMessageAction = (messageId: string | null) => ({
  type: "MESSAGE_SET_HIGHLIGHTED",
  payload: { messageId },
});

export const setReplyToMessageAction = (message: Message | null) => ({
  type: "MESSAGE_SET_REPLY_TO",
  payload: { message },
});

export const startEditingMessageAction = (messageId: string) => ({
  type: "MESSAGE_START_EDITING",
  payload: { messageId },
});

export const cancelEditingMessageAction = () => ({
  type: "MESSAGE_CANCEL_EDITING",
});

/**
 * Édite un message
 */
export const editMessageAction =
  (apiClient: ApiClient, messageId: string, newMessage: string) =>
  async (dispatch: Dispatch) => {
    if (!messageId || !newMessage) return null;

    try {
      // Récupérer d'abord le message existant
      const response = await apiClient.get(`posts/${messageId}`);
      const originalMessage = response.data;

      // Mettre à jour le message
      const patchResponse = await apiClient.put(`posts/${messageId}/patch`, {
        message: newMessage,
        file_ids: originalMessage.file_ids,
        has_reactions: originalMessage.has_reactions,
        props: originalMessage.props,
      });

      const updatedMessage = patchResponse.data;

      dispatch({
        type: "MESSAGE_EDIT_SUCCESS",
        payload: { message: updatedMessage },
      });

      return updatedMessage;
    } catch (error) {
      dispatch({
        type: "MESSAGE_EDIT_ERROR",
        payload: { messageId, error },
      });
      return null;
    }
  };

/**
 * Supprime un message
 */
export const deleteMessageAction =
  (apiClient: ApiClient, messageId: string, channelId: string) =>
  async (dispatch: Dispatch) => {
    if (!messageId) return false;

    try {
      await apiClient.delete(`posts/${messageId}`);

      dispatch({
        type: "MESSAGE_DELETE_SUCCESS",
        payload: { messageId, channelId },
      });

      return true;
    } catch (error) {
      dispatch({
        type: "MESSAGE_DELETE_ERROR",
        payload: { messageId, error },
      });
      return false;
    }
  };

/**
 * Ajoute une réaction à un message
 */
export const addReactionAction =
  (apiClient: ApiClient, messageId: string, emoji: string) =>
  async (dispatch: Dispatch, getState: any) => {
    if (!messageId || !emoji) return false;

    try {
      // Récupérer l'ID utilisateur depuis l'état
      const userId = getState().auth.currentUser?.id;
      if (!userId) throw new Error("User ID not available");

      // Ajouter la réaction
      await apiClient.post("reactions", {
        post_id: messageId,
        emoji_name: emoji,
        user_id: userId,
      });

      dispatch({
        type: "REACTION_ADD_SUCCESS",
        payload: { messageId, emoji, userId },
      });

      return true;
    } catch (error) {
      dispatch({
        type: "REACTION_ADD_ERROR",
        payload: { messageId, emoji, error },
      });
      return false;
    }
  };

/**
 * Supprime une réaction d'un message
 */
export const removeReactionAction =
  (apiClient: ApiClient, messageId: string, emoji: string, channelId: string) =>
  async (dispatch: Dispatch, getState: any) => {
    if (!messageId || !emoji) return false;

    try {
      // Récupérer l'ID utilisateur depuis l'état
      const userId = getState().auth.currentUser?.id;
      if (!userId) throw new Error("User ID not available");

      // Supprimer la réaction
      await apiClient.delete(
        `users/${userId}/posts/${messageId}/reactions/${emoji}`,
      );

      dispatch({
        type: "REACTION_REMOVE_SUCCESS",
        payload: { messageId, emoji, userId },
      });

      return true;
    } catch (error) {
      dispatch({
        type: "REACTION_REMOVE_ERROR",
        payload: { messageId, emoji, error },
      });
      return false;
    }
  };
