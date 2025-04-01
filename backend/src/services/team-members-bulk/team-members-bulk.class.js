// src/services/team-members/team-members.class.js
const errors = require("@feathersjs/errors");
const logger = require("../../logger");
const inviteUserWithEmail = require("../team-members/inviteUserWithEmail");

exports.BulkInviteService = class BulkInviteService {
  constructor(options) {
    this.options = options || {};
    this.app = options.app;
  }

  // La méthode create sera utilisée pour les invitations par lots
  async create(data, params) {
    // Vérifier si l'utilisateur est authentifié
    if (!params.user) {
      throw new errors.NotAuthenticated("Authentification requise");
    }

    try {
      const { spaceId, emails } = data;

      if (
        !spaceId ||
        !emails ||
        !Array.isArray(emails) ||
        emails.length === 0
      ) {
        throw new errors.BadRequest("ID d'espace et liste d'emails requis");
      }

      // Vérifier que l'utilisateur a accès à cet espace
      const spacesService = this.app.service("/api/mattermost-spaces");
      const space = await spacesService.get(spaceId);

      if (space.userId !== params.user.id && !params.user.isAdmin) {
        throw new errors.Forbidden(
          "Non autorisé à inviter des utilisateurs dans cet espace",
        );
      }

      // Récupérer l'ID d'équipe
      const teamId = space.config && space.config.teamId;
      if (!teamId) {
        throw new errors.BadRequest(
          "Cet espace n'a pas d'équipe Mattermost associée",
        );
      }

      // Récupérer le service d'intégration Mattermost
      const mattermostIntegration = this.app.get("mattermostIntegration");
      if (!mattermostIntegration) {
        throw new errors.GeneralError(
          "Service d'intégration Mattermost non disponible",
        );
      }

      // Inviter chaque utilisateur
      const results = [];
      const errors = [];

      for (const email of emails) {
        try {
          const result = await inviteUserWithEmail(
            this.app,
            teamId,
            email,
            params.user,
            spaceId,
          );

          results.push({ email, status: result.status, success: true });
        } catch (error) {
          logger.error(`Erreur lors de l'invitation de ${email}:`, error);
          errors.push({
            email,
            status: "error",
            success: false,
            message: error.message || "Erreur lors de l'invitation",
          });
        }
      }

      // Retourner les résultats
      return {
        spaceId,
        teamId,
        invitations: {
          total: emails.length,
          successful: results.length,
          failed: errors.length,
          results,
          errors,
        },
      };
    } catch (error) {
      logger.error("Erreur lors des invitations par lots", error);
      throw error;
    }
  }
};
