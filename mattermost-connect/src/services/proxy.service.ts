// src/services/proxy.service.ts
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
} from "../utils/emoji.utils";

function normalizeUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function createProxyService(config: {
  proxyUrl: string;
  clientId: string;
  userId?: string;
}): MattermostService {
  const { proxyUrl, clientId, userId } = config;

  if (!proxyUrl || !clientId) {
    throw new Error("proxyUrl et clientId sont requis pour le mode proxy");
  }

  const baseUrl = normalizeUrl(proxyUrl);

  const apiCall = async <T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth = true,
  ): Promise<T> => {
    const url = `${baseUrl}/${endpoint}`;

    const headers: Record<string, string> = {
      "X-Mattermost-Client-ID": clientId,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    // Ajouter l'ID utilisateur si requis et disponible
    if (requireAuth && userId) {
      headers["X-Mattermost-User-ID"] = userId;
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
  };

  // Options pour les utilitaires d'emoji
  const emojiOptions: EmojiApiOptions = {
    baseUrl,
    headers: {
      "X-Mattermost-Client-ID": clientId,
      ...(userId ? { "X-Mattermost-User-ID": userId } : {}),
    },
    mode: "proxy",
    isAuthenticated: true,
  };

  // Options pour les utilitaires de GIF
  const gifOptions: GifApiOptions = {
    baseUrl,
    headers: {
      "X-Mattermost-Client-ID": clientId,
      ...(userId ? { "X-Mattermost-User-ID": userId } : {}),
    },
    mode: "proxy",
    useRealApi: false,
  };

  return {
    mode: "proxy",

    // Méthode d'authentification
    authenticate: async (username, password) => {
      try {
        const response = await fetch(`${baseUrl}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Mattermost-Client-ID": clientId,
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
        return { token: authData.token }; // Ou tout autre identifiant approprié
      } catch (error) {
        console.error("Erreur d'authentification proxy :", error);
        throw error;
      }
    },

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
      try {
        return await apiCall("teams");
      } catch (error) {
        console.error("Erreur lors de la récupération des équipes :", error);
        throw error;
      }
    },

    getTeam: async (teamId) => {
      try {
        return await apiCall(`teams/${teamId}`);
      } catch (error) {
        console.error(
          `Erreur lors de la récupération de l'équipe ${teamId} :`,
          error,
        );
        throw error;
      }
    },

    getChannels: async (teamId) => {
      try {
        return await apiCall(`teams/${teamId}/channels`);
      } catch (error) {
        console.error(
          `Erreur lors de la récupération des canaux pour l'équipe ${teamId} :`,
          error,
        );
        throw error;
      }
    },

    getChannel: async (channelId) => {
      try {
        return await apiCall(`channels/${channelId}`);
      } catch (error) {
        console.error(
          `Erreur lors de la récupération du canal ${channelId} :`,
          error,
        );
        throw error;
      }
    },

    getChannelMessages: async (channelId, options: GetMessagesOptions = {}) => {
      try {
        const { page = 0, perPage = 60, since, before, after } = options;
        let endpoint = `channels/${channelId}/messages?page=${page}&per_page=${perPage}`;

        if (since) endpoint += `&since=${since}`;
        if (before) endpoint += `&before=${before}`;
        if (after) endpoint += `&after=${after}`;

        return await apiCall<MessagesResponse>(endpoint);
      } catch (error) {
        console.error(
          `Erreur lors de la récupération des messages du canal ${channelId} :`,
          error,
        );
        throw error;
      }
    },

    postMessage: async (channelId, message) => {
      try {
        return await apiCall("messages", {
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
    },

    getUsers: async (options: GetUsersOptions = {}) => {
      try {
        const params = new URLSearchParams();

        if (options.inChannel) params.append("in_channel", options.inChannel);
        if (options.inTeam) params.append("in_team", options.inTeam);
        if (options.perPage)
          params.append("per_page", options.perPage.toString());
        if (options.page) params.append("page", options.page.toString());

        if (options.ids && options.ids.length > 0) {
          return await apiCall("users/ids", {
            method: "POST",
            body: JSON.stringify(options.ids),
          });
        }

        return await apiCall(`users?${params.toString()}`);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des utilisateurs :",
          error,
        );
        throw error;
      }
    },

    getUserStatus: async (userId) => {
      try {
        return await apiCall(`users/${userId}/status`);
      } catch (error) {
        console.error(
          `Erreur lors de la récupération du statut de l'utilisateur ${userId} :`,
          error,
        );
        throw error;
      }
    },

    // ----- Méthodes d'emoji utilisant les utilitaires centralisés -----
    getFrequentEmojis: async () => {
      try {
        // Utiliser la fonction utilitaire
        return await getFrequentEmojis();
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des emojis fréquents :",
          error,
        );
        return ["👍", "❤️", "😂", "🎉", "🔥", "👏", "✅", "🙏"]; // Fallback
      }
    },

    addReaction: async (messageId, emoji) => {
      try {
        // En mode proxy, userId pourrait déjà être disponible depuis la configuration
        // Si non, essayer de récupérer l'utilisateur actuel
        let userIdForReaction = userId;

        if (!userIdForReaction) {
          try {
            const user = await apiCall("users/me");
            userIdForReaction = user.id;
          } catch (userError) {
            console.warn(
              "Erreur lors de la récupération de l'utilisateur, tentative sans ID:",
              userError,
            );
          }
        }

        // Mettre à jour les options avec l'ID utilisateur
        const optionsWithUser = {
          ...emojiOptions,
          currentUserId: userIdForReaction,
        };

        // Utiliser la fonction utilitaire avec l'ID utilisateur
        return await addReaction(messageId, emoji, optionsWithUser);
      } catch (error) {
        console.error(`Erreur lors de l'ajout de la réaction :`, error);
        throw error;
      }
    },

    removeReaction: async (channelId, messageId, emoji) => {
      try {
        // Utiliser la fonction utilitaire
        return await removeReaction(channelId, messageId, emoji, emojiOptions);
      } catch (error) {
        console.error(`Erreur lors de la suppression de la réaction :`, error);
        throw error;
      }
    },

    hasReacted: async (channelId, messageId, emoji) => {
      try {
        // Utiliser la fonction utilitaire
        return await hasReacted(
          channelId,
          messageId,
          emoji,
          emojiOptions,
          userId,
        );
      } catch (error) {
        console.error(`Erreur lors de la vérification de la réaction :`, error);
        return false;
      }
    },

    // ----- Méthodes de GIF utilisant les utilitaires centralisés -----
    searchGifs: async (query, category) => {
      try {
        // Utiliser la fonction utilitaire
        return await searchGifs(query, gifOptions, category);
      } catch (error) {
        console.error("Erreur lors de la recherche de GIFs :", error);
        return [];
      }
    },

    getGifs: async (category, limit = 20) => {
      try {
        // Utiliser la fonction utilitaire
        return await getGifs(category, gifOptions, limit);
      } catch (error) {
        console.error(
          `Erreur lors de la récupération des GIFs de ${category} :`,
          error,
        );
        return [];
      }
    },

    getWebsocketUrl: () => `${baseUrl.replace(/^http/, "ws")}/websocket`,

    getWebsocketToken: async () => {
      try {
        const response = await apiCall<{ token: string }>(
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
    },

    uploadFiles: async (formData) => {
      try {
        const response = await fetch(`${baseUrl}/files`, {
          method: "POST",
          headers: {
            "X-Mattermost-Client-ID": clientId,
            ...(userId ? { "X-Mattermost-User-ID": userId } : {}),
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
    },

    getBaseUrl: () => baseUrl,
  };
}

export default createProxyService;
