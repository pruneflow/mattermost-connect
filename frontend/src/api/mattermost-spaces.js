import api from "./api";

export const mattermostSpacesService = {
  // Récupérer tous les espaces de l'utilisateur
  getAll: async () => {
    try {
      const response = await api.get("/mattermost-spaces");
      return response.data.data || [];
    } catch (error) {
      console.error("Erreur lors de la récupération des espaces:", error);
      throw error;
    }
  },

  // Récupérer un espace spécifique
  get: async (id) => {
    try {
      const response = await api.get(`/mattermost-spaces/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'espace ${id}:`, error);
      throw error;
    }
  },

  // Créer un nouvel espace
  create: async (spaceData) => {
    try {
      const response = await api.post("/mattermost-spaces", spaceData);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la création de l'espace:", error);
      throw error;
    }
  },

  // Mettre à jour un espace
  update: async (id, spaceData) => {
    try {
      const response = await api.patch(`/mattermost-spaces/${id}`, spaceData);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'espace ${id}:`, error);
      throw error;
    }
  },

  // Supprimer un espace
  delete: async (id) => {
    try {
      const response = await api.delete(`/mattermost-spaces/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'espace ${id}:`, error);
      throw error;
    }
  },

  // Générer un nouveau token pour un espace
  generateToken: async (spaceId) => {
    try {
      const response = await api.post("/tokens", { spaceId });
      return response.data;
    } catch (error) {
      console.error(
        `Erreur lors de la génération du token pour l'espace ${spaceId}:`,
        error,
      );
      throw error;
    }
  },
};
