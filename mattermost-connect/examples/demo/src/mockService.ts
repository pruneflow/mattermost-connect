// examples/demo/src/mockService.ts
import { DemoMockData } from "./mockData";

/**
 * Simulates a WebSocket connection and event handling
 */
class MockWebSocketService {
  private handlers: Map<string, Set<(data: any) => void>> = new Map();
  private isConnected: boolean = false;
  private intervalId: number | null = null;

  /**
   * Connect to the mock WebSocket server
   */
  connect() {
    this.isConnected = true;
    console.log("Mock WebSocket connected");

    // Simulate occasional message events
    this.intervalId = window.setInterval(() => {
      if (Math.random() > 0.8) {
        this.simulateMessageEvent();
      }
    }, 30000) as unknown as number;

    return true;
  }

  /**
   * Disconnect from the mock WebSocket server
   */
  disconnect() {
    this.isConnected = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log("Mock WebSocket disconnected");
  }

  /**
   * Add a message handler for a specific event type
   * @param eventType Event type to listen for
   * @param handler Handler function
   * @returns Function to remove the handler
   */
  addHandler(eventType: string, handler: (data: any) => void) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)?.add(handler);

    return () => {
      const handlersForType = this.handlers.get(eventType);
      if (handlersForType) {
        handlersForType.delete(handler);
        if (handlersForType.size === 0) {
          this.handlers.delete(eventType);
        }
      }
    };
  }

  /**
   * Simulate a random message event
   */
  private simulateMessageEvent() {
    // Get random channel and user
    const channels = DemoMockData.channels;
    const users = DemoMockData.users;
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const user = users[Math.floor(Math.random() * users.length)];

    // Create a fake message
    const messageId = `auto_msg_${Date.now()}`;
    const message = {
      id: messageId,
      user_id: user.id,
      channel_id: channel.id,
      message: `Random message from ${user.first_name} at ${new Date().toLocaleTimeString()}`,
      create_at: Date.now(),
      update_at: Date.now(),
    };

    // Add to mock data
    DemoMockData.messages.push(message);

    // Notify handlers
    this.notifyHandlers("posted", {
      event: "posted",
      data: {
        post: message,
        channel_id: channel.id,
      },
    });
  }

  /**
   * Notify all handlers of an event
   * @param eventType Event type
   * @param data Event data
   */
  private notifyHandlers(eventType: string, data: any) {
    const handlersForType = this.handlers.get(eventType);
    if (handlersForType) {
      handlersForType.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket handler for ${eventType}:`, error);
        }
      });
    }

    // Also notify generic * handlers
    const allHandlers = this.handlers.get("*");
    if (allHandlers) {
      allHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket handler for *:`, error);
        }
      });
    }
  }

  /**
   * Check if the WebSocket is connected
   */
  isSocketConnected() {
    return this.isConnected;
  }
}

/**
 * Create a mock service for the MattermostConnect library
 * This simulates the backend API and WebSocket connections
 */
const createMockService = () => {
  // Create a mock WebSocket service
  const mockWsService = new MockWebSocketService();

  // Helper: Generate a unique ID
  const generateId = () => Math.random().toString(36).substring(2, 15);

  return {
    // Users
    getCurrentUser: async () => {
      return DemoMockData.currentUser;
    },
    getUser: async (userId: string) => {
      return DemoMockData.users.find((user) => user.id === userId) || null;
    },
    getUsers: async () => {
      return DemoMockData.users;
    },
    getUserStatus: async (userId: string) => {
      // Simulate random status
      const statuses = ["online", "away", "dnd", "offline"];
      return {
        user_id: userId,
        status: statuses[Math.floor(Math.random() * statuses.length)],
      };
    },

    // Teams
    getTeams: async () => {
      return DemoMockData.teams;
    },
    getTeam: async (teamId: string) => {
      return DemoMockData.teams.find((team) => team.id === teamId) || null;
    },
    createTeam: async (teamData: any) => {
      const newTeam = {
        id: generateId(),
        ...teamData,
        create_at: Date.now(),
        update_at: Date.now(),
        delete_at: 0,
      };
      DemoMockData.teams.push(newTeam);
      return newTeam;
    },

    // Channels
    getChannels: async (teamId: string) => {
      return DemoMockData.channels.filter(
        (channel) => channel.team_id === teamId,
      );
    },
    getChannel: async (channelId: string) => {
      return (
        DemoMockData.channels.find((channel) => channel.id === channelId) ||
        null
      );
    },
    createChannel: async (channelData: any) => {
      const newChannel = {
        id: generateId(),
        ...channelData,
        create_at: Date.now(),
        update_at: Date.now(),
        delete_at: 0,
      };
      DemoMockData.channels.push(newChannel);
      return newChannel;
    },

    // Messages
    getMessages: async (channelId: string) => {
      return DemoMockData.messages.filter(
        (msg) => msg.channel_id === channelId,
      );
    },
    getThreadMessages: async (rootId: string) => {
      return DemoMockData.messages.filter((msg) => msg.root_id === rootId);
    },
    sendMessage: async (
      channelId: string,
      messageText: string,
      rootId?: string,
    ) => {
      const newMessage = {
        id: generateId(),
        user_id: DemoMockData.currentUser.id,
        channel_id: channelId,
        message: messageText,
        create_at: Date.now(),
        update_at: Date.now(),
        root_id: rootId,
      };
      DemoMockData.messages.push(newMessage);

      // Simulate WebSocket event
      setTimeout(() => {
        mockWsService.addHandler("posted", (data) => data);
      }, 100);

      return newMessage;
    },
    editMessage: async (messageId: string, messageText: string) => {
      const index = DemoMockData.messages.findIndex(
        (msg) => msg.id === messageId,
      );
      if (index !== -1) {
        const updatedMessage = {
          ...DemoMockData.messages[index],
          message: messageText,
          update_at: Date.now(),
        };
        DemoMockData.messages[index] = updatedMessage;

        // Simulate WebSocket event
        setTimeout(() => {
          mockWsService.addHandler("post_edited", (data) => data);
        }, 100);

        return updatedMessage;
      }
      throw new Error("Message not found");
    },
    deleteMessage: async (messageId: string) => {
      const index = DemoMockData.messages.findIndex(
        (msg) => msg.id === messageId,
      );
      if (index !== -1) {
        const deletedMessage = DemoMockData.messages[index];
        DemoMockData.messages.splice(index, 1);

        // Simulate WebSocket event
        setTimeout(() => {
          mockWsService.addHandler("post_deleted", (data) => data);
        }, 100);

        return deletedMessage;
      }
      throw new Error("Message not found");
    },

    // WebSocket simulation
    connectWebSocket: () => {
      return mockWsService.connect();
    },
    disconnectWebSocket: () => {
      mockWsService.disconnect();
    },
    addMessageHandler: (eventType: string, handler: (data: any) => void) => {
      return mockWsService.addHandler(eventType, handler);
    },
    isWebSocketConnected: () => {
      return mockWsService.isSocketConnected();
    },
  };
};

export default createMockService;
