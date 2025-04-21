// src/services/team/team.service.ts
import { Team } from "../../types";
import { HttpClient } from "../http";
import { ErrorHandlerInterface } from "../error/error-handler";

/**
 * Interface pour le service de gestion des équipes
 * Centralise toutes les opérations liées aux équipes
 */
export interface TeamServiceInterface {
  /**
   * Récupère toutes les équipes accessibles par l'utilisateur courant
   * @returns Liste des équipes
   */
  getTeams(): Promise<Team[]>;

  /**
   * Récupère une équipe spécifique par son ID
   * @param teamId ID de l'équipe
   * @returns Détails de l'équipe
   */
  getTeam(teamId: string): Promise<Team>;

  /**
   * Récupère le compteur de messages non lus pour une équipe
   * @param teamId ID de l'équipe
   * @param userId ID de l'utilisateur (optionnel)
   * @returns Compteurs de messages et mentions non lus
   */
  getTeamUnreadCount(
    teamId: string,
    userId?: string,
  ): Promise<{ msg_count: number; mention_count: number }>;
}

/**
 * Implémentation du service de gestion des équipes
 */
export class TeamService implements TeamServiceInterface {
  private httpClient: HttpClient;
  private errorHandler: ErrorHandlerInterface;
  private currentUserId: string | null = null;

  /**
   * Crée une nouvelle instance du service d'équipe
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
   * Récupère toutes les équipes accessibles par l'utilisateur courant
   */
  async getTeams(): Promise<Team[]> {
    try {
      const response = await this.httpClient.get<Team[]>("users/me/teams");
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error("Error fetching teams:", typedError);
      throw typedError;
    }
  }

  /**
   * Récupère une équipe spécifique par son ID
   */
  async getTeam(teamId: string): Promise<Team> {
    if (!teamId) {
      throw new Error("teamId is required");
    }

    try {
      const response = await this.httpClient.get<Team>(`teams/${teamId}`);
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(`Error fetching team ${teamId}:`, typedError);
      throw typedError;
    }
  }

  /**
   * Récupère le compteur de messages non lus pour une équipe
   */
  async getTeamUnreadCount(
    teamId: string,
    userId?: string,
  ): Promise<{ msg_count: number; mention_count: number }> {
    if (!teamId) {
      throw new Error("teamId is required");
    }

    try {
      const userIdToUse = userId || this.currentUserId || "me";
      const endpoint = `users/${userIdToUse}/teams/${teamId}/unread`;

      const response = await this.httpClient.get<{
        msg_count: number;
        mention_count: number;
      }>(endpoint);

      return response.data;
    } catch (error) {
      console.error(`Error getting unread count for team ${teamId}:`, error);
      return { msg_count: 0, mention_count: 0 };
    }
  }
}

/**
 * Crée un service de gestion des équipes
 * @param httpClient Client HTTP pour les appels API
 * @param errorHandler Gestionnaire d'erreurs
 * @returns Une instance du service d'équipe
 */
export function createTeamService(
  httpClient: HttpClient,
  errorHandler: ErrorHandlerInterface,
): TeamServiceInterface {
  return new TeamService(httpClient, errorHandler);
}

export default {
  TeamService,
  createTeamService,
};
