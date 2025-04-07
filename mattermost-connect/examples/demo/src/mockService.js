// Service de démonstration qui utilise les données fictives
import {
  mockTeams,
  mockChannels,
  mockUsers,
  mockMessages,
  currentUser,
} from "./mockData";

// Délai simulé pour les opérations (en ms)
const SIMULATED_DELAY = 300;

// Fonction pour simuler un délai réseau
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Service simulé pour la démonstration
export const createMockService = () => {
  // State local pour pouvoir modifier les données pendant l'utilisation
  let teams = [...mockTeams];
  let channels = JSON.parse(JSON.stringify(mockChannels));
  let users = [...mockUsers];
  let messages = JSON.parse(JSON.stringify(mockMessages));
  let nextPostId = 100;

  return {
    // Méthode pour obtenir l'utilisateur courant
    getCurrentUser: async () => {
      await delay(SIMULATED_DELAY);
      return { ...currentUser };
    },

    // Méthode pour obtenir les équipes
    getTeams: async () => {
      await delay(SIMULATED_DELAY);
      return [...teams];
    },

    // Méthode pour obtenir une équipe par ID
    getTeam: async (teamId) => {
      await delay(SIMULATED_DELAY);
      const team = teams.find((t) => t.id === teamId);
      if (!team) throw new Error(`Équipe non trouvée: ${teamId}`);
      return { ...team };
    },

    // Méthode pour obtenir les canaux d'une équipe
    getChannels: async (teamId) => {
      await delay(SIMULATED_DELAY);
      const teamChannels = channels[teamId] || [];
      return [...teamChannels];
    },

    // Méthode pour obtenir un canal par ID
    getChannel: async (channelId) => {
      await delay(SIMULATED_DELAY);
      let foundChannel = null;

      // Rechercher le canal dans toutes les équipes
      Object.values(channels).forEach((teamChannels) => {
        const channel = teamChannels.find((c) => c.id === channelId);
        if (channel) foundChannel = channel;
      });

      if (!foundChannel) throw new Error(`Canal non trouvé: ${channelId}`);
      return { ...foundChannel };
    },

    // Méthode pour obtenir les messages d'un canal
    getChannelMessages: async (
      channelId,
      { page = 0, perPage = 60, since = 0 } = {},
    ) => {
      await delay(SIMULATED_DELAY);

      // Obtenir les messages du canal ou un tableau vide si aucun
      const channelMessages = messages[channelId] || [];

      // Trier les messages par date (plus récent en dernier)
      const sortedMessages = [...channelMessages].sort(
        (a, b) => a.create_at - b.create_at,
      );

      // Pagination simplifiée
      const start = page * perPage;
      const end = start + perPage;
      const pagedMessages = sortedMessages.slice(start, end);

      // Convertir le tableau en objet avec ID comme clé (format Mattermost)
      const postsObject = {};
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

    // Méthode pour envoyer un message
    postMessage: async (channelId, message) => {
      await delay(SIMULATED_DELAY);

      // Créer un nouvel identifiant
      const postId = `post${nextPostId++}`;

      // Créer le message
      const newMessage = {
        id: postId,
        user_id: currentUser.id,
        channel_id: channelId,
        message,
        create_at: Date.now(),
        update_at: Date.now(),
      };

      // Ajouter à la liste des messages du canal
      if (!messages[channelId]) {
        messages[channelId] = [];
      }

      messages[channelId].push(newMessage);

      return { ...newMessage };
    },

    // Méthode pour obtenir des utilisateurs
    getUsers: async ({ ids }) => {
      await delay(SIMULATED_DELAY);

      if (ids && ids.length > 0) {
        return users.filter((user) => ids.includes(user.id));
      }

      return [...users];
    },

    // Méthode pour obtenir le statut d'un utilisateur
    getUserStatus: async (userId) => {
      await delay(SIMULATED_DELAY);
      return { user_id: userId, status: "online" };
    },

    // Simulation de l'upload de fichiers
    uploadFiles: async (formData) => {
      await delay(SIMULATED_DELAY * 2); // Plus long pour simuler un upload
      return {
        file_infos: [{ id: `file${Date.now()}`, name: "Fichier téléchargé" }],
      };
    },

    // URL WebSocket simulée (ne sera pas réellement connectée)
    getWebsocketUrl: () => "ws://mock-websocket-url",

    // Token WebSocket simulé
    getWebsocketToken: async () => {
      await delay(SIMULATED_DELAY);
      return "mock-websocket-token";
    },
  };
};

export default createMockService;
