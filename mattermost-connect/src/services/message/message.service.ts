// src/services/message/message.service.ts
import { Message, MessagesResponse } from "../../types";
import { HttpClient } from "../http";
import { ErrorHandlerInterface } from "../error/error-handler";

/**
 * Options pour la récupération des messages
 */
export interface GetMessagesOptions {
  /** Numéro de page */
  page?: number;
  /** Nombre de messages par page */
  perPage?: number;
  /** Timestamp depuis lequel récupérer les messages */
  since?: number;
  /** ID du message avant lequel récupérer les messages */
  before?: string;
  /** ID du message après lequel récupérer les messages */
  after?: string;
}

/**
 * Interface pour le service de gestion des messages
 * Centralise toutes les opérations liées aux messages
 */
export interface MessageServiceInterface {
  /**
   * Récupère les messages d'un canal
   * @param channelId ID du canal
   * @param options Options de pagination et filtrage
   * @returns Réponse contenant les messages et l'ordre
   */
  getChannelMessages(
    channelId: string,
    options?: GetMessagesOptions,
  ): Promise<MessagesResponse>;

  /**
   * Récupère un message spécifique par son ID
   * @param messageId ID du message
   * @returns Détails du message
   */
  getMessage(messageId: string): Promise<Message>;

  /**
   * Envoie un nouveau message dans un canal
   * @param channelId ID du canal
   * @param message Contenu du message
   * @param fileIds IDs des fichiers attachés (optionnel)
   * @returns Message créé
   */
  postMessage(
    channelId: string,
    message: string,
    fileIds?: string[],
  ): Promise<Message>;

  /**
   * Modifie un message existant
   * @param messageId ID du message
   * @param newMessage Nouveau contenu du message
   * @returns Message modifié
   */
  editMessage(messageId: string, newMessage: string): Promise<Message>;

  /**
   * Supprime un message
   * @param messageId ID du message
   * @returns Statut de la suppression
   */
  deleteMessage(messageId: string): Promise<{ success: boolean }>;

  /**
   * Répond à un message
   * @param channelId ID du canal
   * @param messageId ID du message original
   * @param responseMessage Contenu de la réponse
   * @param fileIds IDs des fichiers attachés (optionnel)
   * @returns Message de réponse créé
   */
  replyToMessage(
    channelId: string,
    messageId: string,
    responseMessage: string,
    fileIds?: string[],
  ): Promise<Message>;
}

/**
 * Implémentation du service de gestion des messages
 */
export class MessageService implements MessageServiceInterface {
  private httpClient: HttpClient;
  private errorHandler: ErrorHandlerInterface;

  /**
   * Crée une nouvelle instance du service de messages
   * @param httpClient Client HTTP pour les appels API
   * @param errorHandler Gestionnaire d'erreurs
   */
  constructor(httpClient: HttpClient, errorHandler: ErrorHandlerInterface) {
    this.httpClient = httpClient;
    this.errorHandler = errorHandler;
  }

  /**
   * Récupère les messages d'un canal
   */
  async getChannelMessages(
    channelId: string,
    options: GetMessagesOptions = {},
  ): Promise<MessagesResponse> {
    if (!channelId) {
      throw new Error("channelId is required");
    }

    const { page = 0, perPage = 60, since = 0, before, after } = options;

    let endpoint = `channels/${channelId}/posts?page=${page}&per_page=${perPage}`;

    if (since) endpoint += `&since=${since}`;
    if (before) endpoint += `&before=${before}`;
    if (after) endpoint += `&after=${after}`;

    try {
      const response = await this.httpClient.get<MessagesResponse>(endpoint);
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(
        `Error fetching messages for channel ${channelId}:`,
        typedError,
      );
      throw typedError;
    }
  }

  /**
   * Récupère un message spécifique par son ID
   */
  async getMessage(messageId: string): Promise<Message> {
    if (!messageId) {
      throw new Error("messageId is required");
    }

    try {
      const response = await this.httpClient.get<Message>(`posts/${messageId}`);
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(`Error fetching message ${messageId}:`, typedError);
      throw typedError;
    }
  }

  /**
   * Envoie un nouveau message dans un canal
   */
  async postMessage(
    channelId: string,
    message: string,
    fileIds?: string[],
  ): Promise<Message> {
    if (!channelId) {
      throw new Error("channelId is required");
    }

    if (!message && (!fileIds || fileIds.length === 0)) {
      throw new Error("Message content or file attachments are required");
    }

    try {
      const response = await this.httpClient.post<Message>("posts", {
        channel_id: channelId,
        message: message || "",
        file_ids: fileIds || [],
      });
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(
        `Error posting message to channel ${channelId}:`,
        typedError,
      );
      throw typedError;
    }
  }

  /**
   * Modifie un message existant
   */
  async editMessage(messageId: string, newMessage: string): Promise<Message> {
    if (!messageId) {
      throw new Error("messageId is required");
    }

    if (!newMessage) {
      throw new Error("New message content is required");
    }

    try {
      // Récupérer le message existant pour garder ses propriétés
      const originalMessage = await this.getMessage(messageId);

      // Mettre à jour le message
      const response = await this.httpClient.put<Message>(
        `posts/${messageId}/patch`,
        {
          message: newMessage,
          file_ids: originalMessage.file_ids,
          has_reactions: originalMessage.has_reactions,
          props: originalMessage.props,
        },
      );
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(`Error editing message ${messageId}:`, typedError);
      throw typedError;
    }
  }

  /**
   * Supprime un message
   */
  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    if (!messageId) {
      throw new Error("messageId is required");
    }

    try {
      await this.httpClient.delete(`posts/${messageId}`);
      return { success: true };
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(`Error deleting message ${messageId}:`, typedError);
      throw typedError;
    }
  }

  /**
   * Répond à un message
   */
  async replyToMessage(
    channelId: string,
    messageId: string,
    responseMessage: string,
    fileIds?: string[],
  ): Promise<Message> {
    if (!channelId || !messageId) {
      throw new Error("channelId and messageId are required");
    }

    if (!responseMessage && (!fileIds || fileIds.length === 0)) {
      throw new Error(
        "Response message content or file attachments are required",
      );
    }

    try {
      const response = await this.httpClient.post<Message>("posts", {
        channel_id: channelId,
        message: responseMessage || "",
        root_id: messageId,
        file_ids: fileIds || [],
      });
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(`Error replying to message ${messageId}:`, typedError);
      throw typedError;
    }
  }
}

/**
 * Crée un service de gestion des messages
 * @param httpClient Client HTTP pour les appels API
 * @param errorHandler Gestionnaire d'erreurs
 * @returns Une instance du service de messages
 */
export function createMessageService(
  httpClient: HttpClient,
  errorHandler: ErrorHandlerInterface,
): MessageServiceInterface {
  return new MessageService(httpClient, errorHandler);
}

export default {
  MessageService,
  createMessageService,
};
