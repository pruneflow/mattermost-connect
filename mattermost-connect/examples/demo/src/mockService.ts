// mockService.ts - Service mock pour démontrer l'utilisation des composants sans serveur réel

// Création d'identifiants uniques
const generateId = () => Math.random().toString(36).substring(2, 15);

// Types de base
interface User {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  roles?: string;
  update_at: number;
}

interface Team {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  type?: "O" | "I";
  create_at: number;
  update_at: number;
  delete_at: number;
}

interface Channel {
  id: string;
  team_id: string;
  name: string;
  display_name: string;
  type: "O" | "P" | "D" | "G";
  header?: string;
  purpose?: string;
  create_at: number;
  update_at: number;
  delete_at: number;
}

interface Message {
  id: string;
  user_id: string;
  channel_id: string;
  message: string;
  create_at: number;
  update_at: number;
  delete_at?: number;
  root_id?: string;
  file_ids?: string[];
  has_reactions?: boolean;
}

// Créer le service mock qui simule les données et les opérations de Mattermost
const createMockService = () => {
  // Données simulées
  const data = {
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
        username: "janesmith",
        first_name: "Jane",
        last_name: "Smith",
        email: "jane@example.com",
        roles: "system_user",
        update_at: Date.now(),
      },
      {
        id: "user3",
        username: "mikebrown",
        first_name: "Mike",
        last_name: "Brown",
        email: "mike@example.com",
        roles: "system_user",
        update_at: Date.now(),
      },
    ] as User[],

    teams: [
      {
        id: "team1",
        name: "engineering",
        display_name: "Engineering",
        description: "Team for engineering discussions",
        type: "O",
        create_at: Date.now() - 1000000,
        update_at: Date.now(),
        delete_at: 0,
      },
      {
        id: "team2",
        name: "marketing",
        display_name: "Marketing",
        description: "Team for marketing discussions",
        type: "O",
        create_at: Date.now() - 900000,
        update_at: Date.now(),
        delete_at: 0,
      },
    ] as Team[],

    channels: [
      {
        id: "channel1",
        team_id: "team1",
        name: "general",
        display_name: "General",
        type: "O",
        header: "Welcome to the Engineering Team!",
        purpose: "General discussions for the engineering team",
        create_at: Date.now() - 900000,
        update_at: Date.now(),
        delete_at: 0,
      },
      {
        id: "channel2",
        team_id: "team1",
        name: "random",
        display_name: "Random",
        type: "O",
        header: "Random discussions",
        purpose: "Share interesting things",
        create_at: Date.now() - 800000,
        update_at: Date.now(),
        delete_at: 0,
      },
      {
        id: "channel3",
        team_id: "team1",
        name: "development",
        display_name: "Development",
        type: "P",
        header: "Development discussions",
        purpose: "Technical discussions",
        create_at: Date.now() - 700000,
        update_at: Date.now(),
        delete_at: 0,
      },
      {
        id: "channel4",
        team_id: "team2",
        name: "general",
        display_name: "General",
        type: "O",
        header: "Welcome to the Marketing Team!",
        purpose: "General discussions for the marketing team",
        create_at: Date.now() - 600000,
        update_at: Date.now(),
        delete_at: 0,
      },
      {
        id: "dm1",
        team_id: "team1",
        name: "user1__user2",
        display_name: "Jane Smith",
        type: "D",
        create_at: Date.now() - 500000,
        update_at: Date.now(),
        delete_at: 0,
      },
    ] as Channel[],

    messages: [
      {
        id: "msg1",
        user_id: "user2",
        channel_id: "channel1",
        message: "Welcome to the Engineering team!",
        create_at: Date.now() - 800000,
        update_at: Date.now() - 800000,
      },
      {
        id: "msg2",
        user_id: "user1",
        channel_id: "channel1",
        message: "Thanks! Excited to be here.",
        create_at: Date.now() - 790000,
        update_at: Date.now() - 790000,
      },
      {
        id: "msg3",
        user_id: "user3",
        channel_id: "channel1",
        message: "Let's start planning our next sprint!",
        create_at: Date.now() - 780000,
        update_at: Date.now() - 780000,
      },
      {
        id: "msg4",
        user_id: "user1",
        channel_id: "channel2",
        message:
          "Check out this interesting article: https://example.com/tech-news",
        create_at: Date.now() - 770000,
        update_at: Date.now() - 770000,
      },
      {
        id: "msg5",
        user_id: "user2",
        channel_id: "channel2",
        message: "Thanks for sharing!",
        create_at: Date.now() - 760000,
        update_at: Date.now() - 760000,
      },
      {
        id: "msg6",
        user_id: "user1",
        channel_id: "dm1",
        message: "Hi Jane, do you have a minute to discuss the project?",
        create_at: Date.now() - 750000,
        update_at: Date.now() - 750000,
      },
      {
        id: "msg7",
        user_id: "user2",
        channel_id: "dm1",
        message: "Sure, I'm available now. What's on your mind?",
        create_at: Date.now() - 740000,
        update_at: Date.now() - 740000,
      },
    ] as Message[],
  };

  // Simuler les fonctions de l'API Mattermost
  return {
    // Utilisateurs
    getCurrentUser: async () => {
      return data.users[0];
    },
    getUser: async (userId: string) => {
      return data.users.find((user) => user.id === userId) || null;
    },
    getUsers: async () => {
      return data.users;
    },
    getUserStatus: async (userId: string) => {
      // Simuler des statuts en ligne aléatoires
      const statuses = ["online", "away", "dnd", "offline"];
      return {
        user_id: userId,
        status: statuses[Math.floor(Math.random() * statuses.length)],
      };
    },

    // Équipes
    getTeams: async () => {
      return data.teams;
    },
    getTeam: async (teamId: string) => {
      return data.teams.find((team) => team.id === teamId) || null;
    },

    // Canaux
    getChannels: async (teamId: string) => {
      return data.channels.filter((channel) => channel.team_id === teamId);
    },
    getChannel: async (channelId: string) => {
      return data.channels.find((channel) => channel.id === channelId) || null;
    },

    // Messages
    getMessages: async (channelId: string) => {
      return data.messages.filter((msg) => msg.channel_id === channelId);
    },
    getThreadMessages: async (rootId: string) => {
      return data.messages.filter((msg) => msg.root_id === rootId);
    },
    sendMessage: async (
      channelId: string,
      message: string,
      rootId?: string,
    ) => {
      const newMessage = {
        id: generateId(),
        user_id: "user1", // Current user
        channel_id: channelId,
        message: message,
        create_at: Date.now(),
        update_at: Date.now(),
        root_id: rootId,
      };
      data.messages.push(newMessage);
      return newMessage;
    },
    editMessage: async (messageId: string, message: string) => {
      const index = data.messages.findIndex((msg) => msg.id === messageId);
      if (index !== -1) {
        data.messages[index].message = message;
        data.messages[index].update_at = Date.now();
        return data.messages[index];
      }
      throw new Error("Message not found");
    },
    deleteMessage: async (messageId: string) => {
      const index = data.messages.findIndex((msg) => msg.id === messageId);
      if (index !== -1) {
        data.messages.splice(index, 1);
        return true;
      }
      return false;
    },

    // Simulation WebSocket
    connectWebSocket: async () => {
      console.log("WebSocket connected (mock)");
      return true;
    },
    disconnectWebSocket: () => {
      console.log("WebSocket disconnected (mock)");
    },
    addMessageHandler: (handler: (msg: any) => void) => {
      // Simuler l'arrivée occasionnelle de nouveaux messages
      const interval = setInterval(() => {
        if (Math.random() > 0.9) {
          const channelId =
            data.channels[Math.floor(Math.random() * data.channels.length)].id;
          const userId =
            data.users[Math.floor(Math.random() * data.users.length)].id;
          const newMessage = {
            id: generateId(),
            user_id: userId,
            channel_id: channelId,
            message: `Random message from mock service at ${new Date().toLocaleTimeString()}`,
            create_at: Date.now(),
            update_at: Date.now(),
          };
          data.messages.push(newMessage);
          handler({
            event: "posted",
            data: {
              post: newMessage,
            },
          });
        }
      }, 30000); // Toutes les 30 secondes

      // Fonction de nettoyage
      return () => clearInterval(interval);
    },
  };
};

export default createMockService;
