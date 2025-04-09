// src/services/direct.service.ts
import {
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
} from "../utils";

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

  // Options pour les utilitaires d'emoji
  const emojiOptions: EmojiApiOptions = {
    baseUrl,
    token,
    mode: "direct",
    isAuthenticated: !!token,
  };

  // Options pour les utilitaires de GIF
  const gifOptions: GifApiOptions = {
    baseUrl,
    token,
    mode: "direct",
    useRealApi: false, // Utiliser les API réelles ou les données de test
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
      // Utiliser la fonction utilitaire centralisée
      return getFrequentEmojis();
    },

    addReaction: async (messageId, emoji) => {
      // D'abord récupérer l'utilisateur actuel pour obtenir son ID
      try {
        const currentUser = await apiCall("users/me");

        // Mettre à jour les options avec l'ID utilisateur actuel
        const optionsWithUser = {
          ...emojiOptions,
          currentUserId: currentUser.id,
        };

        // Utiliser la fonction utilitaire centralisée avec l'ID utilisateur
        return addReaction(messageId, emoji, optionsWithUser);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de l'utilisateur pour la réaction:",
          error,
        );
        throw error;
      }
    },

    removeReaction: async (channelId, messageId, emoji) => {
      // Utiliser la fonction utilitaire centralisée
      return removeReaction(channelId, messageId, emoji, emojiOptions);
    },

    hasReacted: async (channelId, messageId, emoji) => {
      // Utiliser la fonction utilitaire centralisée avec l'option de récupérer l'utilisateur actuel
      return hasReacted(channelId, messageId, emoji, emojiOptions);
    },

    // ----- Méthodes pour les GIFs -----
    searchGifs: async (query, category) => {
      // Utiliser la fonction utilitaire centralisée
      return searchGifs(query, gifOptions, category);
    },

    getGifs: async (category, limit = 20) => {
      // Utiliser la fonction utilitaire centralisée
      return getGifs(category, gifOptions, limit);
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
