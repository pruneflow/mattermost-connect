// src/services/factory.ts
import {
  MattermostService,
  ServiceConfig,
  CustomServiceProvider,
} from "../types";
import { createDirectService } from "./direct.service";
import { createProxyService } from "./proxy.service";
import { MOCK_GIFS, GIF_CATEGORIES } from "../components/EmojiPicker";

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
  return {
    mode: "custom",

    // Méthodes de base simulées
    getCurrentUser: async () => ({
      id: "user1",
      username: "testuser",
      first_name: "Test",
      last_name: "User",
      email: "test@example.com",
      roles: "system_user",
    }),

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

    // Méthodes pour les emojis
    getFrequentEmojis: async () => [
      "👍",
      "❤️",
      "😂",
      "🎉",
      "🔥",
      "👏",
      "✅",
      "🙏",
    ],

    addReaction: async () => ({ success: true }),

    removeReaction: async () => ({ success: true }),

    hasReacted: async () => false,

    // Méthodes pour les GIFs
    searchGifs: async (query) => {
      // Combiner tous les GIFs et filtrer par titre
      const allGifs = Object.values(MOCK_GIFS).flat();
      return allGifs.filter((gif) =>
        gif.title.toLowerCase().includes(query.toLowerCase()),
      );
    },

    getGifs: async (category) => MOCK_GIFS[category] || [],

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
