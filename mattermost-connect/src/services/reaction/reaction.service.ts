// src/services/reaction/reaction.service.ts
import { HttpClient } from "../http";
import { ErrorHandlerInterface } from "../error/error-handler";

/**
 * Interface pour le service de gestion des réactions
 * Centralise toutes les opérations liées aux réactions et emojis
 */
export interface ReactionServiceInterface {
  /**
   * Récupère les emojis fréquemment utilisés par l'utilisateur
   * @returns Liste des emojis fréquents
   */
  getFrequentEmojis(): Promise<string[]>;

  /**
   * Ajoute une réaction à un message
   * @param messageId ID du message
   * @param emoji Emoji à ajouter
   * @returns Résultat de l'opération
   */
  addReaction(messageId: string, emoji: string): Promise<any>;

  /**
   * Supprime une réaction d'un message
   * @param channelId ID du canal
   * @param messageId ID du message
   * @param emoji Emoji à supprimer
   * @returns Résultat de l'opération
   */
  removeReaction(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<any>;

  /**
   * Vérifie si l'utilisateur courant a réagi avec un emoji spécifique
   * @param channelId ID du canal
   * @param messageId ID du message
   * @param emoji Emoji à vérifier
   * @returns true si l'utilisateur a réagi avec cet emoji
   */
  hasReacted(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<boolean>;

  /**
   * Récupère toutes les réactions pour un message
   * @param messageId ID du message
   * @returns Liste des réactions
   */
  getReactions(messageId: string): Promise<any[]>;
}

/**
 * Implémentation du service de gestion des réactions
 */
export class ReactionService implements ReactionServiceInterface {
  private httpClient: HttpClient;
  private errorHandler: ErrorHandlerInterface;
  private currentUserId: string | null = null;

  /**
   * Crée une nouvelle instance du service de réactions
   * @param httpClient Client HTTP pour les appels API
   * @param errorHandler Gestionnaire d'erreurs
   */
  constructor(httpClient: HttpClient, errorHandler: ErrorHandlerInterface) {
    this.httpClient = httpClient;
    this.errorHandler = errorHandler;
  }

  /**
   * Définit l'ID de l'utilisateur courant
   * @param userId ID de l'utilisateur courant
   */
  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId;
  }

  /**
   * Récupère les emojis fréquemment utilisés
   */
  async getFrequentEmojis(): Promise<string[]> {
    const defaultEmojis = ["👍", "❤️", "😂", "🎉", "🔥", "👏", "✅", "🙏"];

    try {
      // Pour l'API directe de Mattermost, il n'y a pas d'endpoint spécifique
      // On pourrait implémenter ceci avec des préférences utilisateur ou de l'historique
      // Pour l'instant on retourne une liste par défaut
      return defaultEmojis;
    } catch (error) {
      console.warn("Error fetching frequent emojis:", error);
      return defaultEmojis;
    }
  }

  /**
   * Ajoute une réaction à un message
   */
  async addReaction(messageId: string, emoji: string): Promise<any> {
    if (!messageId || !emoji) {
      throw new Error("messageId and emoji are required");
    }

    if (!this.currentUserId) {
      throw new Error("Current user ID is required to add reactions");
    }

    try {
      const response = await this.httpClient.post<any>("reactions", {
        post_id: messageId,
        emoji_name: emoji,
        user_id: this.currentUserId,
      });
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(
        `Error adding reaction ${emoji} to message ${messageId}:`,
        typedError,
      );
      throw typedError;
    }
  }

  /**
   * Supprime une réaction d'un message
   */
  async removeReaction(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<any> {
    if (!messageId || !emoji) {
      throw new Error("messageId and emoji are required");
    }

    if (!this.currentUserId) {
      throw new Error("Current user ID is required to remove reactions");
    }

    try {
      // L'endpoint de suppression de réaction requiert le user_id
      const endpoint = `users/${this.currentUserId}/posts/${messageId}/reactions/${emoji}`;
      const response = await this.httpClient.delete<any>(endpoint);
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(
        `Error removing reaction ${emoji} from message ${messageId}:`,
        typedError,
      );
      throw typedError;
    }
  }

  /**
   * Vérifie si l'utilisateur courant a réagi avec un emoji spécifique
   */
  async hasReacted(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<boolean> {
    if (!messageId || !emoji) {
      throw new Error("messageId and emoji are required");
    }

    if (!this.currentUserId) {
      return false;
    }

    try {
      // Récupérer toutes les réactions du message
      const reactions = await this.getReactions(messageId);

      // Vérifier si l'utilisateur courant a réagi avec cet emoji
      return reactions.some(
        (reaction) =>
          reaction.emoji_name === emoji &&
          reaction.user_id === this.currentUserId,
      );
    } catch (error) {
      console.error(
        `Error checking reaction ${emoji} for message ${messageId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Récupère toutes les réactions pour un message
   */
  async getReactions(messageId: string): Promise<any[]> {
    if (!messageId) {
      throw new Error("messageId is required");
    }

    try {
      const response = await this.httpClient.get<any[]>(
        `posts/${messageId}/reactions`,
      );
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(
        `Error fetching reactions for message ${messageId}:`,
        typedError,
      );
      throw typedError;
    }
  }
}

/**
 * Crée un service de gestion des réactions
 * @param httpClient Client HTTP pour les appels API
 * @param errorHandler Gestionnaire d'erreurs
 * @returns Une instance du service de réactions
 */
export function createReactionService(
  httpClient: HttpClient,
  errorHandler: ErrorHandlerInterface,
): ReactionServiceInterface {
  return new ReactionService(httpClient, errorHandler);
}

export default {
  ReactionService,
  createReactionService,
};
