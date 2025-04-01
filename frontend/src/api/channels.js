// src/api/channels.js
import api from "./api";

export const channelsService = {
  // Récupérer tous les canaux d'un espace
  getChannels: async (spaceId) => {
    try {
      const response = await api.get("/channels", {
        params: { spaceId },
      });
      return response.data;
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des canaux pour l'espace ${spaceId}:`,
        error,
      );
      throw error;
    }
  },

  // Créer un nouveau canal
  createChannel: async (channelData) => {
    try {
      const response = await api.post("/channels", channelData);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la création du canal:", error);
      throw error;
    }
  },

  // Mettre à jour un canal
  updateChannel: async (channelId, channelData) => {
    try {
      const response = await api.patch(`/channels/${channelId}`, channelData);
      return response.data;
    } catch (error) {
      console.error(
        `Erreur lors de la mise à jour du canal ${channelId}:`,
        error,
      );
      throw error;
    }
  },

  // Archiver un canal
  archiveChannel: async (channelId, spaceId) => {
    try {
      const response = await api.delete(`/channels/${channelId}`, {
        params: { spaceId },
      });
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de l'archivage du canal ${channelId}:`, error);
      throw error;
    }
  },
};
