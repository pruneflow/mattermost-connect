// src/services/direct/direct.service.ts
import { BaseService } from "../base";
import {
  MattermostService,
  GetMessagesOptions,
  GetUsersOptions,
  MessagesResponse,
  ServiceConfig,
} from "../base";
import { User, Message, Channel, Team } from "../../types";
import { HttpClient, createDirectHttpClient } from "../http";
import { AuthManager, createDirectAuthManager } from "../auth";
import { TeamServiceInterface, createTeamService } from "../team/team.service";
import {
  ChannelServiceInterface,
  createChannelService,
} from "../channel/channel.service";
import {
  MessageServiceInterface,
  createMessageService,
} from "../message/message.service";
import { UserServiceInterface, createUserService } from "../user";
import {
  ReactionServiceInterface,
  createReactionService,
} from "../reaction/reaction.service";
import {
  ErrorHandlerInterface,
  createErrorHandler,
} from "../error/error-handler";

/**
 * Configuration pour le service direct
 */
export interface DirectServiceConfig {
  /** URL du serveur Mattermost */
  serverUrl: string;
  /** Token API utilisateur (optionnel) */
  token?: string;
  /** Utiliser le stockage local pour la persistance du token */
  useLocalStorage?: boolean;
}

/**
 * Service implémentant la communication directe avec un serveur Mattermost
 * Agit comme une façade déléguant aux services spécialisés
 */
export class DirectService extends BaseService implements MattermostService {
  private httpClient: HttpClient;
  private authManager: AuthManager;
  private teamService: TeamServiceInterface;
  private channelService: ChannelServiceInterface;
  private messageService: MessageServiceInterface;
  private userService: UserServiceInterface;
  private reactionService: ReactionServiceInterface;
  private errorHandler: ErrorHandlerInterface;

  public readonly mode: "direct" | "proxy" | "custom" = "direct";

  /**
   * Crée une nouvelle instance du service direct
   * @param serverUrl URL du serveur Mattermost
   * @param token Token API utilisateur (optionnel)
   * @param useLocalStorage Utiliser le stockage local pour la persistance du token
   */
  constructor(
    serverUrl: string,
    token?: string,
    useLocalStorage: boolean = false,
  ) {
    super(serverUrl);

    // Créer le gestionnaire d'erreurs
    this.errorHandler = createErrorHandler();

    // Créer le client HTTP
    this.httpClient = createDirectHttpClient(serverUrl, undefined);

    // Créer le gestionnaire d'authentification
    this.authManager = createDirectAuthManager(
      this.httpClient,
      serverUrl,
      useLocalStorage,
    );

    // Définir le token s'il est fourni
    if (token) {
      this.authManager.setToken(token);
    }

    // Créer les services spécialisés
    this.teamService = createTeamService(this.httpClient, this.errorHandler);
    this.channelService = createChannelService(
      this.httpClient,
      this.errorHandler,
    );
    this.messageService = createMessageService(
      this.httpClient,
      this.errorHandler,
    );
    this.userService = createUserService(this);
    this.reactionService = createReactionService(
      this.httpClient,
      this.errorHandler,
    );

    // Définir la fonction de fournisseur de token pour le client HTTP
    // Cela permet au client HTTP d'accéder au token actuel via l'authManager
    (this.httpClient as any).tokenProvider = () => this.authManager.getToken();
  }

  /**
   * Obtenir le token actuel
   */
  public get token(): string | null {
    return this.authManager.getToken();
  }

  /**
   * Implémentation de la méthode abstraite pour récupérer l'utilisateur courant
   * @protected
   */
  protected async fetchCurrentUser(): Promise<User> {
    try {
      const response = await this.httpClient.get<User>("users/me");

      // Si le service utilisateur a une méthode setCurrentUser, on l'utilise
      if (
        this.userService &&
        typeof (this.userService as any).setCurrentUserId === "function"
      ) {
        (this.userService as any).setCurrentUserId(response.data.id);
      }

      // Si le service de réactions a une méthode setCurrentUser, on l'utilise
      if (
        this.reactionService &&
        typeof (this.reactionService as any).setCurrentUserId === "function"
      ) {
        (this.reactionService as any).setCurrentUserId(response.data.id);
      }

      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error("Error fetching current user:", typedError);
      throw typedError;
    }
  }

  /**
   * Actualise les informations de l'utilisateur courant
   */
  async refreshCurrentUser(): Promise<User> {
    this._currentUser = null; // Vider le cache
    return this.getCurrentUser(); // Récupérer à nouveau l'utilisateur
  }

  // ----- Méthodes d'authentification (déléguées à authManager) -----

  async authenticate(
    username: string,
    password: string,
  ): Promise<{ token: string; serverUrl?: string; userId?: string }> {
    try {
      const result = await this.authManager.authenticate(username, password);

      // Essayer de récupérer et mettre en cache l'utilisateur courant
      try {
        const user = await this.fetchCurrentUser();
        this.setCurrentUser(user);

        return {
          token: result.token,
          serverUrl: this.baseUrl,
          userId: user.id,
        };
      } catch (error) {
        console.warn("Could not fetch user after authentication:", error);
        return {
          token: result.token,
          serverUrl: this.baseUrl,
        };
      }
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error("Authentication error:", typedError);
      throw typedError;
    }
  }

  async validateToken(tokenToValidate: string): Promise<boolean> {
    return this.authManager.validateToken(tokenToValidate);
  }

  // ----- Méthodes d'équipe (déléguées à teamService) -----

  async getTeams(): Promise<Team[]> {
    return this.teamService.getTeams();
  }

  async getTeam(teamId: string): Promise<Team> {
    return this.teamService.getTeam(teamId);
  }

  async getTeamUnreadCount(
    teamId: string,
  ): Promise<{ msg_count: number; mention_count: number }> {
    const userId = this._currentUser?.id;
    return this.teamService.getTeamUnreadCount(teamId, userId);
  }

  // ----- Méthodes de canal (déléguées à channelService) -----

  async getChannels(teamId: string): Promise<Channel[]> {
    return this.channelService.getChannels(teamId);
  }

  async getChannel(channelId: string): Promise<Channel> {
    return this.channelService.getChannel(channelId);
  }

  async viewChannel(channelId: string): Promise<{ status: "OK" }> {
    return this.channelService.viewChannel(channelId);
  }

  async getChannelUnreadCount(
    channelId: string,
  ): Promise<{ msg_count: number; mention_count: number }> {
    const userId = this._currentUser?.id;
    return this.channelService.getChannelUnreadCount(channelId, userId);
  }

  // ----- Méthodes de message (déléguées à messageService) -----

  async getChannelMessages(
    channelId: string,
    options: GetMessagesOptions = {},
  ): Promise<MessagesResponse> {
    return this.messageService.getChannelMessages(channelId, options);
  }

  async postMessage(
    channelId: string,
    message: string,
    fileIds?: string[],
  ): Promise<Message> {
    return this.messageService.postMessage(channelId, message, fileIds);
  }

  async getPost(messageId: string): Promise<Message> {
    return this.messageService.getMessage(messageId);
  }

  async editMessage(messageId: string, newMessage: string): Promise<Message> {
    return this.messageService.editMessage(messageId, newMessage);
  }

  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    return this.messageService.deleteMessage(messageId);
  }

  async replyToMessage(
    channelId: string,
    messageId: string,
    responseMessage: string,
    fileIds?: string[],
  ): Promise<Message> {
    return this.messageService.replyToMessage(
      channelId,
      messageId,
      responseMessage,
      fileIds,
    );
  }

  // ----- Méthodes d'utilisateur (déléguées à userService) -----

  async getUsers(options: GetUsersOptions = {}): Promise<User[]> {
    return this.userService.getUsers(options);
  }

  async getUserStatus(userId: string): Promise<any> {
    return this.userService.getUserStatus(userId);
  }

  // ----- Méthodes de réaction (déléguées à reactionService) -----

  async getFrequentEmojis(): Promise<string[]> {
    return this.reactionService.getFrequentEmojis();
  }

  async addReaction(messageId: string, emoji: string): Promise<any> {
    return this.reactionService.addReaction(messageId, emoji);
  }

  async removeReaction(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<any> {
    return this.reactionService.removeReaction(channelId, messageId, emoji);
  }

  async hasReacted(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<boolean> {
    return this.reactionService.hasReacted(channelId, messageId, emoji);
  }

  // ----- Méthodes GIF -----
  // Implémentations simplifiées pour maintenir la compatibilité

  async searchGifs(query: string, category?: string): Promise<any[]> {
    // Implémentation minimale - à améliorer dans un service dédié aux GIFs
    return [];
  }

  async getGifs(category: string, limit: number = 20): Promise<any[]> {
    // Implémentation minimale - à améliorer dans un service dédié aux GIFs
    return [];
  }

  // ----- Méthodes WebSocket -----

  getWebsocketUrl(): string {
    return this.baseUrl.replace(/^http/, "ws") + "/api/v4/websocket";
  }

  async getWebsocketToken(): Promise<string> {
    return this.token || "";
  }

  // ----- Méthodes pour les fichiers -----

  async uploadFiles(formData: FormData): Promise<any> {
    try {
      // Traitement spécial pour les téléchargements de fichiers car ils utilisent FormData
      const response = await fetch(`${this.baseUrl}/api/v4/files`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message || `File upload error: ${response.status}`,
        );
      }

      return response.json();
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error("Error uploading files:", typedError);
      throw typedError;
    }
  }
}

/**
 * Crée un service direct pour la communication avec un serveur Mattermost
 * @param config Configuration pour le service direct
 * @returns Service Mattermost
 */
export function createDirectService(
  config: DirectServiceConfig,
): MattermostService {
  const { serverUrl, token, useLocalStorage = false } = config;

  // Valider les paramètres
  if (!serverUrl) {
    throw new Error("serverUrl is required for direct mode");
  }

  return new DirectService(serverUrl, token, useLocalStorage);
}
