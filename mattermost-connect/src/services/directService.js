// src/services/directService.js
/**
 * Service pour communiquer directement avec un serveur Mattermost
 * Utilise un token API utilisateur fourni
 */
export const createDirectService = ({ serverUrl, token }) => {
  // Vérification des paramètres requis
  if (!serverUrl || !token) {
    throw new Error("serverUrl et token sont requis pour le mode direct");
  }

  // Normaliser l'URL du serveur (supprimer le slash final si présent)
  const baseUrl = serverUrl.endsWith("/") ? serverUrl.slice(0, -1) : serverUrl;

  // Méthode d'appel API avec gestion d'authentification
  const apiCall = async (endpoint, options = {}) => {
    const url = `${baseUrl}/api/v4/${endpoint}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Gestion spécifique des erreurs API Mattermost
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message ||
            `Erreur API: ${response.status} ${response.statusText}`,
        );
      }

      return response.json();
    } catch (error) {
      console.error(`Erreur lors de l'appel API à ${endpoint}:`, error);
      throw error;
    }
  };

  // Interface du service
  return {
    // Informations utilisateur
    getCurrentUser: async () => {
      return apiCall("users/me");
    },

    // Gestion des équipes
    getTeams: async () => {
      return apiCall("users/me/teams");
    },

    getTeam: async (teamId) => {
      return apiCall(`teams/${teamId}`);
    },

    // Gestion des canaux
    getChannels: async (teamId) => {
      return apiCall(`users/me/teams/${teamId}/channels`);
    },

    getChannel: async (channelId) => {
      return apiCall(`channels/${channelId}`);
    },

    // Gestion des messages
    getChannelMessages: async (
      channelId,
      { page = 0, perPage = 60, since = 0 } = {},
    ) => {
      return apiCall(
        `channels/${channelId}/posts?page=${page}&per_page=${perPage}${since ? `&since=${since}` : ""}`,
      );
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

    // Gestion des utilisateurs
    getUsers: async (options = {}) => {
      const params = new URLSearchParams();
      if (options.inChannel) params.append("in_channel", options.inChannel);
      if (options.inTeam) params.append("in_team", options.inTeam);
      if (options.perPage)
        params.append("per_page", options.perPage.toString());
      if (options.page) params.append("page", options.page.toString());

      return apiCall(`users?${params.toString()}`);
    },

    getUserStatus: async (userId) => {
      return apiCall(`users/${userId}/status`);
    },

    // Utilitaires pour WebSocket
    getWebsocketUrl: () => {
      // Convertir http(s) en ws(s)
      return baseUrl.replace(/^http/, "ws") + "/api/v4/websocket";
    },

    getWebsocketToken: async () => {
      // En mode direct, on utilise le même token
      return token;
    },
  };
};

export default createDirectService;
