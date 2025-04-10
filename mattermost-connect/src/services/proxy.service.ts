// src/services/proxy.service.ts
import { BaseService } from "./base.service";
import {
  User,
  MattermostService,
  GetMessagesOptions,
  GetUsersOptions,
  MessagesResponse,
} from "../types";

// Importer les utilitaires d'emoji
import {
  getFrequentEmojis,
  addReaction,
  removeReaction,
  hasReacted,
  searchGifs,
  getGifs,
  EmojiApiOptions,
  GifApiOptions,
} from "../utils/emoji.utils";

/**
 * Normalise l'URL en supprimant le slash final s'il existe
 */
function normalizeUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * Service proxy implémentant la communication via un serveur intermédiaire
 */
export class ProxyService extends BaseService implements MattermostService {
  private baseUrl: string;
  private clientId: string;
  private userId?: string;

  constructor(proxyUrl: string, clientId: string, userId?: string) {
    super();
    this.baseUrl = normalizeUrl(proxyUrl);
    this.clientId = clientId;
    this.userId = userId;
  }

  // Propriété indiquant le mode
  public readonly mode: "direct" | "proxy" | "custom" = "proxy";

  /**
   * Effectue un appel API via le proxy
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

      return (await response.json()) as Promise<T>;
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
  ): Promise<{ token: string }> {
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

  // ----- Méthodes pour les équipes et canaux -----

  async getTeams() {
    try {
      return await this.apiCall("teams");
    } catch (error) {
      console.error("Erreur lors de la récupération des équipes :", error);
      throw error;
    }
  }

  async getTeam(teamId: string) {
    try {
      return await this.apiCall(`teams/${teamId}`);
    } catch (error) {
      console.error(
        `Erreur lors de la récupération de l'équipe ${teamId} :`,
        error,
      );
      throw error;
    }
  }

  async getChannels(teamId: string) {
    try {
      return await this.apiCall(`teams/${teamId}/channels`);
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des canaux pour l'équipe ${teamId} :`,
        error,
      );
      throw error;
    }
  }

  async getChannel(channelId: string) {
    try {
      return await this.apiCall(`channels/${channelId}`);
    } catch (error) {
      console.error(
        `Erreur lors de la récupération du canal ${channelId} :`,
        error,
      );
      throw error;
    }
  }

  // ----- Méthodes pour les messages -----

  async getChannelMessages(
    channelId: string,
    options: GetMessagesOptions = {},
  ) {
    try {
      const { page = 0, perPage = 60, since, before, after } = options;
      let endpoint = `channels/${channelId}/messages?page=${page}&per_page=${perPage}`;

      if (since) endpoint += `&since=${since}`;
      if (before) endpoint += `&before=${before}`;
      if (after) endpoint += `&after=${after}`;

      return await this.apiCall<MessagesResponse>(endpoint);
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des messages du canal ${channelId} :`,
        error,
      );
      throw error;
    }
  }

  async postMessage(channelId: string, message: string) {
    try {
      return await this.apiCall("messages", {
        method: "POST",
        body: JSON.stringify({
          channel_id: channelId,
          message,
        }),
      });
    } catch (error) {
      console.error(
        `Erreur lors de l'envoi du message dans le canal ${channelId} :`,
        error,
      );
      throw error;
    }
  }

  /**
   * Modifie un message existant via le proxy
   *
   * @param messageId ID du message à modifier
   * @param newMessage Nouveau texte du message
   * @returns Message mis à jour
   */
  async editMessage(messageId: string, newMessage: string): Promise<Message> {
    try {
      // Dans le mode proxy, nous passons par le point d'API du proxy
      return await this.apiCall<Message>(`messages/${messageId}`, {
        method: "PUT",
        body: JSON.stringify({
          message: newMessage,
        }),
      });
    } catch (error) {
      console.error(
        `Erreur lors de la modification du message ${messageId} via proxy:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Supprime un message via le proxy
   *
   * @param messageId ID du message à supprimer
   * @returns Statut de suppression
   */
  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    try {
      // Dans le mode proxy, nous utilisons le point d'API du proxy
      await this.apiCall(`messages/${messageId}`, {
        method: "DELETE",
      });

      return { success: true };
    } catch (error) {
      console.error(
        `Erreur lors de la suppression du message ${messageId} via proxy:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Répond à un message (avec citation) via le proxy
   *
   * @param channelId ID du canal où se trouve le message
   * @param messageId ID du message auquel répondre
   * @param responseMessage Texte de la réponse
   * @returns Message de réponse créé
   */
  // Méthode corrigée pour ProxyService
  async replyToMessage(
    channelId: string,
    messageId: string,
    responseMessage: string,
  ): Promise<Message> {
    try {
      // Dans le mode proxy, ajuster la structure pour s'assurer qu'elle est correcte
      // Inclure à la fois root_id et channel_id comme exigé par l'API Mattermost
      return await this.apiCall<Message>(`messages/reply`, {
        method: "POST",
        body: JSON.stringify({
          channel_id: channelId,
          root_id: messageId, // Assurez-vous d'inclure root_id
          message: responseMessage,
        }),
      });
    } catch (error) {
      console.error(
        `Erreur lors de la réponse au message ${messageId} via proxy:`,
        error,
      );

      // Fallback en cas d'échec - essayer d'envoyer comme message normal
      try {
        console.log(
          "Tentative d'envoi comme message normal après échec de la réponse",
        );
        return await this.apiCall<Message>("messages", {
          method: "POST",
          body: JSON.stringify({
            channel_id: channelId,
            message: responseMessage,
          }),
        });
      } catch (fallbackError) {
        console.error("Échec du fallback vers message normal:", fallbackError);
        throw error; // Remonter l'erreur originale
      }
    }
  }

  // ----- Méthodes pour les utilisateurs -----

  async getUsers(options: GetUsersOptions = {}) {
    try {
      const params = new URLSearchParams();

      if (options.inChannel) params.append("in_channel", options.inChannel);
      if (options.inTeam) params.append("in_team", options.inTeam);
      if (options.perPage)
        params.append("per_page", options.perPage.toString());
      if (options.page) params.append("page", options.page.toString());

      if (options.ids && options.ids.length > 0) {
        return await this.apiCall("users/ids", {
          method: "POST",
          body: JSON.stringify(options.ids),
        });
      }

      return await this.apiCall(`users?${params.toString()}`);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs :", error);
      throw error;
    }
  }

  async getUserStatus(userId: string) {
    try {
      return await this.apiCall(`users/${userId}/status`);
    } catch (error) {
      console.error(
        `Erreur lors de la récupération du statut de l'utilisateur ${userId} :`,
        error,
      );
      throw error;
    }
  }

  // ----- Méthodes pour les emojis et réactions -----

  getEmojiApiOptions(): EmojiApiOptions {
    return {
      baseUrl: this.baseUrl,
      headers: {
        "X-Mattermost-Client-ID": this.clientId,
        ...(this.userId ? { "X-Mattermost-User-ID": this.userId } : {}),
      },
      mode: "proxy",
      isAuthenticated: true,
      currentUserId: this._currentUser?.id || this.userId, // Utiliser l'ID mis en cache ou fourni
    };
  }

  getGifApiOptions(): GifApiOptions {
    return {
      baseUrl: this.baseUrl,
      headers: {
        "X-Mattermost-Client-ID": this.clientId,
        ...(this.userId ? { "X-Mattermost-User-ID": this.userId } : {}),
      },
      mode: "proxy",
      useRealApi: false,
    };
  }

  async getFrequentEmojis() {
    try {
      return await getFrequentEmojis();
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des emojis fréquents :",
        error,
      );
      return ["👍", "❤️", "😂", "🎉", "🔥", "👏", "✅", "🙏"]; // Fallback
    }
  }

  async addReaction(messageId: string, emoji: string) {
    try {
      // S'assurer que nous avons l'utilisateur courant ou un ID utilisateur
      if (!this._currentUser && !this.userId) {
        await this.getCurrentUser();
      }

      return await addReaction(messageId, emoji, this.getEmojiApiOptions());
    } catch (error) {
      console.error(`Erreur lors de l'ajout de la réaction :`, error);
      throw error;
    }
  }

  async removeReaction(channelId: string, messageId: string, emoji: string) {
    try {
      return await removeReaction(
        channelId,
        messageId,
        emoji,
        this.getEmojiApiOptions(),
      );
    } catch (error) {
      console.error(`Erreur lors de la suppression de la réaction :`, error);
      throw error;
    }
  }

  async hasReacted(channelId: string, messageId: string, emoji: string) {
    try {
      const userId = this._currentUser?.id || this.userId;
      return await hasReacted(
        channelId,
        messageId,
        emoji,
        this.getEmojiApiOptions(),
        userId,
      );
    } catch (error) {
      console.error(`Erreur lors de la vérification de la réaction :`, error);
      return false;
    }
  }

  // ----- Méthodes pour les GIFs -----

  async searchGifs(query: string, category?: string) {
    try {
      return await searchGifs(query, this.getGifApiOptions(), category);
    } catch (error) {
      console.error("Erreur lors de la recherche de GIFs :", error);
      return [];
    }
  }

  async getGifs(category: string, limit = 20) {
    try {
      return await getGifs(category, this.getGifApiOptions(), limit);
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des GIFs de ${category} :`,
        error,
      );
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
        "Erreur lors de la récupération du token WebSocket :",
        error,
      );
      throw error;
    }
  }

  // ----- Méthodes pour les fichiers -----

  async uploadFiles(formData: FormData) {
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
            `Erreur de téléchargement de fichier : ${response.status}`,
        );
      }

      return response.json();
    } catch (error) {
      console.error("Erreur lors du téléchargement de fichiers :", error);
      throw error;
    }
  }

  // ----- Méthodes utilitaires -----

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

/**
 * Crée un service proxy pour communiquer avec Mattermost via un serveur intermédiaire
 *
 * @param config - Configuration avec proxyUrl, clientId et userId optionnel
 * @returns Implémentation du service Mattermost
 */
export function createProxyService(config: {
  proxyUrl: string;
  clientId: string;
  userId?: string;
}): MattermostService {
  const { proxyUrl, clientId, userId } = config;

  if (!proxyUrl || !clientId) {
    throw new Error("proxyUrl et clientId sont requis pour le mode proxy");
  }

  return new ProxyService(proxyUrl, clientId, userId);
}
