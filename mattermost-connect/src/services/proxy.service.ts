// src/services/proxy.service.ts
import {
  MattermostService,
  GetMessagesOptions,
  GetUsersOptions,
  MessagesResponse,
  GifData,
} from "../types";
import { getEmojiName } from "../components/EmojiPicker/data/emojiData";

/**
 * Normalise l'URL en supprimant le slash final s'il existe
 */
function normalizeUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * Crée un service qui communique avec Mattermost via un service proxy
 * Gère l'authentification et les tokens côté serveur
 *
 * @param config - Configuration avec proxyUrl, clientId et userId
 * @returns Implémentation du service Mattermost
 */
export function createProxyService(config: {
  proxyUrl: string;
  clientId: string;
  userId?: string;
}): MattermostService {
  const { proxyUrl, clientId, userId } = config;

  // Validation des paramètres obligatoires
  if (!proxyUrl || !clientId) {
    throw new Error("proxyUrl and clientId are required for proxy mode");
  }

  // Normaliser l'URL du proxy (supprimer le slash final s'il existe)
  const baseUrl = normalizeUrl(proxyUrl);

  /**
   * Méthode utilitaire pour faire des appels API via le proxy
   */
  const apiCall = async <T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> => {
    const url = `${baseUrl}/${endpoint}`;

    // En mode proxy, nous envoyons clientId et userId pour l'authentification
    const headers: Record<string, string> = {
      "X-Mattermost-Client-ID": clientId,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    // Ajouter userId si disponible
    if (userId) {
      headers["X-Mattermost-User-ID"] = userId;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Gérer les réponses d'erreur
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message ||
            `Proxy API Error: ${response.status} ${response.statusText}`,
        );
      }

      return (await response.json()) as Promise<T>;
    } catch (error) {
      console.error(`Error calling Proxy API at ${endpoint}:`, error);
      throw error;
    }
  };

  // Retourner l'interface du service
  return {
    // Propriété indiquant le mode
    mode: "proxy",

    // ----- Méthodes de base (utilisateurs, équipes, canaux) -----
    getCurrentUser: async () => {
      return apiCall("users/me");
    },

    getTeams: async () => {
      return apiCall("teams");
    },

    getTeam: async (teamId) => {
      return apiCall(`teams/${teamId}`);
    },

    getChannels: async (teamId) => {
      return apiCall(`teams/${teamId}/channels`);
    },

    getChannel: async (channelId) => {
      return apiCall(`channels/${channelId}`);
    },

    // ----- Méthodes pour les messages -----
    getChannelMessages: async (channelId, options: GetMessagesOptions = {}) => {
      const { page = 0, perPage = 60, since = 0, before, after } = options;

      let endpoint = `channels/${channelId}/messages?page=${page}&per_page=${perPage}`;

      if (since) endpoint += `&since=${since}`;
      if (before) endpoint += `&before=${before}`;
      if (after) endpoint += `&after=${after}`;

      return apiCall<MessagesResponse>(endpoint);
    },

    postMessage: async (channelId, message) => {
      return apiCall("messages", {
        method: "POST",
        body: JSON.stringify({
          channel_id: channelId,
          message,
        }),
      });
    },

    // ----- Méthodes pour les utilisateurs -----
    getUsers: async (options: GetUsersOptions = {}) => {
      const params = new URLSearchParams();

      if (options.inChannel) params.append("in_channel", options.inChannel);
      if (options.inTeam) params.append("in_team", options.inTeam);
      if (options.perPage)
        params.append("per_page", options.perPage.toString());
      if (options.page) params.append("page", options.page.toString());

      // Cas spécial pour obtenir des utilisateurs spécifiques par ID
      if (options.ids && options.ids.length > 0) {
        return apiCall("users/ids", {
          method: "POST",
          body: JSON.stringify(options.ids),
        });
      }

      return apiCall(`users?${params.toString()}`);
    },

    getUserStatus: async (userId) => {
      return apiCall(`users/${userId}/status`);
    },

    // ----- Méthodes pour les emojis et réactions -----
    getFrequentEmojis: async () => {
      try {
        return apiCall<{ emojis: string[] }>("emoji/frequent")
          .then((response) => response.emojis)
          .catch(() => {
            // Fallback par défaut si l'API n'est pas disponible
            return ["👍", "❤️", "😂", "🎉", "🔥", "👏", "✅", "🙏"];
          });
      } catch (error) {
        console.error("Error getting frequent emojis:", error);
        return [];
      }
    },

    addReaction: async (channelId, messageId, emoji) => {
      const emojiName = getEmojiName(emoji);

      return apiCall("reactions", {
        method: "POST",
        body: JSON.stringify({
          channel_id: channelId,
          post_id: messageId,
          emoji_name: emojiName,
        }),
      });
    },

    removeReaction: async (channelId, messageId, emoji) => {
      const emojiName = getEmojiName(emoji);

      return apiCall(`reactions/${messageId}/${emojiName}`, {
        method: "DELETE",
      });
    },

    hasReacted: async (channelId, messageId, emoji) => {
      try {
        const emojiName = getEmojiName(emoji);

        const response = await apiCall<any[]>(`posts/${messageId}/reactions`);

        return response.some(
          (reaction) =>
            reaction.emoji_name === emojiName &&
            (userId ? reaction.user_id === userId : true),
        );
      } catch (error) {
        console.error("Error checking reaction:", error);
        return false;
      }
    },

    // ----- Méthodes pour les GIFs -----
    searchGifs: async (query, category) => {
      if (!query.trim()) return [];

      let endpoint = `gifs/search?q=${encodeURIComponent(query)}`;

      if (category) {
        endpoint += `&category=${encodeURIComponent(category)}`;
      }

      return apiCall<GifData[]>(endpoint);
    },

    getGifs: async (category, limit = 20) => {
      try {
        let endpoint = "gifs";

        if (category.toLowerCase() === "trending") {
          endpoint = "gifs/trending";
        } else {
          endpoint = `gifs/category/${encodeURIComponent(category.toLowerCase())}`;
        }

        if (limit) {
          endpoint += `?limit=${limit}`;
        }

        return apiCall<GifData[]>(endpoint);
      } catch (error) {
        console.error("Error getting GIFs:", error);
        return [];
      }
    },

    // ----- Méthodes pour WebSocket -----
    getWebsocketUrl: () => {
      // Pour le mode proxy, l'URL WebSocket est gérée par le proxy
      return `${baseUrl.replace(/^http/, "ws")}/websocket`;
    },

    getWebsocketToken: async () => {
      // En mode proxy, nous avons besoin d'un token temporaire pour WebSocket
      const response = await apiCall<{ token: string }>("websocket/token");
      return response.token;
    },

    // ----- Méthodes pour les fichiers -----
    uploadFiles: async (formData) => {
      // Créer un objet headers sans Content-Type pour que le navigateur puisse définir
      // celui-ci automatiquement avec la boundary
      const headers: Record<string, string> = {
        "X-Mattermost-Client-ID": clientId,
      };

      if (userId) {
        headers["X-Mattermost-User-ID"] = userId;
      }

      const response = await fetch(`${baseUrl}/files`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message || `File upload error: ${response.status}`,
        );
      }

      return response.json();
    },

    // ----- Méthodes utilitaires -----
    getBaseUrl: () => baseUrl,
  };
}
