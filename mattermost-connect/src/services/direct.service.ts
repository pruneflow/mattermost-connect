// src/services/direct.service.ts
import { BaseService } from "./base.service";
import {
  User,
  MattermostService,
  GetMessagesOptions,
  GetUsersOptions,
  MessagesResponse,
  Message,
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
} from "../utils";

/**
 * Normalise l'URL en supprimant le slash final s'il existe
 */
function normalizeUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * Service direct implémentant la communication avec un serveur Mattermost
 */
export class DirectService extends BaseService implements MattermostService {
  private baseUrl: string;
  private token?: string;

  constructor(serverUrl: string, token?: string) {
    super();
    this.baseUrl = normalizeUrl(serverUrl);
    this.token = token;
  }

  // Propriété indiquant le mode
  public readonly mode: "direct" | "proxy" | "custom" = "direct";

  /**
   * Effectue un appel API à Mattermost
   */
  private async apiCall<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v4/${endpoint}`;
    const headers: any = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Gestion spécifique des erreurs d'authentification
      if (response.status === 401) {
        throw new Error(
          "Session invalide ou expirée, veuillez vous reconnecter.",
        );
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message ||
            `Erreur API : ${response.status} ${response.statusText}`,
        );
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
      // Appel à l'API Mattermost pour obtenir un token
      const response = await fetch(`${this.baseUrl}/api/v4/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login_id: username,
          password: password,
        }),
      });

      if (!response.ok) {
        throw new Error("Échec de l'authentification");
      }

      const user = await response.json();

      // Stocker l'utilisateur dans le cache
      this.setCurrentUser(user);

      const tokenResponse = await fetch(
        `${this.baseUrl}/api/v4/users/${user.id}/tokens`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${response.headers.get("Token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: "MattermostConnect Integration",
          }),
        },
      );

      if (!tokenResponse.ok) {
        throw new Error("Échec de la génération du token");
      }

      const tokenData = await tokenResponse.json();

      // Mettre à jour le token du service
      this.token = tokenData.token;

      return {
        token: tokenData.token,
        serverUrl: this.baseUrl,
      };
    } catch (error) {
      console.error("Erreur d'authentification :", error);
      throw error;
    }
  }

  async validateToken(tokenToValidate: string): Promise<boolean> {
    try {
      // Sauvegarde du token actuel
      const originalToken = this.token;

      // Utiliser temporairement le token à valider
      this.token = tokenToValidate;

      try {
        // Tenter de récupérer l'utilisateur courant
        const user = await this.fetchCurrentUser();

        // Si réussi, stocker l'utilisateur et garder le nouveau token
        this.setCurrentUser(user);
        return true;
      } catch (error) {
        // Si échec, restaurer le token d'origine
        this.token = originalToken;
        return false;
      }
    } catch (error) {
      console.error("Erreur de validation du token :", error);
      return false;
    }
  }

  // ----- Méthodes pour les équipes et canaux -----

  async getTeams() {
    return this.apiCall("users/me/teams");
  }

  async getTeam(teamId: string) {
    return this.apiCall(`teams/${teamId}`);
  }

  async getChannels(teamId: string) {
    return this.apiCall(`users/me/teams/${teamId}/channels`);
  }

  async getChannel(channelId: string) {
    return this.apiCall(`channels/${channelId}`);
  }

  // ----- Méthodes pour les messages -----

  async getChannelMessages(
    channelId: string,
    options: GetMessagesOptions = {},
  ) {
    const { page = 0, perPage = 60, since = 0, before, after } = options;

    let endpoint = `channels/${channelId}/posts?page=${page}&per_page=${perPage}`;

    if (since) endpoint += `&since=${since}`;
    if (before) endpoint += `&before=${before}`;
    if (after) endpoint += `&after=${after}`;

    return this.apiCall<MessagesResponse>(endpoint);
  }

  async postMessage(channelId: string, message: string, fileIds?: string[]) {
    return this.apiCall("posts", {
      method: "POST",
      body: JSON.stringify({
        channel_id: channelId,
        message,
        file_ids: fileIds || [], // Ajout du support pour file_ids
      }),
    });
  }

  async getPost(messageId: string) {
    return this.apiCall<Message>(`posts/${messageId}`);
  }

  /**
   * Modifie un message existant
   *
   * @param messageId ID du message à modifier
   * @param newMessage Nouveau texte du message
   * @returns Message mis à jour
   */
  async editMessage(messageId: string, newMessage: string): Promise<Message> {
    try {
      // Récupérer d'abord le message pour obtenir le channel_id
      // (Cette étape peut être facultative si vous avez déjà le channel_id)
      const message = await this.apiCall<Message>(`posts/${messageId}`);

      // Ensuite, mettre à jour le message
      return this.apiCall<Message>(`posts/${messageId}/patch`, {
        method: "PUT",
        body: JSON.stringify({
          message: newMessage,
          // Conserver les propriétés existantes
          file_ids: message.file_ids,
          has_reactions: message.has_reactions,
          props: message.props,
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

  /**
   * Supprime un message
   *
   * @param messageId ID du message à supprimer
   * @returns Statut de suppression
   */
  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    try {
      await this.apiCall(`posts/${messageId}`, {
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

  /**
   * Répond à un message (avec citation)
   *
   * @param channelId ID du canal où se trouve le message
   * @param messageId ID du message auquel répondre
   * @param responseMessage Texte de la réponse
   * @returns Message de réponse créé
   */
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
        message: responseMessage.trim(),
        root_id: messageId,
        file_ids: fileIds || [], // Ajout du support pour file_ids
      };

      // Appel direct à l'API
      const response = await this.apiCall<Message>("posts", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      return response;
    } catch (error) {
      console.error(
        `DirectService: Erreur lors de la réponse au message ${messageId}:`,
        error,
      );
      throw error;
    }
  }

  // ----- Méthodes pour les utilisateurs -----

  async getUsers(options: GetUsersOptions = {}) {
    const params = new URLSearchParams();

    if (options.inChannel) params.append("in_channel", options.inChannel);
    if (options.inTeam) params.append("in_team", options.inTeam);
    if (options.perPage) params.append("per_page", options.perPage.toString());
    if (options.page) params.append("page", options.page.toString());

    // Si des IDs spécifiques sont demandés, utiliser un endpoint différent
    if (options.ids && options.ids.length > 0) {
      return this.apiCall("users/ids", {
        method: "POST",
        body: JSON.stringify(options.ids),
      });
    }

    return this.apiCall(`users?${params.toString()}`);
  }

  async getUserStatus(userId: string) {
    return this.apiCall(`users/${userId}/status`);
  }

  // ----- Méthodes pour les emojis et réactions -----

  getEmojiApiOptions(): EmojiApiOptions {
    return {
      baseUrl: this.baseUrl,
      token: this.token,
      mode: "direct",
      isAuthenticated: !!this.token,
      currentUserId: this._currentUser?.id, // Utiliser l'ID de l'utilisateur mis en cache
    };
  }

  getGifApiOptions(): GifApiOptions {
    return {
      baseUrl: this.baseUrl,
      token: this.token,
      mode: "direct",
      useRealApi: false,
    };
  }

  async getFrequentEmojis() {
    return getFrequentEmojis();
  }

  async addReaction(messageId: string, emoji: string) {
    // Assurer que nous avons l'utilisateur courant
    if (!this._currentUser) {
      await this.getCurrentUser();
    }

    return addReaction(messageId, emoji, this.getEmojiApiOptions());
  }

  async removeReaction(channelId: string, messageId: string, emoji: string) {
    return removeReaction(
      channelId,
      messageId,
      emoji,
      this.getEmojiApiOptions(),
    );
  }

  async hasReacted(channelId: string, messageId: string, emoji: string) {
    return hasReacted(channelId, messageId, emoji, this.getEmojiApiOptions());
  }

  // ----- Méthodes pour les GIFs -----

  async searchGifs(query: string, category?: string) {
    return searchGifs(query, this.getGifApiOptions(), category);
  }

  async getGifs(category: string, limit: number = 20) {
    return getGifs(category, this.getGifApiOptions(), limit);
  }

  // ----- Méthodes pour WebSocket -----

  getWebsocketUrl(): string {
    return this.baseUrl.replace(/^http/, "ws") + "/api/v4/websocket";
  }

  async getWebsocketToken(): Promise<string> {
    return this.token || "";
  }

  // ----- Méthodes pour les fichiers -----

  async uploadFiles(formData: FormData) {
    const response = await fetch(`${this.baseUrl}/api/v4/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `File upload error: ${response.status}`);
    }

    return response.json();
  }

  // ----- Méthodes utilitaires -----

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

/**
 * Crée un service pour communiquer directement avec un serveur Mattermost
 * en utilisant un token d'API utilisateur
 *
 * @param config - Configuration avec serverUrl et token
 * @returns Implémentation du service Mattermost
 */
export function createDirectService(config: {
  serverUrl: string;
  token?: string;
}): MattermostService {
  const { serverUrl, token } = config;

  // Validation des paramètres obligatoires
  if (!serverUrl) {
    throw new Error("serverUrl est requis pour le mode direct");
  }

  return new DirectService(serverUrl, token);
}
