// src/services/tokens/tokens.class.js
const errors = require("@feathersjs/errors");
const logger = require("../../logger");

exports.Tokens = class Tokens {
  constructor(options) {
    this.options = options || {};
    this.app = options.app;
  }

  // Implémentation de la méthode create pour générer un nouveau token
  async create(data, params) {
    // Vérifier si l'utilisateur est authentifié
    if (!params.user) {
      throw new errors.NotAuthenticated("Authentification requise");
    }

    const { spaceId } = data;

    if (!spaceId) {
      throw new errors.BadRequest("ID d'espace requis");
    }

    try {
      // Récupérer l'espace Mattermost
      const spacesService = this.app.service("/api/mattermost-spaces");
      const space = await spacesService.get(spaceId);

      // Vérifier que l'utilisateur est propriétaire de l'espace
      if (space.userId !== params.user.id && !params.user.isAdmin) {
        throw new errors.Forbidden(
          "Vous n'êtes pas autorisé à gérer cet espace",
        );
      }

      // Récupérer le service d'intégration Mattermost
      const mattermostIntegration = this.app.get("mattermostIntegration");
      if (!mattermostIntegration) {
        throw new errors.GeneralError(
          "Service d'intégration Mattermost non disponible",
        );
      }

      // Générer un nouveau token (simulation)
      const teamId = space.config && space.config.teamId;
      if (!teamId) {
        throw new errors.BadRequest(
          "Cet espace n'a pas d'équipe Mattermost associée",
        );
      }

      const newToken = await mattermostIntegration._generateToken(teamId);

      // Mettre à jour l'espace avec le nouveau token
      await spacesService.patch(spaceId, {
        apiToken: newToken,
      });

      return {
        spaceId,
        apiToken: newToken,
      };
    } catch (error) {
      logger.error("Erreur lors de la génération du token", error);
      throw error;
    }
  }
};
