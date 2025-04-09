// src/services/direct.service.ts
import {
  MattermostService,
  GetMessagesOptions,
  GetUsersOptions,
  MessagesResponse,
} from "../types";
import { getEmojiName } from "../components/EmojiPicker/data/emojiData";
import {
  MOCK_GIFS,
  GIF_API_CONFIG,
  buildApiUrl,
  parseApiResponse,
} from "../components/EmojiPicker/data/gifData";

/**
 * Normalise l'URL en supprimant le slash final s'il existe
 */
function normalizeUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
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
    throw new Error("serverUrl et token sont requis pour le mode direct");
  }

  // Normaliser l'URL du serveur (supprimer le slash final s'il existe)
  const baseUrl = normalizeUrl(serverUrl);

  const apiCall = async <T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> => {
    const url = `${baseUrl}/api/v4/${endpoint}`;
    const headers: any = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
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
  };

  // Retourner l'interface du service
  return {
    // Propriété indiquant le mode
    mode: "direct",

    // ----- Méthodes de base (utilisateurs, équipes, canaux) -----
    authenticate: async (username, password) => {
      try {
        // Appel à l'API Mattermost pour obtenir un token
        const response = await fetch(`${baseUrl}/api/v4/users/login`, {
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
        const tokenResponse = await fetch(
          `${baseUrl}/api/v4/users/${user.id}/tokens`,
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
        return {
          token: tokenData.token,
          serverUrl: baseUrl,
        };
      } catch (error) {
        console.error("Erreur d'authentification :", error);
        throw error;
      }
    },
    validateToken: async (token) => {
      try {
        const response = await fetch(`${baseUrl}/api/v4/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return response.ok;
      } catch (error) {
        console.error("Erreur de validation du token :", error);
        return false;
      }
    },

    // Modification de getCurrentUser pour gérer les erreurs
    getCurrentUser: async () => {
      try {
        return await apiCall("users/me");
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de l'utilisateur :",
          error,
        );
        throw error;
      }
    },

    getTeams: async () => {
      return apiCall("users/me/teams");
    },

    getTeam: async (teamId) => {
      return apiCall(`teams/${teamId}`);
    },

    getChannels: async (teamId) => {
      return apiCall(`users/me/teams/${teamId}/channels`);
    },

    getChannel: async (channelId) => {
      return apiCall(`channels/${channelId}`);
    },

    // ----- Méthodes pour les messages -----
    getChannelMessages: async (channelId, options: GetMessagesOptions = {}) => {
      const { page = 0, perPage = 60, since = 0, before, after } = options;

      let endpoint = `channels/${channelId}/posts?page=${page}&per_page=${perPage}`;

      if (since) endpoint += `&since=${since}`;
      if (before) endpoint += `&before=${before}`;
      if (after) endpoint += `&after=${after}`;

      return apiCall<MessagesResponse>(endpoint);
    },

    postMessage: async (channelId, message) => {
      return apiCall("posts", {
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

      // Si des IDs spécifiques sont demandés, utiliser un endpoint différent
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
        // Dans une implémentation réelle, cette fonction récupérerait les emojis
        // fréquemment utilisés à partir de l'API ou du stockage local

        // Pour la démonstration, nous retournons une liste statique
        return ["👍", "❤️", "😂", "🎉", "🔥", "👏", "✅", "🙏"];
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
          user_id: "me", // Utilise l'utilisateur actuel
          post_id: messageId,
          emoji_name: emojiName,
          channel_id: channelId,
        }),
      });
    },

    removeReaction: async (channelId, messageId, emoji) => {
      const emojiName = getEmojiName(emoji);

      // L'API Mattermost pour supprimer une réaction nécessite l'ID utilisateur
      // Nous utilisons "me" pour l'utilisateur courant
      const userId = "me";

      return apiCall(
        `users/${userId}/posts/${messageId}/reactions/${emojiName}`,
        {
          method: "DELETE",
        },
      );
    },

    hasReacted: async (channelId, messageId, emoji) => {
      const emojiName = getEmojiName(emoji);

      try {
        // Récupérer les réactions pour ce message
        const reactions = await apiCall<any[]>(`posts/${messageId}/reactions`);

        // Récupérer l'utilisateur actuel
        const currentUser = await apiCall("users/me");

        // Vérifier si l'utilisateur actuel a réagi avec cet emoji
        return reactions.some(
          (reaction) =>
            reaction.emoji_name === emojiName &&
            reaction.user_id === currentUser.id,
        );
      } catch (error) {
        console.error("Error checking reaction:", error);
        return false;
      }
    },

    // ----- Méthodes pour les GIFs -----
    searchGifs: async (query, category) => {
      // Vérifier si nous utilisons une API réelle ou des données de test
      if (GIF_API_CONFIG.USE_API_PROVIDER) {
        try {
          // Construire l'URL de recherche
          const url = buildApiUrl("search", query, category);

          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`GIF API error: ${response.status}`);
          }

          const data = await response.json();
          return parseApiResponse(data, GIF_API_CONFIG.PROVIDER);
        } catch (error) {
          console.error("Error searching GIFs:", error);
          return [];
        }
      } else {
        // Utiliser les données de test
        // Pour simuler une recherche, filtrer par titre
        const allGifs = Object.values(MOCK_GIFS).flat();
        return allGifs.filter((gif) =>
          gif.title.toLowerCase().includes(query.toLowerCase()),
        );
      }
    },

    getGifs: async (category, limit = 20) => {
      // Vérifier si nous utilisons une API réelle ou des données de test
      if (GIF_API_CONFIG.USE_API_PROVIDER) {
        try {
          // Construire l'URL pour la catégorie
          const url = buildApiUrl(
            category.toLowerCase() === "trending" ? "trending" : "category",
            undefined,
            category,
          );

          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`GIF API error: ${response.status}`);
          }

          const data = await response.json();
          return parseApiResponse(data, GIF_API_CONFIG.PROVIDER);
        } catch (error) {
          console.error("Error getting GIFs:", error);
          return [];
        }
      } else {
        // Utiliser les données de test
        return MOCK_GIFS[category] || [];
      }
    },

    // ----- Méthodes pour WebSocket -----
    getWebsocketUrl: () => {
      // Convertir http(s) en ws(s)
      return baseUrl.replace(/^http/, "ws") + "/api/v4/websocket";
    },

    getWebsocketToken: async () => {
      // En mode direct, nous utilisons le même token
      return token;
    },

    // ----- Méthodes pour les fichiers -----
    uploadFiles: async (formData) => {
      const response = await fetch(`${baseUrl}/api/v4/files`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
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
    },

    // ----- Méthodes utilitaires -----
    getBaseUrl: () => baseUrl,
  };
}
