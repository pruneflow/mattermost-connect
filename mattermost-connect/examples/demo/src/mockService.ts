// examples/demo/src/mockService.ts
import {
  MattermostService,
  User,
  Team,
  Channel,
  Message,
  UserStatus,
  MessagesResponse,
  GetMessagesOptions,
  GetUsersOptions,
} from "mattermost-connect";

// Délai simulé pour imiter les temps de réponse du réseau (en ms)
const SIMULATED_DELAY = 300;

// Fonction utilitaire pour simuler un délai réseau
const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Données fictives pour la démonstration
const mockData = {
  currentUser: {
    id: "user1",
    username: "johndoe",
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    roles: "system_user",
  } as User,

  teams: [
    {
      id: "team1",
      name: "engineering",
      display_name: "Engineering Team",
      description: "Team for developers and engineers",
    },
    {
      id: "team2",
      name: "marketing",
      display_name: "Marketing Team",
      description: "Team for marketing and communications",
    },
  ] as Team[],

  channels: {
    team1: [
      {
        id: "channel1",
        team_id: "team1",
        name: "general",
        display_name: "General",
        type: "O" as const,
        header: "General discussion channel",
        purpose: "General team discussions",
        create_at: Date.now() - 30 * 24 * 60 * 60 * 1000,
        update_at: Date.now() - 30 * 24 * 60 * 60 * 1000,
        delete_at: 0,
      },
      {
        id: "channel2",
        team_id: "team1",
        name: "development",
        display_name: "Development",
        type: "O" as const,
        header: "Development discussions and updates",
        purpose: "Technical discussions",
        create_at: Date.now() - 20 * 24 * 60 * 60 * 1000,
        update_at: Date.now() - 20 * 24 * 60 * 60 * 1000,
        delete_at: 0,
      },
      {
        id: "channel3",
        team_id: "team1",
        name: "private-channel",
        display_name: "Private Channel",
        type: "P" as const,
        header: "Private channel for the team",
        purpose: "Confidential discussions",
        create_at: Date.now() - 15 * 24 * 60 * 60 * 1000,
        update_at: Date.now() - 15 * 24 * 60 * 60 * 1000,
        delete_at: 0,
      },
    ],
    team2: [
      {
        id: "channel4",
        team_id: "team2",
        name: "general",
        display_name: "General",
        type: "O" as const,
        header: "General marketing channel",
        purpose: "General marketing discussions",
        create_at: Date.now() - 25 * 24 * 60 * 60 * 1000,
        update_at: Date.now() - 25 * 24 * 60 * 60 * 1000,
        delete_at: 0,
      },
      {
        id: "channel5",
        team_id: "team2",
        name: "campaigns",
        display_name: "Campaigns",
        type: "O" as const,
        header: "Marketing campaign organization",
        purpose: "Campaign planning",
        create_at: Date.now() - 18 * 24 * 60 * 60 * 1000,
        update_at: Date.now() - 18 * 24 * 60 * 60 * 1000,
        delete_at: 0,
      },
    ],
  },

  users: [
    {
      id: "user1",
      username: "johndoe",
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
      roles: "system_user",
    },
    {
      id: "user2",
      username: "janedoe",
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@example.com",
      roles: "system_user",
    },
    {
      id: "user3",
      username: "bobsmith",
      first_name: "Bob",
      last_name: "Smith",
      email: "bob@example.com",
      roles: "system_user",
    },
  ] as User[],

  messages: {
    channel1: [
      {
        id: "post1",
        user_id: "user1",
        channel_id: "channel1",
        message: "Hello everyone! How are you doing today?",
        create_at: Date.now() - 3600000, // 1 hour ago
        update_at: Date.now() - 3600000,
        delete_at: 0,
      },
      {
        id: "post2",
        user_id: "user2",
        channel_id: "channel1",
        message: "Hi John! Doing well here, how about you?",
        create_at: Date.now() - 3500000, // 58 minutes ago
        update_at: Date.now() - 3500000,
        delete_at: 0,
      },
      {
        id: "post3",
        user_id: "user1",
        channel_id: "channel1",
        message:
          "Great, thanks! I have a question about the **Alpha** project - has anyone updated the documentation?",
        create_at: Date.now() - 3400000, // 56 minutes ago
        update_at: Date.now() - 3400000,
        delete_at: 0,
      },
      {
        id: "post4",
        user_id: "user3",
        channel_id: "channel1",
        message:
          "I started updating the documentation yesterday. Here's the link: [Alpha Documentation](https://example.com/docs/alpha)",
        create_at: Date.now() - 1800000, // 30 minutes ago
        update_at: Date.now() - 1800000,
        delete_at: 0,
      },
    ],
    channel2: [
      {
        id: "post5",
        user_id: "user1",
        channel_id: "channel2",
        message:
          "Here's some JavaScript code to solve this problem:\n```javascript\nfunction solution(input) {\n  return input.filter(x => x > 0).map(x => x * 2);\n}\n```",
        create_at: Date.now() - 7200000, // 2 hours ago
        update_at: Date.now() - 7200000,
        delete_at: 0,
      },
      {
        id: "post6",
        user_id: "user3",
        channel_id: "channel2",
        message:
          "Thanks for the solution, but I think we can optimize it further.",
        create_at: Date.now() - 5400000, // 1.5 hours ago
        update_at: Date.now() - 5400000,
        delete_at: 0,
      },
    ],
    channel3: [
      {
        id: "post7",
        user_id: "user2",
        channel_id: "channel3",
        message:
          "Reminder: The confidential meeting is scheduled for tomorrow at 2pm.",
        create_at: Date.now() - 86400000, // 1 day ago
        update_at: Date.now() - 86400000,
        delete_at: 0,
      },
    ],
    channel4: [],
    channel5: [
      {
        id: "post8",
        user_id: "user2",
        channel_id: "channel5",
        message:
          "The new campaign will be launched next week. Is everyone ready?",
        create_at: Date.now() - 172800000, // 2 days ago
        update_at: Date.now() - 172800000,
        delete_at: 0,
      },
    ],
  },

  // Variable pour générer des IDs uniques pour les nouveaux messages
  nextPostId: 100,
};

/**
 * Creates a mock service for demonstration purposes
 * @returns A MattermostService implementation using mock data
 */
const createMockService = (): MattermostService => {
  // Copie les données pour pouvoir les modifier sans affecter l'original
  let teams = [...mockData.teams];
  let channels = JSON.parse(JSON.stringify(mockData.channels));
  let users = [...mockData.users];
  let messages = JSON.parse(JSON.stringify(mockData.messages));
  let nextPostId = mockData.nextPostId;

  return {
    // User information
    getCurrentUser: async (): Promise<User> => {
      await delay(SIMULATED_DELAY);
      return { ...mockData.currentUser };
    },

    // Teams management
    getTeams: async (): Promise<Team[]> => {
      await delay(SIMULATED_DELAY);
      return [...teams];
    },

    getTeam: async (teamId: string): Promise<Team> => {
      await delay(SIMULATED_DELAY);
      const team = teams.find((t) => t.id === teamId);
      if (!team) {
        throw new Error(`Team not found: ${teamId}`);
      }
      return { ...team };
    },

    // Channels management
    getChannels: async (teamId: string): Promise<Channel[]> => {
      await delay(SIMULATED_DELAY);
      const teamChannels = channels[teamId] || [];
      return [...teamChannels];
    },

    getChannel: async (channelId: string): Promise<Channel> => {
      await delay(SIMULATED_DELAY);
      let foundChannel: Channel | null = null;

      // Search for the channel in all teams
      Object.values(channels).forEach((teamChannels: Channel[]) => {
        const channel = teamChannels.find((c) => c.id === channelId);
        if (channel) {
          foundChannel = channel;
        }
      });

      if (!foundChannel) {
        throw new Error(`Channel not found: ${channelId}`);
      }
      return { ...foundChannel };
    },

    // Messages management
    getChannelMessages: async (
      channelId: string,
      options: GetMessagesOptions = {},
    ): Promise<MessagesResponse> => {
      await delay(SIMULATED_DELAY);

      // Get channel messages or empty array if none
      const channelMessages = messages[channelId] || [];

      // Sort messages by creation date (oldest first)
      const sortedMessages = [...channelMessages].sort(
        (a, b) => a.create_at - b.create_at,
      );

      // Handle pagination
      const { page = 0, perPage = 60, before, after } = options;

      let filteredMessages = sortedMessages;

      // Filter by "before" message ID
      if (before) {
        const beforeIndex = filteredMessages.findIndex(
          (msg) => msg.id === before,
        );
        if (beforeIndex !== -1) {
          filteredMessages = filteredMessages.slice(0, beforeIndex);
        }
      }

      // Filter by "after" message ID
      if (after) {
        const afterIndex = filteredMessages.findIndex(
          (msg) => msg.id === after,
        );
        if (afterIndex !== -1) {
          filteredMessages = filteredMessages.slice(afterIndex + 1);
        }
      }

      // Apply pagination
      const start = page * perPage;
      const end = start + perPage;
      const pagedMessages = filteredMessages.slice(start, end);

      // Convert array to object with ID as key (Mattermost format)
      const postsObject: Record<string, Message> = {};
      pagedMessages.forEach((message) => {
        postsObject[message.id] = { ...message };
      });

      return {
        posts: postsObject,
        order: pagedMessages.map((m) => m.id),
        next_post_id: "",
        prev_post_id: "",
      };
    },

    postMessage: async (
      channelId: string,
      message: string,
    ): Promise<Message> => {
      await delay(SIMULATED_DELAY);

      // Create a new message ID
      const postId = `post${nextPostId++}`;

      // Create the message
      const newMessage: Message = {
        id: postId,
        user_id: mockData.currentUser.id,
        channel_id: channelId,
        message,
        create_at: Date.now(),
        update_at: Date.now(),
        delete_at: 0,
      };

      // Add to the list of messages for this channel
      if (!messages[channelId]) {
        messages[channelId] = [];
      }

      messages[channelId].push(newMessage);

      return { ...newMessage };
    },

    // Users management
    getUsers: async (options: GetUsersOptions = {}): Promise<User[]> => {
      await delay(SIMULATED_DELAY);

      if (options.ids && options.ids.length > 0) {
        return users.filter((user) => options.ids?.includes(user.id));
      }

      return [...users];
    },

    getUserStatus: async (userId: string): Promise<UserStatus> => {
      await delay(SIMULATED_DELAY);
      return { user_id: userId, status: "online" };
    },

    // WebSocket utilities
    getWebsocketUrl: (): string => {
      return "ws://mock-websocket-url";
    },

    getWebsocketToken: async (): Promise<string> => {
      await delay(SIMULATED_DELAY);
      return "mock-websocket-token";
    },

    // File uploads
    uploadFiles: async (formData: FormData): Promise<any> => {
      await delay(SIMULATED_DELAY * 2); // Longer delay to simulate upload

      // Extract the files from FormData
      const files: File[] = [];
      if (formData.getAll("files")) {
        formData.getAll("files").forEach((file) => {
          if (file instanceof File) {
            files.push(file);
          }
        });
      }

      return {
        file_infos: files.map((file, index) => ({
          id: `file${Date.now()}-${index}`,
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      };
    },
  };
};

export default createMockService;
