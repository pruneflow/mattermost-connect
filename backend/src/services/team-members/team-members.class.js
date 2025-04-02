// src/services/team-members/team-members.class.js
const errors = require("@feathersjs/errors");
const logger = require("../../logger");
const inviteUserWithEmail = require("./inviteUserWithEmail");
const ensureSpaceHasToken = require("../channels/ensure-token");

exports.TeamMembers = class TeamMembers {
  constructor(options) {
    this.options = options || {};
    this.app = options.app;
  }

  // Méthode pour obtenir tous les membres d'une équipe
  async find(params) {
    // Vérifier si l'utilisateur est authentifié
    if (!params.user) {
      throw new errors.NotAuthenticated("Authentification requise");
    }

    try {
      const { spaceId } = params.query || {};

      if (!spaceId) {
        throw new errors.BadRequest("ID d'espace requis");
      }

      // Vérifier que l'utilisateur a accès à cet espace
      const spacesService = this.app.service("/api/mattermost-spaces");
      const space = await spacesService.get(spaceId);

      // Vérifier que l'utilisateur est propriétaire de l'espace ou admin
      if (space.userId !== params.user.id && !params.user.isAdmin) {
        throw new errors.Forbidden("Non autorisé à accéder à cet espace");
      }

      // Récupérer l'ID d'équipe
      const teamId = space.config && space.config.teamId;
      if (!teamId) {
        throw new errors.BadRequest(
          "Cet espace n'a pas d'équipe Mattermost associée",
        );
      }

      let apiToken = space.apiToken;
      if (!apiToken) {
        try {
          // Utiliser la fonction d'aide pour s'assurer qu'un token existe
          const updatedSpace = await ensureSpaceHasToken(this.app, space);
          apiToken = updatedSpace.apiToken;
        } catch (tokenError) {
          throw new errors.GeneralError(
            `Ce bot n'a pas de token API et la génération a échoué: ${tokenError.message}`,
          );
        }
      }

      // Récupérer le service d'intégration Mattermost
      const mattermostIntegration = this.app.get("mattermostIntegration");
      if (!mattermostIntegration) {
        throw new errors.GeneralError(
          "Service d'intégration Mattermost non disponible",
        );
      }

      // Récupérer les membres de l'équipe
      const members = await mattermostIntegration.getTeamMembersWithToken(
        teamId,
        apiToken,
      );

      // Récupérer les informations du propriétaire
      // Pour faire la correspondance, nous devons obtenir l'email du propriétaire
      const userService = this.app.service("/api/users");
      const ownerUser = await userService.get(space.userId);
      const ownerEmail = ownerUser.email;
      const ownerUsername = ownerUser.username;

      // Identifier l'ID de bot pour cet espace
      const botId = space.config && space.config.botId;
      const botUsername = space.config && space.config.botUsername;
      const botEmail = space.config && space.config.botEmail;

      // Traiter les données pour le frontend
      const processedMembers = members.map((member) => {
        // Déterminer si l'utilisateur est le propriétaire (correspondance par email)
        const isOwner =
          member.email === ownerEmail ||
          (ownerUsername && member.username === ownerUsername);

        // Déterminer si l'utilisateur est administrateur de l'équipe ou système
        const isTeamAdmin = member.roles && member.roles.includes("team_admin");
        const isSystemAdmin =
          member.roles && member.roles.includes("system_admin");

        // Déterminer si c'est un bot
        const isBot =
          member.user_id === botId ||
          member.username === botUsername ||
          member.email === botEmail ||
          member.username?.startsWith("bot-") ||
          member.email?.includes("@mattermost-admin.local") ||
          (member.props && member.props.is_bot === "true");

        return {
          id: member.user_id,
          username: member.username,
          email: member.email,
          firstName: member.first_name,
          lastName: member.last_name,
          // Les bots et les admin système doivent être marqués comme admin d'équipe
          isAdmin: isTeamAdmin || isSystemAdmin || isBot || isOwner,
          isOwner: isOwner,
          isPending: !member.user_id, // Si pas d'ID utilisateur, considérer comme en attente
          isBot: isBot,
          isSystemAdmin: isSystemAdmin,
          roles: member.roles,
          props: member.props, // Inclure les propriétés supplémentaires de l'utilisateur
        };
      });

      // Trier les membres: d'abord le propriétaire, puis les admins, puis les membres normaux
      processedMembers.sort((a, b) => {
        if (a.isOwner && !b.isOwner) return -1;
        if (!a.isOwner && b.isOwner) return 1;
        if (
          a.roles?.includes("system_admin") &&
          !b.roles?.includes("system_admin")
        )
          return -1;
        if (
          !a.roles?.includes("system_admin") &&
          b.roles?.includes("system_admin")
        )
          return 1;
        if (a.isAdmin && !b.isAdmin) return -1;
        if (!a.isAdmin && b.isAdmin) return 1;
        if (a.isBot && !b.isBot) return -1;
        if (!a.isBot && b.isBot) return 1;
        return (a.username || a.email || "").localeCompare(
          b.username || b.email || "",
        );
      });

      // Retourner les membres
      return processedMembers;
    } catch (error) {
      logger.error(
        "Erreur lors de la récupération des membres de l'équipe",
        error,
      );
      throw error;
    }
  }

  // Méthode pour inviter un utilisateur à une équipe
  async create(data, params) {
    // Vérifier si l'utilisateur est authentifié
    if (!params.user) {
      throw new errors.NotAuthenticated("Authentification requise");
    }

    try {
      const { spaceId, email } = data;

      if (!spaceId || !email) {
        throw new errors.BadRequest("ID d'espace et email requis");
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

      // Utiliser la fonction d'invitation avec email
      const result = await inviteUserWithEmail(
        this.app,
        teamId,
        email,
        params.user,
        spaceId,
      );

      return result;
    } catch (error) {
      logger.error("Erreur lors de l'invitation d'un utilisateur", error);
      throw error;
    }
  }

  // Méthode pour mettre à jour le rôle d'un membre
  async patch(id, data, params) {
    // Vérifier si l'utilisateur est authentifié
    if (!params.user) {
      throw new errors.NotAuthenticated("Authentification requise");
    }

    try {
      const { spaceId, isAdmin } = data;

      if (!spaceId || isAdmin === undefined) {
        throw new errors.BadRequest("ID d'espace et statut admin requis");
      }

      // Vérifier que l'utilisateur a accès à cet espace
      const spacesService = this.app.service("/api/mattermost-spaces");
      const space = await spacesService.get(spaceId);

      if (space.userId !== params.user.id && !params.user.isAdmin) {
        throw new errors.Forbidden(
          "Non autorisé à modifier les rôles des utilisateurs dans cet espace",
        );
      }

      // Récupérer l'ID d'équipe
      const teamId = space.config && space.config.teamId;
      if (!teamId) {
        throw new errors.BadRequest(
          "Cet espace n'a pas d'équipe Mattermost associée",
        );
      }

      // Vérifier si le bot a un token API et en générer un si nécessaire
      let apiToken = space.apiToken;
      if (!apiToken) {
        try {
          // Utiliser la fonction d'aide pour s'assurer qu'un token existe
          const updatedSpace = await ensureSpaceHasToken(this.app, space);
          apiToken = updatedSpace.apiToken;
        } catch (tokenError) {
          throw new errors.GeneralError(
            `Ce bot n'a pas de token API et la génération a échoué: ${tokenError.message}`,
          );
        }
      }

      const mattermostIntegration = this.app.get("mattermostIntegration");
      if (!mattermostIntegration) {
        throw new errors.GeneralError(
          "Service d'intégration Mattermost non disponible",
        );
      }

      // Vérifier que l'utilisateur n'est pas le propriétaire de l'espace
      // ou que ce n'est pas un bot, ou un administrateur système
      if (id === space.userId) {
        throw new errors.BadRequest(
          "Impossible de modifier le rôle du propriétaire de l'espace",
        );
      }

      // Récupérer les informations de l'utilisateur pour vérifier s'il s'agit d'un bot ou d'un administrateur système
      const members = await mattermostIntegration.getTeamMembersWithToken(
        teamId,
        apiToken,
      );
      const member = members.find((m) => m.user_id === id);

      if (!member) {
        throw new errors.NotFound("Membre non trouvé dans cette équipe");
      }

      // Vérifier si c'est un bot
      const isBot =
        member.username?.startsWith("bot-") ||
        member.email?.includes("@mattermost-admin.local") ||
        (member.props && member.props.is_bot === "true");

      if (isBot) {
        throw new errors.BadRequest("Impossible de modifier le rôle d'un bot");
      }

      // Vérifier si c'est un administrateur système
      if (member.roles && member.roles.includes("system_admin")) {
        throw new errors.BadRequest(
          "Impossible de modifier le rôle d'un administrateur système",
        );
      }

      // Mise à jour du rôle
      const result = await mattermostIntegration.updateUserRoleWithToken(
        teamId,
        id,
        isAdmin,
        apiToken,
      );

      return {
        spaceId,
        teamId,
        userId: id,
        isAdmin,
        roles: result.roles,
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la mise à jour du rôle de l'utilisateur ${id}`,
        error,
      );
      throw error;
    }
  }

  // Méthode pour supprimer un membre
  async remove(id, params) {
    // Vérifier si l'utilisateur est authentifié
    if (!params.user) {
      throw new errors.NotAuthenticated("Authentification requise");
    }

    try {
      const { spaceId } = params.query || {};

      if (!spaceId) {
        throw new errors.BadRequest("ID d'espace requis");
      }

      // Vérifier que l'utilisateur a accès à cet espace
      const spacesService = this.app.service("/api/mattermost-spaces");
      const space = await spacesService.get(spaceId);

      if (space.userId !== params.user.id && !params.user.isAdmin) {
        throw new errors.Forbidden(
          "Non autorisé à supprimer des utilisateurs dans cet espace",
        );
      }

      // Récupérer l'ID d'équipe
      const teamId = space.config && space.config.teamId;
      if (!teamId) {
        throw new errors.BadRequest(
          "Cet espace n'a pas d'équipe Mattermost associée",
        );
      }

      // Vérifier que l'utilisateur n'est pas le propriétaire
      if (id === space.userId) {
        throw new errors.BadRequest(
          "Impossible de supprimer le propriétaire de l'espace",
        );
      }

      // Vérifier si le bot a un token API et en générer un si nécessaire
      let apiToken = space.apiToken;
      if (!apiToken) {
        try {
          // Utiliser la fonction d'aide pour s'assurer qu'un token existe
          const updatedSpace = await ensureSpaceHasToken(this.app, space);
          apiToken = updatedSpace.apiToken;
        } catch (tokenError) {
          throw new errors.GeneralError(
            `Ce bot n'a pas de token API et la génération a échoué: ${tokenError.message}`,
          );
        }
      }

      // VÉRIFICATION CRITIQUE : Est-ce que l'utilisateur à supprimer est le bot?
      // Vérifier d'abord si l'ID du bot existe dans la configuration
      if (space.config && space.config.botId && id === space.config.botId) {
        throw new errors.BadRequest(
          "Le bot administrateur ne peut pas être supprimé, il est nécessaire au fonctionnement de l'espace.",
        );
      }

      const mattermostIntegration = this.app.get("mattermostIntegration");
      if (!mattermostIntegration) {
        throw new errors.GeneralError(
          "Service d'intégration Mattermost non disponible",
        );
      }

      // Vérification basée sur le nom d'utilisateur, au cas où l'ID ne serait pas disponible
      if (space.config && space.config.botUsername) {
        try {
          const userInfo = await mattermostIntegration._getUserInfoWithToken(
            id,
            apiToken,
          );
          if (userInfo && userInfo.username === space.config.botUsername) {
            throw new errors.BadRequest(
              "Le bot administrateur ne peut pas être supprimé, il est nécessaire au fonctionnement de l'espace.",
            );
          }
        } catch (error) {
          // Ignorer les erreurs lors de la récupération des infos utilisateur
          // et continuer avec les autres vérifications
          logger.warn(
            "Erreur lors de la vérification du nom d'utilisateur pour protection du bot",
            error,
          );
        }
      }

      // Vérifier si l'utilisateur est un administrateur système
      const members = await mattermostIntegration.getTeamMembersWithToken(
        teamId,
        apiToken,
      );
      const member = members.find((m) => m.user_id === id);

      if (member && member.roles && member.roles.includes("system_admin")) {
        throw new errors.BadRequest(
          "Les administrateurs système ne peuvent pas être supprimés par cette interface.",
        );
      }

      // Si on arrive ici, l'utilisateur à supprimer n'est pas le bot ni un admin système
      await mattermostIntegration.removeUserFromTeamWithToken(
        teamId,
        id,
        apiToken,
      );

      return {
        success: true,
        spaceId,
        teamId,
        userId: id,
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la suppression de l'utilisateur ${id}`,
        error,
      );
      throw error;
    }
  }
};
