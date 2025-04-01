// src/api/statistics.js
import api from "./api";

export const statisticsService = {
  // Récupérer les statistiques globales de l'utilisateur
  getUserStatistics: async () => {
    try {
      const response = await api.get("/statistics");
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw error;
    }
  },

  // Récupérer les statistiques détaillées d'un espace
  getSpaceStatistics: async (spaceId) => {
    try {
      const response = await api.get(`/statistics/${spaceId}`);
      return response.data;
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des statistiques de l'espace ${spaceId}:`,
        error,
      );
      throw error;
    }
  },
};
