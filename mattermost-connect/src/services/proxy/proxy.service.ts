// src/services/proxy/proxy.service.ts
import { BaseService } from "../base";
import {
  MattermostService,
  GetMessagesOptions,
  GetUsersOptions,
  MessagesResponse,
} from "../base";
import { User, Message, Channel, Team } from "../../types";
import { HttpClient, createProxyHttpClient } from "../http";
import { AuthManager, createProxyAuthManager } from "../auth";
import { TeamServiceInterface, createTeamService } from "../team";
import { ChannelServiceInterface, createChannelService } from "../channel";
import { MessageServiceInterface, createMessageService } from "../message";
import { UserServiceInterface, createUserService } from "../user";
import { ReactionServiceInterface, createReactionService } from "../reaction";
import { ErrorHandlerInterface, createErrorHandler } from "../error";

/**
 * Configuration pour le service proxy
 */
export interface ProxyServiceConfig {
  /** URL du serveur proxy */
  proxyUrl: string;
  /** ID client pour l'identification */
  clientId: string;
  /** ID utilisateur (optionnel) */
  userId?: string;
  /** Utiliser le stockage local pour la persistance du token */
  useLocalStorage?: boolean;
}

/**
 * Service implémentant la communication via un serveur intermédiaire
 * Agit comme une façade déléguant aux services spécialisés
 */
export class ProxyService extends BaseService implements MattermostService {
  private readonly httpClient: HttpClient;
  private authManager: AuthManager;
  private teamService: TeamServiceInterface;
  private channelService: ChannelServiceInterface;
  private messageService: MessageServiceInterface;
  private readonly userService: UserServiceInterface;
  private readonly reactionService: ReactionServiceInterface;
  private readonly errorHandler: ErrorHandlerInterface;

  private readonly clientId: string;
  private userId?: string;

  public readonly mode: "direct" | "proxy" | "custom" = "proxy";

  /**
   * Crée une nouvelle instance du service proxy
   * @param proxyUrl URL du serveur proxy
   * @param clientId ID client pour l'identification
   * @param userId ID utilisateur (optionnel)
   * @param useLocalStorage Utiliser le stockage local pour la persistance du token
   */
  constructor(
    proxyUrl: string,
    clientId: string,
    userId?: string,
    useLocalStorage: boolean = false,
  ) {
    super(proxyUrl);

    this.clientId = clientId;
    this.userId = userId;

    // Créer le gestionnaire d'erreurs
    this.errorHandler = createErrorHandler();

    // Créer le client HTTP
    this.httpClient = createProxyHttpClient(proxyUrl, clientId, userId);

    // Créer le gestionnaire d'authentification
    this.authManager = createProxyAuthManager(
      this.httpClient,
      clientId,
      useLocalStorage,
      userId,
    );

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
  }

  /**
   * Implémentation de la méthode abstraite pour récupérer l'utilisateur courant
   * @protected
   */
  protected async fetchCurrentUser(): Promise<User> {
    try {
      const response = await this.httpClient.get<User>("users/me");

      // Mettre à jour l'ID utilisateur si ce n'est pas déjà fait
      if (response.data && response.data.id) {
        this.userId = response.data.id;

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

      // Mettre à jour l'ID utilisateur s'il est fourni dans le résultat
      if (result.userId) {
        this.userId = result.userId;
      }

      // Essayer de récupérer et mettre en cache l'utilisateur courant
      try {
        const user = await this.fetchCurrentUser();
        this.setCurrentUser(user);

        return {
          token: result.token,
          userId: this.userId || user.id, // Utiliser l'ID disponible
        };
      } catch (userError) {
        console.warn("Could not fetch user after authentication:", userError);
        return {
          token: result.token,
          userId: this.userId, // Renvoyer l'ID s'il est disponible
        };
      }
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error("Proxy authentication error:", typedError);
      throw typedError;
    }
  }

  async validateToken(token: string): Promise<boolean> {
    return this.authManager.validateToken(token);
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
    return this.teamService.getTeamUnreadCount(teamId, this.userId);
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
    return this.channelService.getChannelUnreadCount(channelId, this.userId);
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

  // ----- Méthodes GIF (adaptées pour le mode proxy) -----

  async searchGifs(query: string, category?: string): Promise<any[]> {
    try {
      let endpoint = `gifs/search?q=${encodeURIComponent(query)}`;
      if (category) {
        endpoint += `&category=${encodeURIComponent(category)}`;
      }

      const response = await this.httpClient.get<any[]>(endpoint);
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error("Error searching GIFs:", typedError);
      return [];
    }
  }

  async getGifs(category: string, limit: number = 20): Promise<any[]> {
    try {
      let endpoint =
        category.toLowerCase() === "trending"
          ? "gifs/trending"
          : `gifs/category/${encodeURIComponent(category.toLowerCase())}`;

      if (limit) {
        endpoint += `?limit=${limit}`;
      }

      const response = await this.httpClient.get<any[]>(endpoint);
      return response.data;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(`Error fetching GIFs:`, typedError);
      return [];
    }
  }

  // ----- Méthodes WebSocket -----

  getWebsocketUrl(): string {
    return `${this.baseUrl.replace(/^http/, "ws")}/websocket`;
  }

  async getWebsocketToken(): Promise<string> {
    try {
      const response = await this.httpClient.get<{ token: string }>(
        "websocket/token",
      );
      return response.data.token;
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error("Error getting WebSocket token:", typedError);
      throw typedError;
    }
  }

  // ----- Méthodes pour les fichiers -----

  async uploadFiles(formData: FormData): Promise<any> {
    try {
      // Traitement spécial pour les téléchargements de fichiers
      const headers: Record<string, string> = {
        "X-Mattermost-Client-ID": this.clientId,
      };

      if (this.userId) {
        headers["X-Mattermost-User-ID"] = this.userId;
      }

      const response = await fetch(`${this.baseUrl}/files`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error(error.message || `File upload error: ${response.status}`);
        return;
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
 * Crée un service proxy pour la communication avec Mattermost via un serveur intermédiaire
 * @param config Configuration pour le service proxy
 * @returns Service Mattermost
 */
export function createProxyService(
  config: ProxyServiceConfig,
): MattermostService {
  const { proxyUrl, clientId, userId, useLocalStorage = false } = config;

  // Valider les paramètres
  if (!proxyUrl || !clientId) {
    throw new Error("proxyUrl and clientId are required for proxy mode");
  }

  return new ProxyService(proxyUrl, clientId, userId, useLocalStorage);
}
