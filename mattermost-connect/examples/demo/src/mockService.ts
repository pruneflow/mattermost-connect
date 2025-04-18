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
    update_at: Date.now(),
  } as User,

  teams: [
    {
      id: "team1",
      name: "engineering",
      display_name: "Engineering Team",
      description: "Team for developers and engineers",
      member_count: 12,
    },
    {
      id: "team2",
      name: "marketing",
      display_name: "Marketing Team",
      description: "Team for marketing and communications",
      member_count: 8,
    },
    {
      id: "team3",
      name: "product",
      display_name: "Product Management",
      description: "Team for product managers and designers",
      member_count: 5,
    },
    {
      id: "team4",
      name: "support",
      display_name: "Customer Support",
      description: "Team for customer success and support",
      member_count: 15,
    },
    {
      id: "team5",
      name: "sales",
      display_name: "Sales Team",
      description: "Team for sales representatives and account managers",
      member_count: 10,
    },
    {
      id: "team6",
      name: "executive",
      display_name: "Executive Team",
      description: "Team for company leadership",
      member_count: 4,
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
    team3: [
      {
        id: "channel6",
        team_id: "team3",
        name: "general",
        display_name: "General",
        type: "O" as const,
        header: "General product channel",
        purpose: "Product team discussions",
        create_at: Date.now() - 28 * 24 * 60 * 60 * 1000,
        update_at: Date.now() - 28 * 24 * 60 * 60 * 1000,
        delete_at: 0,
      },
      {
        id: "channel7",
        team_id: "team3",
        name: "roadmap",
        display_name: "Product Roadmap",
        type: "O" as const,
        header: "Product roadmap planning",
        purpose: "Discussions about future product features",
        create_at: Date.now() - 14 * 24 * 60 * 60 * 1000,
        update_at: Date.now() - 14 * 24 * 60 * 60 * 1000,
        delete_at: 0,
      },
    ],
    team4: [
      {
        id: "channel8",
        team_id: "team4",
        name: "general",
        display_name: "General",
        type: "O" as const,
        header: "Support team general channel",
        purpose: "General support discussions",
        create_at: Date.now() - 22 * 24 * 60 * 60 * 1000,
        update_at: Date.now() - 22 * 24 * 60 * 60 * 1000,
        delete_at: 0,
      },
      {
        id: "channel9",
        team_id: "team4",
        name: "cases",
        display_name: "Support Cases",
        type: "O" as const,
        header: "Support case discussions",
        purpose: "Discussing open support cases",
        create_at: Date.now() - 12 * 24 * 60 * 60 * 1000,
        update_at: Date.now() - 12 * 24 * 60 * 60 * 1000,
        delete_at: 0,
      },
    ],
    team5: [
      {
        id: "channel10",
        team_id: "team5",
        name: "general",
        display_name: "General",
        type: "O" as const,
        header: "Sales team general channel",
        purpose: "General sales discussions",
        create_at: Date.now() - 20 * 24 * 60 * 60 * 1000,
        update_at: Date.now() - 20 * 24 * 60 * 60 * 1000,
        delete_at: 0,
      },
      {
        id: "channel11",
        team_id: "team5",
        name: "deals",
        display_name: "Deals Pipeline",
        type: "O" as const,
        header: "Sales pipeline discussions",
        purpose: "Tracking and discussing active deals",
        create_at: Date.now() - 10 * 24 * 60 * 60 * 1000,
        update_at: Date.now() - 10 * 24 * 60 * 60 * 1000,
        delete_at: 0,
      },
    ],
    team6: [
      {
        id: "channel12",
        team_id: "team6",
        name: "general",
        display_name: "General",
        type: "O" as const,
        header: "Executive team general channel",
        purpose: "General executive discussions",
        create_at: Date.now() - 15 * 24 * 60 * 60 * 1000,
        update_at: Date.now() - 15 * 24 * 60 * 60 * 1000,
        delete_at: 0,
      },
      {
        id: "channel13",
        team_id: "team6",
        name: "strategy",
        display_name: "Strategic Planning",
        type: "P" as const,
        header: "Confidential strategic discussions",
        purpose: "Planning the company's strategic direction",
        create_at: Date.now() - 7 * 24 * 60 * 60 * 1000,
        update_at: Date.now() - 7 * 24 * 60 * 60 * 1000,
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
      update_at: Date.now(),
    },
    {
      id: "user2",
      username: "janedoe",
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@example.com",
      roles: "system_user",
      update_at: Date.now(),
    },
    {
      id: "user3",
      username: "bobsmith",
      first_name: "Bob",
      last_name: "Smith",
      email: "bob@example.com",
      roles: "system_user",
      update_at: Date.now(),
    },
    {
      id: "user4",
      username: "sarahparker",
      first_name: "Sarah",
      last_name: "Parker",
      email: "sarah@example.com",
      roles: "system_user",
      update_at: Date.now(),
    },
    {
      id: "user5",
      username: "mikejones",
      first_name: "Mike",
      last_name: "Jones",
      email: "mike@example.com",
      roles: "system_user",
      update_at: Date.now(),
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
    channel6: [
      {
        id: "post9",
        user_id: "user1",
        channel_id: "channel6",
        message: "Welcome to the Product Team channel!",
        create_at: Date.now() - 259200000, // 3 days ago
        update_at: Date.now() - 259200000,
        delete_at: 0,
      },
    ],
    channel7: [
      {
        id: "post10",
        user_id: "user3",
        channel_id: "channel7",
        message: "Here's the latest roadmap draft for Q3.",
        create_at: Date.now() - 345600000, // 4 days ago
        update_at: Date.now() - 345600000,
        delete_at: 0,
      },
    ],
    channel8: [
      {
        id: "post11",
        user_id: "user2",
        channel_id: "channel8",
        message:
          "New support procedures are now in effect. Please review the documentation.",
        create_at: Date.now() - 432000000, // 5 days ago
        update_at: Date.now() - 432000000,
        delete_at: 0,
      },
    ],
    channel9: [],
    channel10: [
      {
        id: "post12",
        user_id: "user1",
        channel_id: "channel10",
        message:
          "Congratulations to the team for hitting 120% of our quarterly target!",
        create_at: Date.now() - 518400000, // 6 days ago
        update_at: Date.now() - 518400000,
        delete_at: 0,
      },
    ],
    channel11: [],
    channel12: [
      {
        id: "post13",
        user_id: "user1",
        channel_id: "channel12",
        message:
          "Please prepare your quarterly reports by the end of next week.",
        create_at: Date.now() - 604800000, // 7 days ago
        update_at: Date.now() - 604800000,
        delete_at: 0,
      },
    ],
    channel13: [
      {
        id: "post14",
        user_id: "user1",
        channel_id: "channel13",
        message:
          "Our next strategic planning session will be on Monday at 10 AM.",
        create_at: Date.now() - 691200000, // 8 days ago
        update_at: Date.now() - 691200000,
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
  // Cache pour l'utilisateur courant
  let _currentUser: User | null = { ...mockData.currentUser };

  // Pour le mode "custom", on définit explicitement ce mode
  const mode: "direct" | "proxy" | "custom" = "custom";

  return {
    // Mode de service (important pour le traitement interne)
    mode,

    // User information
    getCurrentUser: async (): Promise<User> => {
      await delay(SIMULATED_DELAY);
      return { ..._currentUser! };
    },

    // Cette méthode est importante pour l'exemple de caching
    refreshCurrentUser: async (): Promise<User> => {
      await delay(SIMULATED_DELAY);
      // Simuler un rafraîchissement en mettant à jour le timestamp
      _currentUser = {
        ..._currentUser!,
        update_at: Date.now(),
      };
      return { ..._currentUser };
    },

    // Pour le support du caching
    getBaseUrl: (): string => {
      return "https://mock.mattermost.com";
    },

    // Teams management
    getTeams: async (): Promise<Team[]> => {
      console.log("Mock getTeams appelé - retournant", teams.length, "équipes");
      await delay(SIMULATED_DELAY);

      // S'assurer que teams est bien défini et non vide
      if (!teams || teams.length === 0) {
        // Si teams est vide pour une raison quelconque, retournons des données par défaut
        console.warn(
          "Données d'équipes vides, utilisation des données par défaut",
        );
        return [...mockData.teams];
      }

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

    // Support de la fonctionnalité de comptage des non-lus
    getChannelUnreadCount: async (
      channelId: string,
    ): Promise<{ msg_count: number; mention_count: number }> => {
      await delay(SIMULATED_DELAY);
      return {
        msg_count: Math.floor(Math.random() * 10),
        mention_count: Math.floor(Math.random() * 3),
      };
    },

    // Support de marquer comme vu
    viewChannel: async (channelId: string): Promise<{ status: "OK" }> => {
      await delay(SIMULATED_DELAY);
      return { status: "OK" };
    },

    // Support des non-lus par équipe
    getTeamUnreadCount: async (
      teamId: string,
    ): Promise<{ msg_count: number; mention_count: number }> => {
      await delay(SIMULATED_DELAY);
      return {
        msg_count: Math.floor(Math.random() * 15),
        mention_count: Math.floor(Math.random() * 5),
      };
    },

    editMessage: async (messageId: string, newMessage: string) => {
      // Simuler la modification d'un message
      console.log(
        `Mock: Message ${messageId} modifié avec le texte:`,
        newMessage,
      );

      await delay(SIMULATED_DELAY);

      // Trouver le message dans les données
      let foundMessage: Message | null = null;
      let foundChannelId: string | null = null;

      // Rechercher dans tous les canaux
      Object.entries(messages).forEach(([channelId, msgs]) => {
        const msg = msgs.find((m) => m.id === messageId);
        if (msg) {
          foundMessage = msg;
          foundChannelId = channelId;
        }
      });

      if (!foundMessage || !foundChannelId) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Mettre à jour le message
      foundMessage.message = newMessage;
      foundMessage.update_at = Date.now();

      return {
        ...foundMessage,
      };
    },

    deleteMessage: async (messageId: string) => {
      await delay(SIMULATED_DELAY);

      // Simuler la suppression d'un message
      console.log(`Mock: Message ${messageId} supprimé`);

      // Parcourir tous les canaux pour trouver et "supprimer" le message
      let deleted = false;
      Object.keys(messages).forEach((channelId) => {
        const index = messages[channelId].findIndex(
          (msg) => msg.id === messageId,
        );
        if (index !== -1) {
          // Dans un système réel, on marquerait simplement delete_at
          // Ici, on le supprime complètement pour simuler
          messages[channelId].splice(index, 1);
          deleted = true;
        }
      });

      return { success: deleted };
    },

    replyToMessage: async (
      channelId: string,
      messageId: string,
      responseMessage: string,
      fileIds?: string[],
    ) => {
      await delay(SIMULATED_DELAY);

      // Vérifier si le canal existe
      if (!messages[channelId]) {
        messages[channelId] = [];
      }

      // Générer un nouvel ID pour la réponse
      const newId = `post-reply-${nextPostId++}`;

      // Créer le message de réponse
      const replyMessage: Message = {
        id: newId,
        user_id: _currentUser!.id,
        channel_id: channelId,
        message: responseMessage,
        create_at: Date.now(),
        update_at: Date.now(),
        delete_at: 0,
        root_id: messageId,
        props: {
          quoted_message_id: messageId,
        },
        file_ids: fileIds || [],
      };

      // Ajouter la réponse aux messages du canal
      messages[channelId].push(replyMessage);

      return replyMessage;
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
      fileIds?: string[],
    ): Promise<Message> => {
      await delay(SIMULATED_DELAY);

      // Create a new message ID
      const postId = `post${nextPostId++}`;

      // Create the message
      const newMessage: Message = {
        id: postId,
        user_id: _currentUser!.id,
        channel_id: channelId,
        message,
        create_at: Date.now(),
        update_at: Date.now(),
        delete_at: 0,
        file_ids: fileIds || [],
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

    // Emoji et réactions
    getFrequentEmojis: async (): Promise<string[]> => {
      await delay(SIMULATED_DELAY);
      return ["👍", "❤️", "😂", "🎉", "🔥", "👏", "✅", "🙏"];
    },

    addReaction: async (messageId: string, emoji: string): Promise<any> => {
      await delay(SIMULATED_DELAY);
      console.log(`Mock: Réaction ${emoji} ajoutée au message ${messageId}`);
      return { success: true };
    },

    removeReaction: async (
      channelId: string,
      messageId: string,
      emoji: string,
    ): Promise<any> => {
      await delay(SIMULATED_DELAY);
      console.log(`Mock: Réaction ${emoji} supprimée du message ${messageId}`);
      return { success: true };
    },

    hasReacted: async (
      channelId: string,
      messageId: string,
      emoji: string,
    ): Promise<boolean> => {
      await delay(SIMULATED_DELAY);
      // Retourne aléatoirement vrai ou faux pour simuler
      return Math.random() > 0.5;
    },

    // GIFs
    searchGifs: async (query: string): Promise<any[]> => {
      await delay(SIMULATED_DELAY);
      return Array(5)
        .fill(null)
        .map((_, i) => ({
          id: `gif-${query}-${i}`,
          preview: `https://via.placeholder.com/150?text=GIF+${query}+${i}`,
          title: `GIF ${query} ${i}`,
          url: `https://via.placeholder.com/300?text=GIF+${query}+${i}`,
        }));
    },

    getGifs: async (category: string): Promise<any[]> => {
      await delay(SIMULATED_DELAY);
      return Array(5)
        .fill(null)
        .map((_, i) => ({
          id: `gif-${category}-${i}`,
          preview: `https://via.placeholder.com/150?text=GIF+${category}+${i}`,
          title: `GIF ${category} ${i}`,
          url: `https://via.placeholder.com/300?text=GIF+${category}+${i}`,
        }));
    },

    // Méthode pour la récupération de posts spécifiques
    getPost: async (messageId: string): Promise<Message> => {
      await delay(SIMULATED_DELAY);

      let foundMessage: Message | null = null;

      // Rechercher dans tous les canaux
      Object.values(messages).forEach((channelMessages) => {
        const message = channelMessages.find((m) => m.id === messageId);
        if (message) {
          foundMessage = { ...message };
        }
      });

      if (!foundMessage) {
        throw new Error(`Message with ID ${messageId} not found`);
      }

      return foundMessage;
    },

    // Support pour l'authentification (mode direct)
    authenticate: async (
      username: string,
      password: string,
    ): Promise<{ token: string; serverUrl?: string }> => {
      await delay(SIMULATED_DELAY);

      // Simuler une connexion réussie si le nom d'utilisateur commence par "user" ou est "admin"
      if (username.startsWith("user") || username === "admin") {
        return {
          token: `mock-token-${Date.now()}`,
          serverUrl: "https://mock.mattermost.com",
        };
      }

      throw new Error("Invalid username or password");
    },

    validateToken: async (token: string): Promise<boolean> => {
      await delay(SIMULATED_DELAY);
      // Simuler une validation de token réussie si le token commence par "mock-token"
      return token.startsWith("mock-token");
    },
  };
};

export default createMockService;
