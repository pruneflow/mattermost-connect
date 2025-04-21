// src/services/channel/channel.service.ts
import { Channel } from "../../types";
import { HttpClient } from "../http";
import { ErrorHandlerInterface } from "../error/error-handler";

/**
 * Interface pour le service de gestion des canaux
 * Centralise toutes les opérations liées aux canaux
 */
export interface ChannelServiceInterface {
  /**
   * Récupère tous les canaux d'une équipe
   * @param teamId ID de l'équipe
   * @returns Liste des canaux
   */
  getChannels(teamId: string): Promise<Channel[]>;

  /**
   * Récupère un canal spécifique par son ID
   * @param channelId ID du canal
   * @returns Détails du canal
   */
  getChannel(channelId: string): Promise<Channel>;

  /**
   * Marque un canal comme vu (réinitialise les non-lus)
   * @param channelId ID du canal
   * @returns Statut de l'opération
   */
  viewChannel(channelId: string): Promise<{ status: "OK" }>;

  /**
   * Récupère le compteur de messages non lus pour un canal
   * @param channelId ID du canal
   * @param userId ID de l'utilisateur (optionnel)
   * @returns Compteurs de messages et mentions non lus
   */
  getChannelUnreadCount(
    channelId: string,
    userId?: string,
  ): Promise<{ msg_count: number; mention_count: number }>;

  /**
   * Récupère la liste des membres d'un canal
   * @param channelId ID du canal
   * @returns Liste des membres du canal
   */
  getChannelMembers(channelId: string): Promise<any[]>;
}

/**
 * Implémentation du service de gestion des canaux
 */
export class ChannelService implements ChannelServiceInterface {
  private httpClient: HttpClient;
  private errorHandler: ErrorHandlerInterface;
  private currentUserId: string | null = null;

  /**
   * Crée une nouvelle instance du service de canaux
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
   * Récupère tous les canaux d'une équipe
   */
  async getChannels(teamId: string): Promise<Channel[]> {
    if (!teamId || teamId === "") return [];

    try {
      const response = await this.httpClient.get<Channel[]>(
        `users/me/teams/${teamId}/channels`,
      );
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(`Error fetching channels for team ${teamId}:`, typedError);
      throw typedError;
    }
  }

  /**
   * Récupère un canal spécifique par son ID
   */
  async getChannel(channelId: string): Promise<Channel> {
    if (!channelId) {
      throw new Error("channelId is required");
    }

    try {
      const response = await this.httpClient.get<Channel>(
        `channels/${channelId}`,
      );
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(`Error fetching channel ${channelId}:`, typedError);
      throw typedError;
    }
  }

  /**
   * Marque un canal comme vu (réinitialise les non-lus)
   */
  async viewChannel(channelId: string): Promise<{ status: "OK" }> {
    if (!channelId) {
      throw new Error("channelId is required to mark a channel as read");
    }

    try {
      const response = await this.httpClient.post<{ status: "OK" }>(
        "channels/members/me/view",
        { channel_id: channelId },
      );
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(
        `Error marking channel ${channelId} as viewed:`,
        typedError,
      );
      throw typedError;
    }
  }

  /**
   * Récupère le compteur de messages non lus pour un canal
   */
  async getChannelUnreadCount(
    channelId: string,
    userId?: string,
  ): Promise<{ msg_count: number; mention_count: number }> {
    if (!channelId) {
      throw new Error("channelId is required");
    }

    try {
      const userIdToUse = userId || this.currentUserId || "me";
      const endpoint = `users/${userIdToUse}/channels/${channelId}/unread`;

      const response = await this.httpClient.get<{
        msg_count: number;
        mention_count: number;
      }>(endpoint);

      return response.data;
    } catch (error) {
      console.error(
        `Error getting unread count for channel ${channelId}:`,
        error,
      );
      return { msg_count: 0, mention_count: 0 };
    }
  }

  /**
   * Récupère la liste des membres d'un canal
   */
  async getChannelMembers(channelId: string): Promise<any[]> {
    if (!channelId) {
      throw new Error("channelId is required");
    }

    try {
      const response = await this.httpClient.get<any[]>(
        `channels/${channelId}/members`,
      );
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(
        `Error fetching members for channel ${channelId}:`,
        typedError,
      );
      throw typedError;
    }
  }
}

/**
 * Crée un service de gestion des canaux
 * @param httpClient Client HTTP pour les appels API
 * @param errorHandler Gestionnaire d'erreurs
 * @returns Une instance du service de canaux
 */
export function createChannelService(
  httpClient: HttpClient,
  errorHandler: ErrorHandlerInterface,
): ChannelServiceInterface {
  return new ChannelService(httpClient, errorHandler);
}

export default {
  ChannelService,
  createChannelService,
};
