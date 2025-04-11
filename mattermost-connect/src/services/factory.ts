// src/services/factory.ts
import {
  MattermostService,
  ServiceConfig,
  CustomServiceProvider,
  User,
} from "../types";
import { createDirectService, DirectService } from "./direct.service";
import { createProxyService, ProxyService } from "./proxy.service";
import { GifData } from "../types";
import { MOCK_GIFS } from "../components/message/EmojiPicker";

/**
 * Creates a custom service based on the service provider
 */
function createCustomService(
  provider: CustomServiceProvider,
): MattermostService {
  // The provider must implement the setupService method
  const service = provider.setupService();

  // If a current user is provided, set it in the service
  // if the service implements the necessary interface
  if (provider.currentUser && "setCurrentUser" in service) {
    (service as any).setCurrentUser(provider.currentUser);
  }

  return service;
}

/**
 * Main function to create a Mattermost service
 * Automatically determines the mode based on the configuration
 *
 * @param config - Service configuration
 * @returns A Mattermost service instance
 */
export function createMattermostService(
  config: ServiceConfig,
): MattermostService {
  // Determine mode based on configuration
  if (config.serviceProvider) {
    return createCustomService(config.serviceProvider);
  } else if (config.serverUrl && config.token) {
    const service = createDirectService({
      serverUrl: config.serverUrl,
      token: config.token,
    });

    // Preload the current user in the background
    if (service instanceof DirectService) {
      Promise.resolve().then(() => {
        service
          .getCurrentUser()
          .catch((err) => console.warn("Failed to preload user:", err));
      });
    }

    return service;
  } else if (config.proxyUrl && config.clientId) {
    const service = createProxyService({
      proxyUrl: config.proxyUrl,
      clientId: config.clientId,
      userId: config.userId,
    });

    // Preload the current user in the background
    if (service instanceof ProxyService) {
      Promise.resolve().then(() => {
        service
          .getCurrentUser()
          .catch((err) => console.warn("Failed to preload user:", err));
      });
    }

    return service;
  } else if (config.serverUrl) {
    // Add this condition to allow creation with just the URL
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
 * Creates a mock service for testing and development
 */
export function createMockService(): MattermostService {
  // Create a mock service with preloaded current user
  const mockUser: User = {
    id: "user1",
    username: "johndoe",
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    roles: "system_user",
  };

  // Use an object-based approach to simulate caching
  // This will also help test if service methods work correctly
  let _cachedUser: User = mockUser;

  return {
    mode: "custom",

    // User cache simulation
    _currentUser: mockUser,

    authenticate: async (username: string, password: string) => {
      // Simulate authentication
      if (username === "demo" && password === "password") {
        return { token: "mock-user-token" };
      }
      throw new Error("Authentication failed");
    },

    validateToken: async (token) => {
      return token === "mock-user-token";
    },

    getCurrentUser: async () => {
      // Use the cached user
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

    getPost: async (messageId) => ({
      id: messageId,
      user_id: "user1",
      channel_id: "channel1",
      message: "This is a referenced message",
      create_at: Date.now() - 1000 * 60 * 10,
      update_at: Date.now() - 1000 * 60 * 10,
    }),

    editMessage: async (messageId, newMessage) => {
      // Simulate message editing
      console.log(`Mock: Message ${messageId} edited with text:`, newMessage);

      return {
        id: messageId,
        user_id: "user1",
        channel_id: "channel1",
        message: newMessage,
        create_at: Date.now() - 1000 * 60 * 5, // Keep original creation timestamp
        update_at: Date.now(), // Update modification timestamp
      };
    },

    deleteMessage: async (messageId) => {
      // Simulate message deletion
      console.log(`Mock: Message ${messageId} deleted`);

      return { success: true };
    },

    replyToMessage: async (channelId, messageId, responseMessage) => {
      // Simulate replying to a message
      console.log(
        `Mock: Reply to message ${messageId} in channel ${channelId}:`,
        responseMessage,
      );

      return {
        id: `post-reply-${Date.now()}`,
        user_id: "user1",
        channel_id: channelId,
        message: responseMessage,
        create_at: Date.now(),
        update_at: Date.now(),
        // Reply-specific properties
        root_id: messageId,
        props: {
          quoted_message_id: messageId,
        },
      };
    },

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

    // WebSocket methods - ADDED MISSING METHODS
    getWebsocketUrl: () => {
      // Use consistent format with real API
      return "ws://mock-websocket-url/api/v4/websocket";
    },

    getWebsocketToken: async () => {
      return "mock-token";
    },

    // Emoji/GIF methods - ADDED MISSING METHODS
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
    addReaction: async (messageId, emoji) => ({ success: true }),
    removeReaction: async () => ({ success: true }),
    hasReacted: async () => false,
    searchGifs: async (query: string): Promise<GifData[]> => {
      // Find GIFs that match the query or return trending
      const allGifs = Object.values(MOCK_GIFS).flat();
      const results = query.trim()
        ? allGifs.filter((gif) =>
            gif.title.toLowerCase().includes(query.toLowerCase()),
          )
        : MOCK_GIFS["Trending"] || [];

      return results;
    },
    getGifs: async (category): Promise<GifData[]> => {
      return MOCK_GIFS[category] || [];
    },

    // File methods
    uploadFiles: async () => ({
      file_infos: [{ id: "file1", name: "test.jpg" }],
    }),

    // Utility methods
    getBaseUrl: () => "https://example.com",

    // Methods like BaseService to simulate user cache
    setCurrentUser: (user: User) => {
      _cachedUser = user;
    },

    refreshCurrentUser: async () => {
      return _cachedUser;
    },
  };
}
