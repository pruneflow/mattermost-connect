// src/services/channels/channels.class.js
const errors = require("@feathersjs/errors");
const logger = require("../../logger");
const ensureSpaceHasToken = require("./ensure-token");

exports.Channels = class Channels {
  constructor(options) {
    this.options = options || {};
    this.app = options.app;
  }

  // Obtenir tous les canaux d'un espace
  async find(params) {
    // Vérifier si l'utilisateur est authentifié
    if (!params.user) {
      throw new errors.NotAuthenticated("Authentification requise");
    }

    try {
      const { spaceId, includeArchived = false } = params.query || {};

      if (!spaceId) {
        throw new errors.BadRequest("ID d'espace requis");
      }

      // Récupérer l'espace pour vérifier les autorisations et obtenir le token du bot
      const spacesService = this.app.service("/api/mattermost-spaces");
      let space = await spacesService.get(spaceId);

      // Vérifier que l'utilisateur a accès à cet espace
      if (space.userId !== params.user.id && !params.user.isAdmin) {
        throw new errors.Forbidden(
          "Non autorisé à accéder aux canaux de cet espace",
        );
      }

      // Récupérer l'ID d'équipe
      const teamId = space.config?.teamId;
      if (!teamId) {
        throw new errors.BadRequest(
          "Cet espace n'a pas d'équipe Mattermost associée",
        );
      }

      // Vérifier si le bot a un token API
      if (!space.apiToken) {
        // Tenter de générer un token automatiquement
        try {
          space = await ensureSpaceHasToken(this.app, space);
        } catch (tokenError) {
          throw new errors.GeneralError(
            `Ce bot n'a pas de token API. Veuillez en générer un pour cet espace. Erreur: ${tokenError.message}`,
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

      // Récupérer les canaux en utilisant le token du bot de l'espace
      const channels = await mattermostIntegration.getTeamChannelsWithToken(
        teamId,
        space.apiToken,
        { includeDeleted: includeArchived }, // Nouveau paramètre
      );

      // Créer un ensemble des IDs des créateurs pour éviter les doublons
      const creatorIds = new Set();
      channels.forEach((channel) => {
        if (channel.creator_id) {
          creatorIds.add(channel.creator_id);
        }
      });

      // Récupérer les informations des créateurs
      const creatorInfo = {};
      if (creatorIds.size > 0) {
        // Convertir le Set en array pour le parcourir
        const creatorIdsArray = Array.from(creatorIds);

        // Obtenir les informations de chaque créateur
        await Promise.all(
          creatorIdsArray.map(async (userId) => {
            try {
              // Utiliser le token du bot pour obtenir les infos des utilisateurs
              const userInfo =
                await mattermostIntegration._getUserInfoWithToken(
                  userId,
                  space.apiToken,
                );

              // Déterminer si c'est un bot
              const isBot =
                userInfo.username?.startsWith("bot-") ||
                userInfo.email?.includes("@mattermost-admin.local") ||
                (userInfo.props && userInfo.props.is_bot === "true");

              // Stocker les informations nécessaires
              creatorInfo[userId] = {
                username: userInfo.username || "Unknown",
                displayName: isBot
                  ? "Bot"
                  : userInfo.first_name && userInfo.last_name
                    ? `${userInfo.first_name} ${userInfo.last_name}`
                    : userInfo.username || "Unknown User",
                isBot: isBot,
              };
            } catch (error) {
              logger.warn(
                `Impossible d'obtenir les informations de l'utilisateur ${userId}`,
                error,
              );
              // Valeur par défaut en cas d'erreur
              creatorInfo[userId] = {
                username: "Unknown",
                displayName: "Unknown User",
                isBot: false,
              };
            }
          }),
        );
      }

      // Enrichir les données des canaux avec les informations des créateurs
      return channels.map((channel) => {
        const isDefaultChannel =
          channel.name === "town-square" || channel.name === "off-topic";

        return {
          ...channel,
          // Convertir les timestamps de Mattermost en dates standard
          create_at: channel.create_at
            ? new Date(channel.create_at).toISOString()
            : null,
          update_at: channel.update_at
            ? new Date(channel.update_at).toISOString()
            : null,
          delete_at: channel.delete_at
            ? new Date(channel.delete_at).toISOString()
            : null,
          // Ajouter les informations du créateur
          creator:
            !isDefaultChannel && channel.creator_id
              ? creatorInfo[channel.creator_id]
              : null,
          // Ajouter un indicateur pour les canaux par défaut
          isDefaultChannel: isDefaultChannel,
        };
      });
    } catch (error) {
      logger.error("Erreur lors de la récupération des canaux", error);
      throw error;
    }
  }

  // Créer un nouveau canal dans un espace
  async create(data, params) {
    // Vérifier si l'utilisateur est authentifié
    if (!params.user) {
      throw new errors.NotAuthenticated("Authentification requise");
    }

    try {
      const { spaceId, name, display_name, type, purpose, header } = data;

      if (!spaceId || !name || !display_name) {
        throw new errors.BadRequest(
          "ID d'espace, nom et nom d'affichage requis",
        );
      }

      // Récupérer l'espace pour vérifier les autorisations et obtenir le token du bot
      const spacesService = this.app.service("/api/mattermost-spaces");
      let space = await spacesService.get(spaceId);

      // Vérifier que l'utilisateur a accès à cet espace
      if (space.userId !== params.user.id && !params.user.isAdmin) {
        throw new errors.Forbidden(
          "Non autorisé à créer des canaux dans cet espace",
        );
      }

      // Récupérer l'ID d'équipe
      const teamId = space.config?.teamId;
      if (!teamId) {
        throw new errors.BadRequest(
          "Cet espace n'a pas d'équipe Mattermost associée",
        );
      }

      // Vérifier si le bot a un token API
      if (!space.apiToken) {
        // Tenter de générer un token automatiquement
        try {
          space = await ensureSpaceHasToken(this.app, space);
        } catch (tokenError) {
          throw new errors.GeneralError(
            `Ce bot n'a pas de token API. Veuillez en générer un pour cet espace. Erreur: ${tokenError.message}`,
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

      // Créer le canal en utilisant le token du bot
      const channelData = {
        team_id: teamId,
        name: name.toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
        display_name,
        type: type || "O", // O = public, P = privé
        purpose,
        header,
      };

      const channel = await mattermostIntegration.createChannelWithToken(
        channelData,
        space.apiToken,
      );

      return {
        ...channel,
        spaceId,
      };
    } catch (error) {
      logger.error("Erreur lors de la création du canal", error);
      throw error;
    }
  }

  // Mettre à jour un canal
  async patch(id, data, params) {
    // Vérifier si l'utilisateur est authentifié
    if (!params.user) {
      throw new errors.NotAuthenticated("Authentification requise");
    }

    try {
      const { spaceId, display_name, purpose, header } = data;

      if (!spaceId) {
        throw new errors.BadRequest("ID d'espace requis");
      }

      // Récupérer l'espace pour vérifier les autorisations
      const spacesService = this.app.service("/api/mattermost-spaces");
      let space = await spacesService.get(spaceId);

      // Vérifier que l'utilisateur a accès à cet espace
      if (space.userId !== params.user.id && !params.user.isAdmin) {
        throw new errors.Forbidden(
          "Non autorisé à modifier des canaux dans cet espace",
        );
      }

      // Vérifier si le bot a un token API
      if (!space.apiToken) {
        // Tenter de générer un token automatiquement
        try {
          space = await ensureSpaceHasToken(this.app, space);
        } catch (tokenError) {
          throw new errors.GeneralError(
            `Ce bot n'a pas de token API. Veuillez en générer un pour cet espace. Erreur: ${tokenError.message}`,
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

      // Préparer les données de mise à jour
      const updateData = {};
      if (display_name) updateData.display_name = display_name;
      if (purpose !== undefined) updateData.purpose = purpose;
      if (header !== undefined) updateData.header = header;

      // Mettre à jour le canal en utilisant le token du bot
      const updatedChannel = await mattermostIntegration.updateChannelWithToken(
        id,
        updateData,
        space.apiToken,
      );

      return {
        ...updatedChannel,
        spaceId,
      };
    } catch (error) {
      logger.error(`Erreur lors de la mise à jour du canal ${id}`, error);
      throw error;
    }
  }

  // Archiver un canal (suppression logique)
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

      // Récupérer l'espace pour vérifier les autorisations
      const spacesService = this.app.service("/api/mattermost-spaces");
      let space = await spacesService.get(spaceId);

      // Vérifier que l'utilisateur a accès à cet espace
      if (space.userId !== params.user.id && !params.user.isAdmin) {
        throw new errors.Forbidden(
          "Non autorisé à archiver des canaux dans cet espace",
        );
      }

      // Vérifier si le bot a un token API
      if (!space.apiToken) {
        // Tenter de générer un token automatiquement
        try {
          space = await ensureSpaceHasToken(this.app, space);
        } catch (tokenError) {
          throw new errors.GeneralError(
            `Ce bot n'a pas de token API. Veuillez en générer un pour cet espace. Erreur: ${tokenError.message}`,
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

      // Archiver le canal en utilisant le token du bot
      const result = await mattermostIntegration.archiveChannelWithToken(
        id,
        space.apiToken,
      );

      return {
        ...result,
        spaceId,
      };
    } catch (error) {
      logger.error(`Erreur lors de l'archivage du canal ${id}`, error);
      throw error;
    }
  }

  // Nouvelle méthode à ajouter dans channels.class.js
  async restoreChannel(id, params) {
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
      let space = await spacesService.get(spaceId);

      // Vérifier que l'utilisateur a accès à cet espace
      if (space.userId !== params.user.id && !params.user.isAdmin) {
        throw new errors.Forbidden(
          "Non autorisé à restaurer des canaux dans cet espace",
        );
      }

      // Récupérer le token API
      let apiToken = space.apiToken;
      if (!apiToken) {
        try {
          space = await ensureSpaceHasToken(this.app, space);
          apiToken = space.apiToken;
        } catch (tokenError) {
          throw new errors.GeneralError(
            `Ce bot n'a pas de token API. Veuillez en générer un pour cet espace. Erreur: ${tokenError.message}`,
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

      // Restaurer le canal
      const result = await mattermostIntegration.restoreChannelWithToken(
        id,
        apiToken,
      );

      return {
        ...result,
        spaceId,
      };
    } catch (error) {
      logger.error(`Erreur lors de la restauration du canal ${id}`, error);
      throw error;
    }
  }
};
