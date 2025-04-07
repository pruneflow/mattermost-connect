// src/services/proxyService.js
/**
 * Service pour communiquer avec Mattermost via notre service proxy
 * Gère l'authentification et les tokens côté serveur
 */
export const createProxyService = ({ proxyUrl, clientId, userId }) => {
  // Vérification des paramètres requis
  if (!proxyUrl || !clientId) {
    throw new Error("proxyUrl et clientId sont requis pour le mode proxy");
  }

  // Normaliser l'URL du proxy (supprimer le slash final si présent)
  const baseUrl = proxyUrl.endsWith("/") ? proxyUrl.slice(0, -1) : proxyUrl;

  // Méthode d'appel API avec gestion d'authentification
  const apiCall = async (endpoint, options = {}) => {
    const url = `${baseUrl}/${endpoint}`;

    // En mode proxy, nous envoyons le clientId et userId pour l'authentification
    const headers = {
      "X-Mattermost-Client-ID": clientId,
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Ajouter l'ID utilisateur si disponible
    if (userId) {
      headers["X-Mattermost-User-ID"] = userId;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Gestion des erreurs
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message ||
            `Erreur API Proxy: ${response.status} ${response.statusText}`,
        );
      }

      return response.json();
    } catch (error) {
      console.error(`Erreur lors de l'appel API Proxy à ${endpoint}:`, error);
      throw error;
    }
  };

  // Interface du service (similaire au service direct pour maintenir une API cohérente)
  return {
    // Informations utilisateur
    getCurrentUser: async () => {
      return apiCall("users/me");
    },

    // Gestion des équipes
    getTeams: async () => {
      return apiCall("teams");
    },

    getTeam: async (teamId) => {
      return apiCall(`teams/${teamId}`);
    },

    // Gestion des canaux
    getChannels: async (teamId) => {
      return apiCall(`teams/${teamId}/channels`);
    },

    getChannel: async (channelId) => {
      return apiCall(`channels/${channelId}`);
    },

    // Gestion des messages
    getChannelMessages: async (
      channelId,
      { page = 0, perPage = 60, since = 0 } = {},
    ) => {
      let endpoint = `channels/${channelId}/messages?page=${page}&per_page=${perPage}`;
      if (since) endpoint += `&since=${since}`;
      return apiCall(endpoint);
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
      // Pour le mode proxy, l'URL WebSocket est gérée par le proxy
      return `${baseUrl.replace(/^http/, "ws")}/websocket`;
    },

    getWebsocketToken: async () => {
      // En mode proxy, nous avons besoin d'un token temporaire pour le WebSocket
      const response = await apiCall("websocket/token");
      return response.token;
    },
  };
};

export default createProxyService;
