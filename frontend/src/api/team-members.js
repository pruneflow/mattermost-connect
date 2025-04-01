// src/api/team-members.js (mise à jour)
import api from "./api";

export const teamMembersService = {
  // Récupérer tous les membres d'une équipe
  getMembers: async (spaceId) => {
    if (!spaceId) {
      const error = new Error("L'identifiant d'espace est requis");
      console.error("Erreur lors de la récupération des membres:", error);
      throw error;
    }
    try {
      const response = await api.get("/team-members", {
        params: { spaceId },
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des membres:", error);
      throw error;
    }
  },

  // Inviter un nouveau membre
  inviteMember: async (spaceId, email) => {
    try {
      const response = await api.post("/team-members", {
        spaceId,
        email,
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'invitation d'un membre:", error);
      throw error;
    }
  },

  // Nouvelle méthode: Inviter plusieurs membres à la fois
  inviteMembers: async (spaceId, emails) => {
    try {
      const response = await api.post("/team-members-bulk", {
        spaceId,
        emails,
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'invitation groupée:", error);
      throw error;
    }
  },

  // Mettre à jour le rôle d'un membre
  updateMemberRole: async (spaceId, userId, isAdmin) => {
    try {
      const response = await api.patch(`/team-members/${userId}`, {
        spaceId,
        isAdmin,
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du rôle:", error);
      throw error;
    }
  },

  // Supprimer un membre
  removeMember: async (spaceId, userId) => {
    try {
      const response = await api.delete(`/team-members/${userId}`, {
        params: { spaceId },
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la suppression du membre:", error);
      throw error;
    }
  },
};
