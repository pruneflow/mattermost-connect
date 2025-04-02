// src/services/channels/ensure-token.js
const logger = require("../../logger");

/**
 * Fonction utilitaire pour s'assurer qu'un espace a un token API valide
 * Si ce n'est pas le cas, tente d'en générer un
 *
 * @param {Object} app - L'application Feathers
 * @param {Object} space - L'espace dont on veut vérifier le token
 * @returns {Object} L'espace avec un token (si la génération a réussi)
 */
async function ensureSpaceHasToken(app, space) {
  // Si l'espace a déjà un token, rien à faire
  if (space.apiToken) {
    return space;
  }

  logger.info(
    `L'espace ${space.id} n'a pas de token API, tentative de génération...`,
  );

  try {
    // Récupérer le service d'intégration Mattermost
    const mattermostIntegration = app.get("mattermostIntegration");
    if (!mattermostIntegration) {
      throw new Error("Service d'intégration Mattermost non disponible");
    }

    // Vérifier que l'espace a une configuration avec teamId
    const teamId = space.config?.teamId;
    if (!teamId) {
      throw new Error("Cet espace n'a pas d'équipe Mattermost associée");
    }

    // Générer un nouveau token
    const tokenResult = await app.service("/api/tokens").create(
      {
        spaceId: space.id,
      },
      {
        // Simuler un appel interne (sans provider) pour bypasser les vérifications d'authentification
        provider: null,
        user: {
          id: space.userId,
          isAdmin: true,
        },
      },
    );

    // Mettre à jour l'espace avec le nouveau token
    const spacesService = app.service("/api/mattermost-spaces");
    const updatedSpace = await spacesService.get(space.id);

    logger.info(`Token API généré avec succès pour l'espace ${space.id}`);

    return updatedSpace;
  } catch (error) {
    logger.error(
      `Impossible de générer un token API pour l'espace ${space.id}:`,
      error,
    );
    throw new Error(
      `Ce bot n'a pas de token API et la génération automatique a échoué: ${error.message}`,
    );
  }
}

module.exports = ensureSpaceHasToken;
