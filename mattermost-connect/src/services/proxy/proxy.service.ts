// src/services/proxy/proxy.service.ts
import { BaseService } from "../base";
import {
  MattermostService,
  GetMessagesOptions,
  GetUsersOptions,
  MessagesResponse,
} from "../base";
import { User, Message, Channel, Team } from "../../types";

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
}

/**
 * Service proxy implémentant la communication via un serveur intermédiaire
 * Suit la même interface que le service direct mais communique via un proxy
 */
export class ProxyService extends BaseService implements MattermostService {
  private clientId: string;
  private userId?: string;
  public readonly mode: "direct" | "proxy" | "custom" = "proxy";

  /**
   * Crée une nouvelle instance du service proxy
   * @param proxyUrl URL du serveur proxy
   * @param clientId ID client pour l'identification
   * @param userId ID utilisateur (optionnel)
   */
  constructor(proxyUrl: string, clientId: string, userId?: string) {
    super(proxyUrl);
    this.clientId = clientId;
    this.userId = userId;
  }

  /**
   * Effectue un appel API via le serveur proxy
   * @param endpoint Point d'API
   * @param options Options de la requête fetch
   * @param requireAuth Si l'authentification est requise
   * @returns Promesse avec la réponse typée
   */
  private async apiCall<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth = true,
  ): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    const headers: Record<string, string> = {
      "X-Mattermost-Client-ID": this.clientId,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    // Ajouter l'ID utilisateur si requis et disponible
    if (requireAuth && this.userId) {
      headers["X-Mattermost-User-ID"] = this.userId;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Gestion des erreurs d'authentification
        if (response.status === 401) {
          throw new Error(
            "Session invalide ou expirée. Veuillez vous reconnecter.",
          );
        }

        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message ||
            `Erreur API Proxy : ${response.status} ${response.statusText}`,
        );
      }

      // Si on a une réponse 204 (No Content), on renvoie un objet vide plutôt que de tenter de parser du JSON
      if (response.status === 204) {
        return {} as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      console.error(`Erreur lors de l'appel à ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Implémentation de la méthode abstraite pour récupérer l'utilisateur courant
   */
  protected async fetchCurrentUser(): Promise<User> {
    return this.apiCall<User>("users/me");
  }

  // ----- Méthodes d'authentification -----

  async authenticate(
    username: string,
    password: string,
  ): Promise<{ token: string; serverUrl?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Mattermost-Client-ID": this.clientId,
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Échec de l'authentification via le proxy",
        );
      }

      const authData = await response.json();

      // Mettre à jour l'ID utilisateur si disponible dans la réponse
      if (authData.user_id) {
        this.userId = authData.user_id;
      }

      // Tenter de récupérer l'utilisateur avec le nouveau token
      try {
        const user = await this.fetchCurrentUser();
        this.setCurrentUser(user);
      } catch (userError) {
        console.warn(
          "Impossible de récupérer l'utilisateur après authentification:",
          userError,
        );
      }

      return { token: authData.token };
    } catch (error) {
      console.error("Erreur d'authentification proxy :", error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      // En mode proxy, nous ne pouvons pas valider directement le token
      // Nous devons passer par le proxy pour cela
      const response = await fetch(`${this.baseUrl}/auth/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Mattermost-Client-ID": this.clientId,
        },
        body: JSON.stringify({ token }),
      });

      return response.ok;
    } catch (error) {
      console.error("Erreur de validation du token :", error);
      return false;
    }
  }

  // ----- Méthodes pour les équipes et canaux -----

  async getTeams(): Promise<Team[]> {
    return this.apiCall("teams");
  }

  async getTeam(teamId: string): Promise<Team> {
    return this.apiCall(`teams/${teamId}`);
  }

  async getTeamUnreadCount(
    teamId: string,
  ): Promise<{ msg_count: number; mention_count: number }> {
    try {
      return this.apiCall(`teams/${teamId}/unread`);
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des non-lus pour l'équipe ${teamId}:`,
        error,
      );
      return { msg_count: 0, mention_count: 0 };
    }
  }

  async getChannels(teamId: string): Promise<Channel[]> {
    try {
      return this.apiCall(`teams/${teamId}/channels`);
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des canaux pour l'équipe ${teamId}:`,
        error,
      );
      return [];
    }
  }

  async getChannel(channelId: string): Promise<Channel> {
    return this.apiCall(`channels/${channelId}`);
  }

  async getChannelUnreadCount(
    channelId: string,
  ): Promise<{ msg_count: number; mention_count: number }> {
    try {
      return this.apiCall(`channels/${channelId}/unread`);
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des non-lus pour le canal ${channelId}:`,
        error,
      );
      return { msg_count: 0, mention_count: 0 };
    }
  }

  async viewChannel(channelId: string): Promise<{ status: "OK" }> {
    if (!channelId) {
      throw new Error("channelId est requis pour marquer un canal comme lu");
    }

    try {
      return this.apiCall(`channels/${channelId}/view`, {
        method: "POST",
      });
    } catch (error) {
      console.error(
        `Erreur lors du marquage du canal ${channelId} comme lu:`,
        error,
      );
      throw error;
    }
  }

  // ----- Méthodes pour les messages -----

  async getChannelMessages(
    channelId: string,
    options: GetMessagesOptions = {},
  ): Promise<MessagesResponse> {
    try {
      const { page = 0, perPage = 60, since, before, after } = options;
      let endpoint = `channels/${channelId}/messages?page=${page}&per_page=${perPage}`;

      if (since) endpoint += `&since=${since}`;
      if (before) endpoint += `&before=${before}`;
      if (after) endpoint += `&after=${after}`;

      return this.apiCall<MessagesResponse>(endpoint);
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des messages du canal ${channelId}:`,
        error,
      );
      throw error;
    }
  }

  async postMessage(
    channelId: string,
    message: string,
    fileIds?: string[],
  ): Promise<Message> {
    try {
      return this.apiCall("messages", {
        method: "POST",
        body: JSON.stringify({
          channel_id: channelId,
          message,
          file_ids: fileIds || [],
        }),
      });
    } catch (error) {
      console.error(
        `Erreur lors de l'envoi du message dans le canal ${channelId}:`,
        error,
      );
      throw error;
    }
  }

  async getPost(messageId: string): Promise<Message> {
    try {
      return this.apiCall<Message>(`messages/${messageId}`);
    } catch (error) {
      console.error(
        `Erreur lors de la récupération du message ${messageId}:`,
        error,
      );
      throw error;
    }
  }

  async editMessage(messageId: string, newMessage: string): Promise<Message> {
    try {
      return this.apiCall<Message>(`messages/${messageId}`, {
        method: "PUT",
        body: JSON.stringify({
          message: newMessage,
        }),
      });
    } catch (error) {
      console.error(
        `Erreur lors de la modification du message ${messageId}:`,
        error,
      );
      throw error;
    }
  }

  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    try {
      await this.apiCall(`messages/${messageId}`, {
        method: "DELETE",
      });

      return { success: true };
    } catch (error) {
      console.error(
        `Erreur lors de la suppression du message ${messageId}:`,
        error,
      );
      throw error;
    }
  }

  async replyToMessage(
    channelId: string,
    messageId: string,
    responseMessage: string,
    fileIds?: string[],
  ): Promise<Message> {
    if (!channelId || !messageId || !responseMessage.trim()) {
      throw new Error("Paramètres invalides pour la réponse à un message");
    }

    try {
      const requestBody = {
        channel_id: channelId,
        root_id: messageId,
        message: responseMessage.trim(),
        file_ids: fileIds || [],
      };

      const endpoint = "messages/reply";

      const response = await this.apiCall<Message>(endpoint, {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      return response;
    } catch (error) {
      console.error(
        `ProxyService: Erreur lors de la réponse au message ${messageId}:`,
        error,
      );
      throw error;
    }
  }

  // ----- Méthodes pour les utilisateurs -----

  async getUsers(options: GetUsersOptions = {}): Promise<User[]> {
    try {
      const params = new URLSearchParams();

      if (options.inChannel) params.append("in_channel", options.inChannel);
      if (options.inTeam) params.append("in_team", options.inTeam);
      if (options.perPage)
        params.append("per_page", options.perPage.toString());
      if (options.page) params.append("page", options.page.toString());

      if (options.ids && options.ids.length > 0) {
        return this.apiCall("users/ids", {
          method: "POST",
          body: JSON.stringify(options.ids),
        });
      }

      return this.apiCall(`users?${params.toString()}`);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
      throw error;
    }
  }

  async getUserStatus(userId: string): Promise<any> {
    try {
      return this.apiCall(`users/${userId}/status`);
    } catch (error) {
      console.error(
        `Erreur lors de la récupération du statut de l'utilisateur ${userId}:`,
        error,
      );
      throw error;
    }
  }

  // ----- Méthodes pour les emojis et réactions -----

  async getFrequentEmojis(): Promise<string[]> {
    try {
      return this.apiCall("emojis/frequent");
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des emojis fréquents:",
        error,
      );
      // Valeurs par défaut en cas d'erreur
      return ["👍", "❤️", "😂", "🎉", "🔥", "👏", "✅", "🙏"];
    }
  }

  async addReaction(messageId: string, emojiName: string): Promise<any> {
    try {
      return this.apiCall("reactions", {
        method: "POST",
        body: JSON.stringify({
          post_id: messageId,
          emoji_name: emojiName,
        }),
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout de la réaction:", error);
      throw error;
    }
  }

  async removeReaction(
    channelId: string,
    messageId: string,
    emojiName: string,
  ): Promise<any> {
    try {
      return this.apiCall(`reactions/${messageId}/${emojiName}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Erreur lors de la suppression de la réaction:", error);
      throw error;
    }
  }

  async hasReacted(
    channelId: string,
    messageId: string,
    emojiName: string,
  ): Promise<boolean> {
    try {
      const response = await this.apiCall<{ has_reacted: boolean }>(
        `reactions/${messageId}/${emojiName}/check`,
      );
      return response.has_reacted;
    } catch (error) {
      console.error("Erreur lors de la vérification de la réaction:", error);
      return false;
    }
  }

  // ----- Méthodes pour les GIFs -----

  async searchGifs(query: string, category?: string): Promise<any[]> {
    try {
      let endpoint = `gifs/search?q=${encodeURIComponent(query)}`;
      if (category) {
        endpoint += `&category=${encodeURIComponent(category)}`;
      }

      return this.apiCall(endpoint);
    } catch (error) {
      console.error("Erreur lors de la recherche de GIFs:", error);
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

      return this.apiCall(endpoint);
    } catch (error) {
      console.error(`Erreur lors de la récupération des GIFs:`, error);
      return [];
    }
  }

  // ----- Méthodes pour WebSocket -----

  getWebsocketUrl(): string {
    return `${this.baseUrl.replace(/^http/, "ws")}/websocket`;
  }

  async getWebsocketToken(): Promise<string> {
    try {
      const response = await this.apiCall<{ token: string }>(
        "websocket/token",
        {},
        true,
      );
      return response.token;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération du token WebSocket:",
        error,
      );
      throw error;
    }
  }

  // ----- Méthodes pour les fichiers -----

  async uploadFiles(formData: FormData): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/files`, {
        method: "POST",
        headers: {
          "X-Mattermost-Client-ID": this.clientId,
          ...(this.userId ? { "X-Mattermost-User-ID": this.userId } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message ||
            `Erreur de téléchargement de fichier: ${response.status}`,
        );
      }

      return response.json();
    } catch (error) {
      console.error("Erreur lors du téléchargement de fichiers:", error);
      throw error;
    }
  }
}

/**
 * Crée un service proxy pour communiquer avec Mattermost via un serveur intermédiaire
 * @param config Configuration du service proxy
 * @returns Service Mattermost
 */
export function createProxyService(
  config: ProxyServiceConfig,
): MattermostService {
  const { proxyUrl, clientId, userId } = config;

  // Validation des paramètres
  if (!proxyUrl || !clientId) {
    throw new Error("proxyUrl et clientId sont requis pour le mode proxy");
  }

  return new ProxyService(proxyUrl, clientId, userId);
}
