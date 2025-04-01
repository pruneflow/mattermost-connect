// src/services/statistics/statistics.class.js
const errors = require("@feathersjs/errors");
const logger = require("../../logger");

exports.Statistics = class Statistics {
  constructor(options) {
    this.options = options || {};
    this.app = options.app;
  }

  // Méthode pour récupérer les statistiques d'un utilisateur
  async find(params) {
    // Vérifier si l'utilisateur est authentifié
    if (!params.user) {
      throw new errors.NotAuthenticated("Authentification requise");
    }

    try {
      // Récupérer les espaces de l'utilisateur
      const spacesService = this.app.service("/api/mattermost-spaces");
      const spaces = await spacesService.find({
        query: {
          userId: params.user.id,
        },
        paginate: false,
      });

      // Si aucun espace n'est trouvé, retourner des statistiques vides
      if (!spaces || spaces.length === 0) {
        return {
          totalSpaces: 0,
          activeSpaces: 0,
          inactiveSpaces: 0,
          oldestSpace: null,
          newestSpace: null,
          withToken: 0,
          withoutToken: 0,
        };
      }

      // Calculer les statistiques
      const stats = {
        totalSpaces: spaces.length,
        activeSpaces: spaces.filter((space) => space.isActive).length,
        inactiveSpaces: spaces.filter((space) => !space.isActive).length,
        oldestSpace: spaces.reduce((oldest, current) => {
          return !oldest ||
            new Date(current.createdAt) < new Date(oldest.createdAt)
            ? current
            : oldest;
        }, null),
        newestSpace: spaces.reduce((newest, current) => {
          return !newest ||
            new Date(current.createdAt) > new Date(newest.createdAt)
            ? current
            : newest;
        }, null),
        withToken: spaces.filter((space) => space.apiToken).length,
        withoutToken: spaces.filter((space) => !space.apiToken).length,
      };

      // Pour l'admin, ajouter des statistiques globales
      if (params.user.isAdmin) {
        // Récupérer les utilisateurs
        const userService = this.app.service("/api/users");
        const usersCount = await userService.find({
          query: {
            $limit: 0,
          },
        });

        // Récupérer tous les espaces
        const allSpaces = await spacesService.find({
          query: {
            $limit: 0,
          },
        });

        // Ajouter les statistiques d'administration
        stats.adminStats = {
          totalUsers: usersCount.total,
          totalSpacesGlobal: allSpaces.total,
          averageSpacesPerUser: allSpaces.total / (usersCount.total || 1),
        };
      }

      return stats;
    } catch (error) {
      logger.error("Erreur lors de la récupération des statistiques", error);
      throw error;
    }
  }

  // Méthode pour obtenir les statistiques d'utilisation d'un espace spécifique
  async get(id, params) {
    // Vérifier si l'utilisateur est authentifié
    if (!params.user) {
      throw new errors.NotAuthenticated("Authentification requise");
    }

    try {
      // Récupérer l'espace
      const spacesService = this.app.service("/api/mattermost-spaces");
      const space = await spacesService.get(id);

      // Vérifier que l'utilisateur a le droit d'accéder à cet espace
      if (space.userId !== params.user.id && !params.user.isAdmin) {
        throw new errors.Forbidden(
          "Vous n'êtes pas autorisé à accéder aux statistiques de cet espace",
        );
      }

      // Récupérer les statistiques depuis l'API Mattermost
      const mattermostIntegration = this.app.get("mattermostIntegration");
      if (!mattermostIntegration) {
        throw new errors.GeneralError(
          "Service d'intégration Mattermost non disponible",
        );
      }

      // Simuler des statistiques (à remplacer par la vraie implémentation)
      const stats = {
        spaceId: id,
        spaceName: space.name,
        usersCount: Math.floor(Math.random() * 50) + 5,
        channelsCount: Math.floor(Math.random() * 10) + 2,
        messagesCount: Math.floor(Math.random() * 1000) + 100,
        activeUsers: Math.floor(Math.random() * 20) + 3,
        lastActivity: new Date(
          Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
        ).toISOString(),
      };

      return stats;
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération des statistiques pour l'espace ${id}`,
        error,
      );
      throw error;
    }
  }
};
