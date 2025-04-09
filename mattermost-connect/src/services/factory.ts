// src/services/factory.ts
import {
  MattermostService,
  ServiceConfig,
  CustomServiceProvider,
} from "../types";
import { createDirectService } from "./direct.service";
import { createProxyService } from "./proxy.service";

// Importer les utilitaires d'emoji
import {
  getFrequentEmojis,
  searchGifs,
  getGifs,
  GifApiOptions,
} from "../utils/emoji.utils";

/**
 * Crée un service personnalisé basé sur le fournisseur de service
 */
function createCustomService(
  provider: CustomServiceProvider,
): MattermostService {
  // Le fournisseur doit implémenter la méthode setupService
  return provider.setupService();
}

/**
 * Fonction principale pour créer un service Mattermost
 * Détermine automatiquement le mode en fonction de la configuration
 *
 * @param config - Configuration du service
 * @returns Une instance du service Mattermost
 */
export function createMattermostService(
  config: ServiceConfig,
): MattermostService {
  // Déterminer le mode selon la configuration
  if (config.serviceProvider) {
    return createCustomService(config.serviceProvider);
  } else if (config.serverUrl && config.token) {
    return createDirectService({
      serverUrl: config.serverUrl,
      token: config.token,
    });
  } else if (config.proxyUrl && config.clientId) {
    return createProxyService({
      proxyUrl: config.proxyUrl,
      clientId: config.clientId,
      userId: config.userId,
    });
  } else if (config.serverUrl) {
    // Ajouter cette condition pour permettre la création avec uniquement l'URL
    return createDirectService({
      serverUrl: config.serverUrl,
    });
  } else {
    throw new Error(
      "Invalid configuration. You must provide (serverUrl and token) OR " +
        "(proxyUrl and clientId) OR serviceProvider.",
    );
  }
}

/**
 * Crée un service mock pour les tests et développement
 */
export function createMockService(): MattermostService {
  // Options pour les utilitaires de GIF du mock service
  const mockGifOptions: GifApiOptions = {
    baseUrl: "https://mock-api.example.com",
    mode: "direct",
    useRealApi: false,
  };

  return {
    mode: "custom",

    authenticate: async (username: string, password: string) => {
      // Simulation d'une authentification
      if (username === "demo" && password === "password") {
        return { token: "mock-user-token" };
      }
      throw new Error("Authentification échouée");
    },
    validateToken: async (token) => {
      return token === "mock-user-token";
    },

    getCurrentUser: async () => {
      try {
        return {
          id: "user1",
          username: "johndoe",
          first_name: "John",
          last_name: "Doe",
          email: "john@example.com",
          roles: "system_user",
        };
      } catch (error) {
        throw new Error("Impossible de récupérer l'utilisateur actuel");
      }
    },

    getTeams: async () => [
      { id: "team1", name: "team1", display_name: "Team One" },
      { id: "team2", name: "team2", display_name: "Team Two" },
    ],

    getTeam: async (teamId) => ({
      id: teamId,
      name: `team-${teamId}`,
      display_name: `Team ${teamId.charAt(0).toUpperCase() + teamId.slice(1)}`,
    }),

    getChannels: async () => [
      {
        id: "channel1",
        team_id: "team1",
        name: "general",
        display_name: "General",
        type: "O",
        create_at: Date.now(),
        update_at: Date.now(),
        delete_at: 0,
      },
      {
        id: "channel2",
        team_id: "team1",
        name: "random",
        display_name: "Random",
        type: "O",
        create_at: Date.now(),
        update_at: Date.now(),
        delete_at: 0,
      },
    ],

    getChannel: async (channelId) => ({
      id: channelId,
      team_id: "team1",
      name: `channel-${channelId}`,
      display_name: `Channel ${channelId}`,
      type: "O",
      create_at: Date.now(),
      update_at: Date.now(),
      delete_at: 0,
    }),

    getChannelMessages: async () => ({
      posts: {
        post1: {
          id: "post1",
          user_id: "user1",
          channel_id: "channel1",
          message: "This is a test message",
          create_at: Date.now() - 1000 * 60 * 5,
          update_at: Date.now() - 1000 * 60 * 5,
        },
        post2: {
          id: "post2",
          user_id: "user2",
          channel_id: "channel1",
          message: "This is a response",
          create_at: Date.now() - 1000 * 60 * 2,
          update_at: Date.now() - 1000 * 60 * 2,
        },
      },
      order: ["post1", "post2"],
    }),

    postMessage: async (channelId, message) => ({
      id: `post-${Date.now()}`,
      user_id: "user1",
      channel_id: channelId,
      message,
      create_at: Date.now(),
      update_at: Date.now(),
    }),

    getUsers: async () => [
      {
        id: "user1",
        username: "testuser",
        first_name: "Test",
        last_name: "User",
      },
      {
        id: "user2",
        username: "anotheruser",
        first_name: "Another",
        last_name: "User",
      },
    ],

    getUserStatus: async () => ({
      user_id: "user1",
      status: "online",
    }),

    // Méthodes pour les emojis utilisant les utilitaires centralisés
    getFrequentEmojis: async () => {
      // Utiliser la fonction utilitaire
      return getFrequentEmojis();
    },

    addReaction: async () => ({ success: true }),

    removeReaction: async () => ({ success: true }),

    hasReacted: async () => false,

    // Méthodes pour les GIFs utilisant les utilitaires centralisés
    searchGifs: async (query) => {
      // Utiliser la fonction utilitaire
      return searchGifs(query, mockGifOptions);
    },

    getGifs: async (category) => {
      // Utiliser la fonction utilitaire
      return getGifs(category, mockGifOptions);
    },

    // Méthodes pour WebSocket
    getWebsocketUrl: () => "wss://example.com/websocket",

    getWebsocketToken: async () => "mock-token",

    // Méthodes pour les fichiers
    uploadFiles: async () => ({
      file_infos: [{ id: "file1", name: "test.jpg" }],
    }),

    // Méthodes utilitaires
    getBaseUrl: () => "https://example.com",
  };
}
