// src/utils/api.js

/**
 * Utilitaires pour faciliter l'utilisation de l'API Mattermost
 */
export const MattermostAPI = {
  /**
   * Créer un token utilisateur à partir des identifiants
   * @param {Object} params - Paramètres d'authentification
   * @param {string} params.serverUrl - URL du serveur Mattermost
   * @param {string} params.username - Nom d'utilisateur ou email
   * @param {string} params.password - Mot de passe
   * @returns {Promise<string>} Token d'accès personnel
   */
  createUserToken: async ({ serverUrl, username, password }) => {
    // Normaliser l'URL du serveur
    const baseUrl = serverUrl.endsWith("/")
      ? serverUrl.slice(0, -1)
      : serverUrl;

    try {
      // Étape 1: Se connecter et obtenir le token de session
      const loginResponse = await fetch(`${baseUrl}/api/v4/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login_id: username,
          password,
        }),
      });

      if (!loginResponse.ok) {
        const error = await loginResponse.json().catch(() => ({}));
        throw new Error(
          error.message ||
            `Échec de l'authentification: ${loginResponse.status}`,
        );
      }

      // Récupérer l'ID de l'utilisateur
      const user = await loginResponse.json();
      const userId = user.id;

      // Récupérer le token de session depuis les en-têtes
      const sessionToken = loginResponse.headers.get("Token");

      // Étape 2: Créer un token d'accès personnel (PAT)
      const tokenResponse = await fetch(
        `${baseUrl}/api/v4/users/${userId}/tokens`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: "MattermostConnect Integration",
          }),
        },
      );

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json().catch(() => ({}));
        throw new Error(
          error.message ||
            `Échec de la création du token: ${tokenResponse.status}`,
        );
      }

      // Retourner le token
      const tokenData = await tokenResponse.json();
      return tokenData.token;
    } catch (error) {
      console.error("Erreur lors de la création du token utilisateur:", error);
      throw error;
    }
  },

  /**
   * Vérifier la validité d'un token API
   * @param {Object} params - Paramètres de vérification
   * @param {string} params.serverUrl - URL du serveur Mattermost
   * @param {string} params.token - Token à vérifier
   * @returns {Promise<boolean>} True si le token est valide
   */
  validateToken: async ({ serverUrl, token }) => {
    // Normaliser l'URL du serveur
    const baseUrl = serverUrl.endsWith("/")
      ? serverUrl.slice(0, -1)
      : serverUrl;

    try {
      // Tenter de récupérer les informations de l'utilisateur avec ce token
      const response = await fetch(`${baseUrl}/api/v4/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Erreur lors de la validation du token:", error);
      return false;
    }
  },

  /**
   * Récupère les équipes auxquelles l'utilisateur a accès
   * @param {Object} params - Paramètres
   * @param {string} params.serverUrl - URL du serveur Mattermost
   * @param {string} params.token - Token d'authentification
   * @returns {Promise<Array>} Liste des équipes
   */
  getUserTeams: async ({ serverUrl, token }) => {
    // Normaliser l'URL du serveur
    const baseUrl = serverUrl.endsWith("/")
      ? serverUrl.slice(0, -1)
      : serverUrl;

    try {
      const response = await fetch(`${baseUrl}/api/v4/users/me/teams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message ||
            `Échec de la récupération des équipes: ${response.status}`,
        );
      }

      return response.json();
    } catch (error) {
      console.error("Erreur lors de la récupération des équipes:", error);
      throw error;
    }
  },

  /**
   * Récupère les canaux d'une équipe accessibles par l'utilisateur
   * @param {Object} params - Paramètres
   * @param {string} params.serverUrl - URL du serveur Mattermost
   * @param {string} params.token - Token d'authentification
   * @param {string} params.teamId - ID de l'équipe
   * @returns {Promise<Array>} Liste des canaux
   */
  getTeamChannels: async ({ serverUrl, token, teamId }) => {
    // Normaliser l'URL du serveur
    const baseUrl = serverUrl.endsWith("/")
      ? serverUrl.slice(0, -1)
      : serverUrl;

    try {
      const response = await fetch(
        `${baseUrl}/api/v4/users/me/teams/${teamId}/channels`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message ||
            `Échec de la récupération des canaux: ${response.status}`,
        );
      }

      return response.json();
    } catch (error) {
      console.error("Erreur lors de la récupération des canaux:", error);
      throw error;
    }
  },
};

export default MattermostAPI;
