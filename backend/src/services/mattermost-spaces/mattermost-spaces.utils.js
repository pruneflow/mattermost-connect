const logger = require("../../logger");

/**
 * Vérifie si l'utilisateur est autorisé à modifier un espace
 * Cette fonction est utilisée pour les opérations update et patch
 *
 * @param {Object} context - Le contexte Feathers
 * @returns {Object} Le contexte mis à jour
 * @throws {Error} Si l'utilisateur n'est pas autorisé
 */
exports.checkUpdatePermission = async (context) => {
  const { user } = context.params;

  if (!user.isAdmin) {
    // Vérifier que l'utilisateur modifie son propre espace
    const space = await context.service.get(context.id, context.params);

    if (space.userId !== user.id) {
      throw new Error("Non autorisé à modifier cet espace");
    }
  }

  return context;
};

/**
 * Vérifie si l'utilisateur est autorisé à supprimer un espace
 *
 * @param {Object} context - Le contexte Feathers
 * @returns {Object} Le contexte mis à jour
 * @throws {Error} Si l'utilisateur n'est pas autorisé
 */
exports.checkRemovePermission = async (context) => {
  const { user } = context.params;

  if (!user.isAdmin) {
    // Vérifier que l'utilisateur supprime son propre espace
    const space = await context.service.get(context.id, context.params);

    if (space.userId !== user.id) {
      throw new Error("Non autorisé à supprimer cet espace");
    }
  }

  return context;
};

/**
 * Hook pour créer un espace Mattermost lors de la création d'un enregistrement
 *
 * @param {Object} context - Le contexte Feathers
 * @returns {Object} Le contexte mis à jour avec les informations Mattermost
 * @throws {Error} Si la création de l'espace échoue
 */
exports.createMattermostSpace = async (context) => {
  try {
    // Récupérer le service d'intégration Mattermost
    const mattermostIntegration = context.app.get("mattermostIntegration");
    if (!mattermostIntegration) {
      throw new Error("Service d'intégration Mattermost non disponible");
    }

    // Récupérer les informations de l'utilisateur
    const { user } = context.params;
    if (!user) {
      throw new Error("Utilisateur non disponible");
    }

    // Récupérer les informations complètes de l'utilisateur
    const userService = context.app.service("/api/users");
    const userData = await userService.get(user.id);

    // Créer l'espace dans Mattermost
    const mattermostData = await mattermostIntegration.createClientSpace({
      companyName:
        userData.companyName || `Espace de ${userData.firstName || "Client"}`,
    });

    // Mettre à jour les données avec les informations Mattermost
    context.data.apiToken = mattermostData.apiToken;
    context.data.config = {
      teamId: mattermostData.teamId,
      teamName: mattermostData.teamName,
      inviteUrl: mattermostData.inviteUrl,
      defaultChannelId: mattermostData.channelId,
      // Ajouter les informations du bot
      botId: mattermostData.botId,
      botUsername: mattermostData.botUsername,
      botEmail: mattermostData.botEmail,
    };

    return context;
  } catch (error) {
    logger.error("Erreur lors de la création de l'espace Mattermost", error);
    throw error;
  }
};

/**
 * Hook pour supprimer l'espace Mattermost lors de la suppression de l'enregistrement
 * Ce hook est appliqué après la suppression (after.remove)
 *
 * @param {Object} context - Le contexte Feathers
 * @returns {Object} Le contexte mis à jour
 */
exports.deleteMattermostSpace = async (context) => {
  try {
    // Ne s'exécute qu'après la suppression réussie
    if (
      !context.result ||
      !context.result.config ||
      !context.result.config.teamId
    ) {
      logger.debug(
        "Pas d'équipe Mattermost à supprimer ou configuration manquante",
      );
      return context;
    }

    // Récupérer le service d'intégration Mattermost
    const mattermostIntegration = context.app.get("mattermostIntegration");
    if (!mattermostIntegration) {
      throw new Error("Service d'intégration Mattermost non disponible");
    }

    const teamId = context.result.config.teamId;
    logger.info(`Suppression de l'équipe Mattermost: ${teamId}`);

    // Utiliser la méthode améliorée qui gère la suppression des canaux et de l'équipe
    const result = await mattermostIntegration.deleteClientSpace(teamId);

    if (result.success) {
      logger.info(
        `Équipe Mattermost ${teamId} et ses ressources associées supprimées avec succès`,
      );
    }

    return context;
  } catch (error) {
    logger.error("Erreur lors de la suppression de l'espace Mattermost", error);
    // Ne pas propager l'erreur, car l'enregistrement a déjà été supprimé
    return context;
  }
};

/**
 * Fonction utilitaire pour valider un espace Mattermost
 * Peut être utilisée dans d'autres contextes ou hooks
 *
 * @param {Object} spaceData - Les données de l'espace à valider
 * @returns {boolean} true si les données sont valides, false sinon
 */
exports.validateMattermostSpace = (spaceData) => {
  if (!spaceData || typeof spaceData !== "object") {
    return false;
  }

  // Vérifier les champs obligatoires
  if (!spaceData.name || typeof spaceData.name !== "string") {
    return false;
  }

  // Vérifier le format du nom
  if (spaceData.name.length < 2 || spaceData.name.length > 255) {
    return false;
  }

  // Vérifier l'ID utilisateur
  if (!spaceData.userId || typeof spaceData.userId !== "number") {
    return false;
  }

  return true;
};

/**
 * Formatte les données de l'espace Mattermost pour l'affichage
 * Utile pour préparer les données avant de les envoyer au client
 *
 * @param {Object} spaceData - Les données de l'espace à formater
 * @returns {Object} Les données formatées
 */
exports.formatMattermostSpaceData = (spaceData) => {
  if (!spaceData) return null;

  // Création d'un nouvel objet pour ne pas modifier l'original
  const formatted = {
    id: spaceData.id,
    name: spaceData.name,
    isActive: spaceData.isActive,
    createdAt: spaceData.createdAt,
    inviteUrl: spaceData.config?.inviteUrl || null,
    teamName: spaceData.config?.teamName || null,
  };

  // Omettre le token API complet pour des raisons de sécurité
  if (spaceData.apiToken) {
    formatted.hasApiToken = true;
    // Montrer seulement les 4 derniers caractères du token s'il existe
    formatted.apiTokenPreview =
      spaceData.apiToken.length > 4
        ? `...${spaceData.apiToken.slice(-4)}`
        : null;
  } else {
    formatted.hasApiToken = false;
  }

  return formatted;
};
