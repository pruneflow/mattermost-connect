// src/api/user.js
import api from "./api";

export const userService = {
  // Récupérer le profil de l'utilisateur actuel
  getCurrentUser: async () => {
    try {
      const response = await api.get("/users/current");
      return response.data;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération du profil utilisateur:",
        error,
      );
      throw error;
    }
  },

  // Mettre à jour le profil utilisateur
  updateProfile: async (userData) => {
    try {
      // On vérifie d'abord l'ID de l'utilisateur actuel
      const currentUser = await userService.getCurrentUser();

      // Mise à jour du profil
      const response = await api.patch(`/users/${currentUser.id}`, userData);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      throw error;
    }
  },

  // Changer le mot de passe
  changePassword: async ({ currentPassword, newPassword }) => {
    try {
      // Récupérer l'utilisateur actuel
      const currentUser = await userService.getCurrentUser();
      // Envoyer la demande de changement de mot de passe
      const response = await api.patch(`/users/${currentUser.id}`, {
        password: newPassword,
        oldPassword: currentPassword, // Ce champ sera vérifié côté serveur
      });

      return response.data;
    } catch (error) {
      // Gestion spécifique de l'erreur de mot de passe incorrect
      if (error.response && error.response.status === 400) {
        throw new Error("Mot de passe actuel incorrect");
      }
      console.error("Erreur lors du changement de mot de passe:", error);
      throw error;
    }
  },

  // Obtenir un utilisateur par son ID (utilisé par les admins)
  getUserById: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error(
        `Erreur lors de la récupération de l'utilisateur ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Récupérer tous les utilisateurs (admin seulement)
  getAllUsers: async () => {
    try {
      const response = await api.get("/users");
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
      throw error;
    }
  },
};
