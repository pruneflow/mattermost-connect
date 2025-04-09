// src/services/factory.ts
import {
  MattermostService,
  ServiceConfig,
  CustomServiceProvider,
  User,
} from "../types";
import { createDirectService, DirectService } from "./direct.service";
import { createProxyService, ProxyService } from "./proxy.service";

/**
 * Crée un service personnalisé basé sur le fournisseur de service
 */
function createCustomService(
  provider: CustomServiceProvider,
): MattermostService {
  // Le fournisseur doit implémenter la méthode setupService
  const service = provider.setupService();

  // Si un utilisateur courant est fourni, le définir dans le service
  // si le service implémente l'interface nécessaire
  if (provider.currentUser && "setCurrentUser" in service) {
    (service as any).setCurrentUser(provider.currentUser);
  }

  return service;
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
    const service = createDirectService({
      serverUrl: config.serverUrl,
      token: config.token,
    });

    // Pré-charger l'utilisateur courant en arrière-plan
    if (service instanceof DirectService) {
      Promise.resolve().then(() => {
        service
          .getCurrentUser()
          .catch((err) =>
            console.warn("Échec du préchargement de l'utilisateur:", err),
          );
      });
    }

    return service;
  } else if (config.proxyUrl && config.clientId) {
    const service = createProxyService({
      proxyUrl: config.proxyUrl,
      clientId: config.clientId,
      userId: config.userId,
    });

    // Pré-charger l'utilisateur courant en arrière-plan
    if (service instanceof ProxyService) {
      Promise.resolve().then(() => {
        service
          .getCurrentUser()
          .catch((err) =>
            console.warn("Échec du préchargement de l'utilisateur:", err),
          );
      });
    }

    return service;
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
  // Créer un mock service avec l'utilisateur courant préchargé
  const mockUser: User = {
    id: "user1",
    username: "johndoe",
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    roles: "system_user",
  };

  // On utilise une approche basée sur les objets pour simuler le caching
  // Cela permettra également de tester si les méthodes du service fonctionnent correctement
  let _cachedUser: User = mockUser;

  return {
    mode: "custom",

    // Cache utilisateur simulé
    _currentUser: mockUser,

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
      // Utiliser l'utilisateur en cache
      return _cachedUser;
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

    // Méthodes emoji/gifs
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
    searchGifs: async () => [],
    getGifs: async () => [],

    // Méthodes WebSocket
    getWebsocketUrl: () => "wss://example.com/websocket",
    getWebsocketToken: async () => "mock-token",

    // Méthodes fichiers
    uploadFiles: async () => ({
      file_infos: [{ id: "file1", name: "test.jpg" }],
    }),

    // Méthodes utilitaires
    getBaseUrl: () => "https://example.com",

    // Méthodes similaires à celles du BaseService pour simuler le cache d'utilisateur
    setCurrentUser: (user: User) => {
      _cachedUser = user;
    },

    refreshCurrentUser: async () => {
      return _cachedUser;
    },
  };
}
