// src/services/direct/direct.service.ts
import { BaseService } from "../base/service.base";
import { MattermostService } from "../base/service.interfaces";
import {
  User,
  GetMessagesOptions,
  GetUsersOptions,
  MessagesResponse,
  Message,
  Channel,
  Team,
} from "../../types";

/**
 * Configuration pour le service direct
 */
export interface DirectServiceConfig {
  /** URL du serveur Mattermost */
  serverUrl: string;
  /** Token d'API utilisateur (optionnel) */
  token?: string;
}

/**
 * Service direct implémentant la communication avec un serveur Mattermost
 * sans intermédiaire
 */
export class DirectService extends BaseService implements MattermostService {
  private token?: string;
  public readonly mode: "direct" | "proxy" | "custom" = "direct";

  /**
   * Crée une nouvelle instance du service direct
   * @param serverUrl URL du serveur Mattermost
   * @param token Token d'API utilisateur (optionnel)
   */
  constructor(serverUrl: string, token?: string) {
    super(serverUrl);
    this.token = token;
  }

  /**
   * Effectue un appel API à Mattermost
   * @param endpoint Point d'API (sans /api/v4/)
   * @param options Options de la requête fetch
   * @returns Promesse avec la réponse typée
   */
  protected async apiCall<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v4/${endpoint}`;
    const headers: Record<string, any> = {
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

      // Si on a une réponse 204 (No Content), on renvoie un objet vide plutôt que de tenter de parser du JSON
      if (response.status === 204) {
        return {} as T;
      }

      return response.json() as Promise<T>;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
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

      // Récupérer le token de session depuis les en-têtes
      const sessionToken = response.headers.get("Token");

      if (!sessionToken) {
        throw new Error("Aucun token de session retourné par le serveur");
      }

      // Créer un token d'accès personnel (PAT)
      const tokenResponse = await fetch(
        `${this.baseUrl}/api/v4/users/${user.id}/tokens`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
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

  async getTeams(): Promise<Team[]> {
    return this.apiCall("users/me/teams");
  }

  async getTeam(teamId: string): Promise<Team> {
    return this.apiCall(`teams/${teamId}`);
  }

  async getTeamUnreadCount(
    teamId: string,
  ): Promise<{ msg_count: number; mention_count: number }> {
    if (!this._currentUser) {
      await this.getCurrentUser();
    }

    try {
      return this.apiCall(
        `users/${this._currentUser!.id}/teams/${teamId}/unread`,
      );
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des non-lus pour l'équipe ${teamId}:`,
        error,
      );
      return { msg_count: 0, mention_count: 0 };
    }
  }

  async getChannels(teamId: string): Promise<Channel[]> {
    if (!teamId || teamId === "") return [];
    return this.apiCall(`users/me/teams/${teamId}/channels`);
  }

  async getChannel(channelId: string): Promise<Channel> {
    return this.apiCall(`channels/${channelId}`);
  }

  async getChannelUnreadCount(
    channelId: string,
  ): Promise<{ msg_count: number; mention_count: number }> {
    if (!this._currentUser) {
      await this.getCurrentUser();
    }

    try {
      return this.apiCall(
        `users/${this._currentUser!.id}/channels/${channelId}/unread`,
      );
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
      // L'API attend un objet avec channel_id
      return this.apiCall("channels/members/me/view", {
        method: "POST",
        body: JSON.stringify({
          channel_id: channelId,
        }),
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
    const { page = 0, perPage = 60, since = 0, before, after } = options;

    let endpoint = `channels/${channelId}/posts?page=${page}&per_page=${perPage}`;

    if (since) endpoint += `&since=${since}`;
    if (before) endpoint += `&before=${before}`;
    if (after) endpoint += `&after=${after}`;

    return this.apiCall<MessagesResponse>(endpoint);
  }

  async postMessage(
    channelId: string,
    message: string,
    fileIds?: string[],
  ): Promise<Message> {
    return this.apiCall("posts", {
      method: "POST",
      body: JSON.stringify({
        channel_id: channelId,
        message,
        file_ids: fileIds || [],
      }),
    });
  }

  async getPost(messageId: string): Promise<Message> {
    return this.apiCall<Message>(`posts/${messageId}`);
  }

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
        file_ids: fileIds || [],
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

  async getUsers(options: GetUsersOptions = {}): Promise<User[]> {
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

  async getUserStatus(userId: string): Promise<any> {
    return this.apiCall(`users/${userId}/status`);
  }

  // ----- Méthodes pour les emojis et réactions -----

  async getFrequentEmojis(): Promise<string[]> {
    // Dans une implémentation réelle, on pourrait récupérer les emojis fréquents depuis le serveur
    // Pour l'instant, on retourne une liste prédéfinie
    return ["👍", "❤️", "😂", "🎉", "🔥", "👏", "✅", "🙏"];
  }

  async addReaction(messageId: string, emoji: string): Promise<any> {
    if (!this._currentUser) {
      await this.getCurrentUser();
    }

    const emojiName = this.getEmojiName(emoji);

    return this.apiCall("reactions", {
      method: "POST",
      body: JSON.stringify({
        post_id: messageId,
        emoji_name: emojiName,
        user_id: this._currentUser!.id,
      }),
    });
  }

  async removeReaction(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<any> {
    if (!this._currentUser) {
      await this.getCurrentUser();
    }

    const emojiName = this.getEmojiName(emoji);
    const userId = this._currentUser!.id;

    return this.apiCall(
      `users/${userId}/posts/${messageId}/reactions/${emojiName}`,
      {
        method: "DELETE",
      },
    );
  }

  async hasReacted(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<boolean> {
    const emojiName = this.getEmojiName(emoji);

    try {
      // Récupérer les réactions pour ce message
      const reactions = await this.apiCall<any[]>(
        `posts/${messageId}/reactions`,
      );

      // Vérifier si l'utilisateur actuel a réagi avec cet emoji
      if (!this._currentUser) {
        await this.getCurrentUser();
      }

      return reactions.some(
        (reaction) =>
          reaction.emoji_name === emojiName &&
          reaction.user_id === this._currentUser!.id,
      );
    } catch (error) {
      console.error("Error checking reaction:", error);
      return false;
    }
  }

  // Helper function pour convertir un emoji en nom d'API
  private getEmojiName(emoji: string): string {
    // Mapping simple pour quelques emojis courants
    // Dans une implémentation réelle, on utiliserait une bibliothèque complète
    const emojiMap: Record<string, string> = {
      "👍": "thumbsup",
      "❤️": "heart",
      "😂": "joy",
      "🎉": "tada",
      "🔥": "fire",
      "👏": "clap",
      "✅": "white_check_mark",
      "🙏": "pray",
    };

    return emojiMap[emoji] || emoji;
  }

  // ----- Méthodes pour les GIFs -----

  async searchGifs(query: string, category?: string): Promise<any[]> {
    // Simuler une recherche dans une implémentation réelle
    // On appellerait une API externe comme Giphy
    return [];
  }

  async getGifs(category: string, limit: number = 20): Promise<any[]> {
    // Simuler une récupération dans une implémentation réelle
    // On appellerait une API externe comme Giphy
    return [];
  }

  // ----- Méthodes pour WebSocket -----

  getWebsocketUrl(): string {
    return this.baseUrl.replace(/^http/, "ws") + "/api/v4/websocket";
  }

  async getWebsocketToken(): Promise<string> {
    return this.token || "";
  }

  // ----- Méthodes pour les fichiers -----

  async uploadFiles(formData: FormData): Promise<any> {
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
}

/**
 * Crée un service direct pour communiquer avec un serveur Mattermost
 * @param config Configuration du service direct
 * @returns Service Mattermost
 */
export function createDirectService(
  config: DirectServiceConfig,
): MattermostService {
  const { serverUrl, token } = config;

  // Validation des paramètres
  if (!serverUrl) {
    throw new Error("serverUrl est requis pour le mode direct");
  }

  return new DirectService(serverUrl, token);
}
