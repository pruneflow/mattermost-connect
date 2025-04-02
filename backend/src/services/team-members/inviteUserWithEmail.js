// src/services/team-members/inviteUserWithEmail.js
const logger = require("../../logger");
const { HtmlMailFactory } = require("../mailer/mailer.factory");
const { template } = require("../mailer/templates/inviteUserTemplate");

/**
 * Fonction utilitaire pour gérer l'invitation d'un utilisateur avec envoi d'email
 * @param {Object} app - L'application Feathers
 * @param {String} teamId - L'ID de l'équipe Mattermost
 * @param {String} email - L'adresse email de l'utilisateur à inviter
 * @param {Object} inviter - L'utilisateur qui envoie l'invitation
 * @param spaceId
 * @returns {Promise<Object>} - Le résultat de l'invitation
 */
module.exports = async function inviteUserWithEmail(
  app,
  teamId,
  email,
  inviter,
  spaceId,
) {
  try {
    // Récupérer le service d'intégration Mattermost
    const mattermostIntegration = app.get("mattermostIntegration");
    if (!mattermostIntegration) {
      throw new Error("Service d'intégration Mattermost non disponible");
    }

    const spacesService = app.service("/api/mattermost-spaces");
    let space = await spacesService.get(spaceId);
    let apiToken = space.apiToken;

    if (!apiToken) {
      try {
        // Utiliser la fonction d'aide pour s'assurer qu'un token existe
        const updatedSpace = await ensureSpaceHasToken(app, space);
        apiToken = updatedSpace.apiToken;
      } catch (tokenError) {
        throw new Error(
          `Ce bot n'a pas de token API et la génération a échoué: ${tokenError.message}`,
        );
      }
    }

    // Récupérer les informations de l'équipe pour avoir le nom d'affichage
    const teamInfo = await mattermostIntegration._getTeam(teamId);

    // 1. Vérifier si l'utilisateur existe déjà
    let userId;
    let userExists = false;

    try {
      // Rechercher l'utilisateur par email
      const searchResponse =
        await mattermostIntegration._searchUserByEmail(email);

      if (searchResponse && searchResponse.length > 0) {
        userId = searchResponse[0].id;
        userExists = true;
        logger.info(
          `Utilisateur existant trouvé: ${userId} pour l'email ${email}`,
        );
      }
    } catch (error) {
      logger.debug(
        `Utilisateur avec l'email ${email} non trouvé, continuons avec l'invitation`,
      );
    }

    // 2a. Si l'utilisateur existe, l'ajouter directement à l'équipe
    if (userExists) {
      // Vérifier si l'utilisateur est déjà membre de l'équipe
      try {
        const teamMemberResponse =
          await mattermostIntegration._checkTeamMembershipWithToken(
            teamId,
            userId,
            apiToken,
          );
        // Si on arrive ici, l'utilisateur est déjà membre
        logger.info(
          `L'utilisateur ${userId} est déjà membre de l'équipe ${teamId}`,
        );
        const space = await app.service("/api/mattermost-spaces").get(spaceId);
        const defaultChannelId = space.config?.defaultChannelId;

        if (defaultChannelId) {
          // Ajouter l'utilisateur au canal par défaut
          await mattermostIntegration.addUserToChannel(
            defaultChannelId,
            userId,
            apiToken,
          );
          logger.info(
            `Utilisateur ${userId} ajouté au canal par défaut ${defaultChannelId}`,
          );
        }
        return {
          status: "added",
          userId,
          email,
        };
      } catch (error) {
        // Si on a une erreur 404, c'est que l'utilisateur n'est pas encore membre, c'est normal
        if (error.response && error.response.status !== 404) {
          // Une autre erreur s'est produite
          logger.error(
            `Erreur lors de la vérification de l'appartenance à l'équipe:`,
            error,
          );
        }
      }

      // Ajouter l'utilisateur à l'équipe
      await mattermostIntegration._addUserToTeamWithToken(
        teamId,
        userId,
        apiToken,
      );

      logger.info(`Utilisateur ${userId} ajouté à l'équipe ${teamId}`);

      try {
        const space = await app.service("/api/mattermost-spaces").get(spaceId);
        const defaultChannelId = space.config?.defaultChannelId;

        if (defaultChannelId) {
          // Ajouter l'utilisateur au canal par défaut
          await mattermostIntegration.addUserToChannel(
            defaultChannelId,
            userId,
            apiToken,
          );
          logger.info(
            `Utilisateur ${userId} ajouté au canal par défaut ${defaultChannelId}`,
          );
        }
      } catch (channelError) {
        // Ne pas échouer l'opération principale si l'ajout au canal échoue
        logger.warn(
          `Impossible d'ajouter l'utilisateur au canal par défaut: ${channelError.message}`,
        );
      }
      return {
        status: "added",
        userId,
        email,
      };
    }
    // 2b. Si l'utilisateur n'existe pas, générer un lien d'invitation et envoyer un email
    else {
      // Récupérer ou générer un lien d'invitation pour l'équipe
      let inviteId;

      try {
        // Essayer de récupérer l'invite_id existant
        inviteId = teamInfo.invite_id;

        // Si l'invite_id n'existe pas ou est vide, en générer un nouveau
        if (!inviteId) {
          inviteId =
            await mattermostIntegration._regenerateTeamInviteIdWithToken(
              teamId,
              apiToken,
            );
        }
      } catch (error) {
        logger.error(
          `Erreur lors de la génération du lien d'invitation:`,
          error,
        );
        throw new Error("Impossible de générer un lien d'invitation");
      }

      // Créer le lien d'invitation
      const mattermostBaseUrl =
        app.get("mattermost")?.baseUrl || "http://localhost:8065";
      const inviteUrl = `${mattermostBaseUrl}/signup_user_complete/?id=${inviteId}`;

      logger.info(
        `Lien d'invitation généré pour l'équipe ${teamId}: ${inviteUrl}`,
      );

      // Envoyer un email d'invitation
      try {
        // Préparer les données pour le template
        const templateData = {
          teamName: teamInfo.display_name || teamInfo.name,
          inviterName: inviter
            ? `${inviter.firstName} ${inviter.lastName}`.trim()
            : "Un administrateur",
          url: inviteUrl,
          baseUrl: mattermostBaseUrl,
          companyName: inviter?.companyName || "Mattermost Admin",
        };

        const htmlMail = HtmlMailFactory(
          email,
          `[Mattermost Admin] - Invitation to join a team`,
          template(templateData),
        );
        await app.service("/api/mailer").create(htmlMail);

        logger.info(
          `Email d'invitation envoyé à ${email} pour l'équipe ${teamId}`,
        );

        return {
          status: "invitation_sent",
          email,
          teamName: teamInfo.display_name || teamInfo.name,
        };
      } catch (emailError) {
        logger.error(
          `Erreur lors de l'envoi de l'email d'invitation:`,
          emailError,
        );

        // En cas d'échec de l'envoi d'email, retourner quand même le lien d'invitation
        return {
          status: "email_failed",
          email,
          inviteUrl,
          teamName: teamInfo.display_name || teamInfo.name,
          error: emailError.message,
          message: `L'invitation par email a échoué, mais voici le lien d'invitation: ${inviteUrl}`,
        };
      }
    }
  } catch (error) {
    logger.error(
      `Erreur lors de l'invitation de l'utilisateur ${email} à l'équipe ${teamId}:`,
      error,
    );
    throw error;
  }
};
