const axios = require("axios");
const logger = require("../../logger");

class MattermostIntegration {
  constructor(app) {
    this.app = app;
    this.config = app.get("mattermost") || {};

    // Vérifier les variables d'environnement pour la configuration Mattermost
    this.baseUrl =
      this.config.baseUrl === "MATTERMOST_BASE_URL" &&
      process.env.MATTERMOST_BASE_URL
        ? process.env.MATTERMOST_BASE_URL
        : this.config.baseUrl || "http://localhost:8065";

    this.adminToken =
      this.config.adminToken === "MATTERMOST_ADMIN_TOKEN" &&
      process.env.MATTERMOST_ADMIN_TOKEN
        ? process.env.MATTERMOST_ADMIN_TOKEN
        : this.config.adminToken || "";

    if (!this.adminToken) {
      logger.warn(
        "Mattermost admin token is not configured. Some functionality may be limited.",
      );
    }

    logger.info("Service Mattermost initialisé - connexion à " + this.baseUrl);
  }
  // Rechercher un utilisateur par email
  async _searchUserByEmail(email) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v4/users/search`,
        {
          term: email,
          allow_inactive: true,
        },
        {
          headers: {
            Authorization: `Bearer ${this.adminToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      return response.data;
    } catch (error) {
      logger.debug(
        `Recherche d'utilisateur par email échouée: ${error.message}`,
      );
      return []; // Retourner un tableau vide en cas d'erreur
    }
  }

  // Initialiser un nouvel espace pour un client
  async createClientSpace(clientData) {
    try {
      // Vérifier si nous avons les informations nécessaires
      if (!clientData || !clientData.companyName) {
        throw new Error("Données client insuffisantes pour créer un espace");
      }

      // 1. Générer un nom d'équipe unique
      const teamName = this._generateTeamName(clientData.companyName);

      // 2. Préparer les informations du bot
      const botUsername = `bot-${teamName}`;
      const botEmail = `${botUsername}@mattermost-admin.local`;

      // 3. Générer un mot de passe aléatoire pour le bot
      const randomBytes = require("crypto").randomBytes(24);
      const botPassword = randomBytes.toString("hex");

      // 4. Créer le bot en tant qu'utilisateur système
      logger.info(`Création du bot utilisateur pour l'équipe ${teamName}`);
      const newBotResponse = await axios.post(
        `${this.baseUrl}/api/v4/users`,
        {
          username: botUsername,
          email: botEmail,
          password: botPassword,
          auth_service: "",
          props: {
            is_bot: "true",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.adminToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const botUserId = newBotResponse.data.id;
      logger.info(`Bot utilisateur créé: ${botUserId}`);

      // 5. Générer directement un token d'accès personnel en utilisant le token admin
      // Cette approche est plus fiable que d'essayer de se connecter en tant que bot
      logger.info(
        `Génération d'un token pour le bot ${botUserId} en utilisant les privilèges admin`,
      );

      const tokenResponse = await axios.post(
        `${this.baseUrl}/api/v4/users/${botUserId}/tokens`,
        {
          description: `API Token for team ${teamName} (admin-generated)`,
        },
        {
          headers: {
            Authorization: `Bearer ${this.adminToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const personalToken = tokenResponse.data.token;
      logger.info(`Token API généré avec succès pour l'équipe ${teamName}`);

      // 6. Créer l'équipe en utilisant le token du bot
      logger.info(`Création de l'équipe en tant que bot: ${teamName}`);
      const team = await axios
        .post(
          `${this.baseUrl}/api/v4/teams`,
          {
            name: teamName,
            display_name: clientData.companyName,
            type: "I", // Équipe privée par invitation
            description: `Espace Mattermost pour ${clientData.companyName}`,
          },
          {
            headers: {
              Authorization: `Bearer ${personalToken}`,
              "Content-Type": "application/json",
            },
          },
        )
        .then((response) => response.data);

      // 7. Créer un canal par défaut
      const channel = await axios
        .post(
          `${this.baseUrl}/api/v4/channels`,
          {
            team_id: team.id,
            name: "general",
            display_name: "Général",
            type: "O", // Canal ouvert
            purpose: "Canal général de discussion",
          },
          {
            headers: {
              Authorization: `Bearer ${personalToken}`,
              "Content-Type": "application/json",
            },
          },
        )
        .then((response) => response.data);

      // 9. Stocker les informations du bot dans la base de données
      // (Vous pourriez vouloir les stocker pour une utilisation ultérieure)

      return {
        teamId: team.id,
        teamName: team.name,
        channelId: channel.id,
        apiToken: personalToken,
        inviteUrl: `${this.baseUrl}/signup_user_complete/?id=${team.invite_id}`,
        botId: botUserId,
        botUsername: botUsername,
        botEmail: botEmail,
      };
    } catch (error) {
      logger.error(
        "Erreur lors de la création de l'espace client Mattermost",
        error,
      );
      throw error;
    }
  }

  // Supprimer un espace client
  async deleteClientSpace(teamId) {
    try {
      logger.info(
        `Suppression de l'équipe ${teamId} et de ses ressources associées`,
      );

      // Chercher d'abord le token du bot associé à cet espace
      let botToken = null;
      try {
        const spacesService = this.app.service("/api/mattermost-spaces");
        const spaces = await spacesService.find({
          query: {
            config: { teamId },
          },
          paginate: false,
        });

        if (spaces && spaces.length > 0 && spaces[0].apiToken) {
          botToken = spaces[0].apiToken;
        }
      } catch (error) {
        console.debug("error", error);
        logger.warn(
          `Impossible de trouver un token pour l'équipe ${teamId}, utilisation du token admin`,
        );
      }

      // 1. Récupérer tous les canaux de l'équipe
      const channels = botToken
        ? await this.getTeamChannelsWithToken(teamId, botToken)
        : await this.getTeamChannels(teamId);

      logger.info(`${channels.length} canaux trouvés pour l'équipe ${teamId}`);

      // 2. Archiver tous les canaux un par un
      const archiveResults = [];
      for (const channel of channels) {
        try {
          logger.info(
            `Tentative d'archivage du canal ${channel.id} (${channel.name})`,
          );
          const result = botToken
            ? await this.archiveChannelWithToken(channel.id, botToken)
            : await this.archiveChannel(channel.id);
          archiveResults.push(result);

          // Si l'archivage a échoué à cause d'un canal protégé, le logger mais continuer
          if (
            !result.success &&
            (result.isDefaultChannel || result.isProtected)
          ) {
            logger.warn(
              `Le canal ${channel.id} (${channel.name}) n'a pas pu être archivé car il est protégé.`,
            );
          }
        } catch (channelError) {
          // Continuer avec les autres canaux même si un échoue
          logger.error(
            `Erreur lors de l'archivage du canal ${channel.id}:`,
            channelError,
          );
          archiveResults.push({
            success: false,
            channelId: channel.id,
            error: channelError.message,
          });
        }
      }

      // 3. Supprimer l'équipe après avoir archivé tous les canaux
      await this._deleteTeam(teamId, botToken);
      logger.info(`Équipe ${teamId} supprimée avec succès`);

      return {
        success: true,
        archiveResults,
      };
    } catch (error) {
      logger.error("Erreur lors de la suppression de l'espace client", error);
      throw error;
    }
  }

  // Récupérer une équipe Mattermost
  async _getTeam(teamId, token = null) {
    try {
      const authToken = token || this.adminToken;

      const response = await axios.get(
        `${this.baseUrl}/api/v4/teams/${teamId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération de l'équipe Mattermost: ${error.message}`,
      );

      // Si l'accès est refusé avec le token fourni et qu'il n'est pas le token admin,
      // essayer avec le token admin
      if (
        error.response &&
        error.response.status === 403 &&
        token &&
        token !== this.adminToken
      ) {
        logger.warn(`Tentative de récupération avec token admin...`);
        return this._getTeam(teamId, this.adminToken);
      }

      throw error;
    }
  }

  // Supprimer une équipe Mattermost
  async _deleteTeam(teamId, token = null) {
    try {
      // Vérifier si l'équipe existe avant d'essayer de la supprimer
      try {
        await this._getTeam(teamId);
      } catch (error) {
        // Si l'équipe n'existe pas déjà, considérer l'opération comme réussie
        if (error.response && error.response.status === 404) {
          logger.warn(`L'équipe ${teamId} n'existe pas, rien à supprimer.`);
          return { success: true, alreadyDeleted: true };
        }
        throw error; // Propager les autres erreurs
      }

      // L'équipe existe, procéder à la suppression
      // Si un token est fourni, l'utiliser, sinon utiliser le token admin
      const authToken = token || this.adminToken;

      const response = await axios.delete(
        `${this.baseUrl}/api/v4/teams/${teamId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      logger.info(`Équipe ${teamId} supprimée avec succès`);
      return response.data || { success: true };
    } catch (error) {
      logger.error(
        `Erreur lors de la suppression de l'équipe Mattermost: ${error.message}`,
      );

      // Si l'erreur est due à un problème d'autorisation, essayer une approche alternative
      if (error.response && error.response.status === 403) {
        logger.warn(
          `Tentative de soft delete pour l'équipe ${teamId} (manque de permissions)`,
        );

        try {
          // Essayer une méthode de "soft delete" en désactivant l'équipe
          const authToken = token || this.adminToken;

          await axios.patch(
            `${this.baseUrl}/api/v4/teams/${teamId}`,
            { allow_open_invite: false, allow_team_listing: false },
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json",
              },
            },
          );

          logger.info(`Équipe ${teamId} désactivée avec succès (soft delete)`);
          return { success: true, softDelete: true };
        } catch (softDeleteError) {
          logger.error(
            `Échec du soft delete de l'équipe ${teamId}:`,
            softDeleteError,
          );

          // Si le soft delete échoue aussi avec le token fourni, essayer avec le token admin
          if (token && token !== this.adminToken) {
            logger.warn(`Tentative de suppression avec token admin...`);
            return this._deleteTeam(teamId, this.adminToken);
          }
        }
      }

      throw error;
    }
  }

  async addUserToChannel(channelId, userId, apiToken) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v4/channels/${channelId}/members`,
        {
          user_id: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      logger.info(`Utilisateur ${userId} ajouté au canal ${channelId}`);
      return response.data;
    } catch (error) {
      logger.error(
        `Erreur lors de l'ajout de l'utilisateur ${userId} au canal ${channelId}:`,
        error,
      );
      throw error;
    }
  }

  // Générer un token API pour un espace client
  async _generateToken(teamId) {
    try {
      logger.info(`Génération d'un token API pour l'équipe ${teamId}`);
      const team = await this._getTeam(teamId);
      // 1. Vérifier si un bot existe déjà pour cette équipe
      const botUsername = `bot-${team.name}`;
      const botEmail = `${botUsername}@mattermost-admin.local`;

      let botUserId;

      // Rechercher si un bot utilisateur existe déjà
      const searchResponse = await axios.post(
        `${this.baseUrl}/api/v4/users/search`,
        { term: botUsername, allow_inactive: true },
        {
          headers: {
            Authorization: `Bearer ${this.adminToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const existingBots = searchResponse.data.filter(
        (user) => user.username === botUsername || user.email === botEmail,
      );

      if (existingBots.length > 0) {
        // Utiliser le bot existant
        botUserId = existingBots[0].id;
        logger.info(`Bot utilisateur existant trouvé: ${botUserId}`);
      } else {
        // Créer un nouveau bot utilisateur
        // Générer un mot de passe aléatoire
        const randomBytes = require("crypto").randomBytes(24);
        const password = randomBytes.toString("hex");

        // Créer le bot en tant qu'utilisateur système
        const newBotResponse = await axios.post(
          `${this.baseUrl}/api/v4/users`,
          {
            username: botUsername,
            email: botEmail,
            password: password,
            auth_service: "",
            props: {
              is_bot: "true",
            },
          },
          {
            headers: {
              Authorization: `Bearer ${this.adminToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        botUserId = newBotResponse.data.id;
        logger.info(`Nouveau bot utilisateur créé: ${botUserId}`);

        // Ajouter le bot à l'équipe
        await axios.post(
          `${this.baseUrl}/api/v4/teams/${teamId}/members`,
          {
            team_id: teamId,
            user_id: botUserId,
          },
          {
            headers: {
              Authorization: `Bearer ${this.adminToken}`,
              "Content-Type": "application/json",
            },
          },
        );
      }

      // 2. Générer directement un token d'accès personnel en utilisant le token admin
      // Cette approche est plus fiable que d'essayer de se connecter en tant que bot
      logger.info(
        `Génération d'un token pour le bot ${botUserId} en utilisant les privilèges admin`,
      );

      const tokenResponse = await axios.post(
        `${this.baseUrl}/api/v4/users/${botUserId}/tokens`,
        {
          description: `API Token for team ${teamId} (admin-generated)`,
        },
        {
          headers: {
            Authorization: `Bearer ${this.adminToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const personalToken = tokenResponse.data.token;
      logger.info(`Token API généré avec succès pour l'équipe ${teamId}`);

      return personalToken;
    } catch (error) {
      logger.error(
        `Erreur lors de la génération du token pour l'équipe ${teamId}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }
  // Méthode pour obtenir les canaux d'une équipe
  async getTeamChannels(teamId) {
    try {
      // Vérifier d'abord si nous avons un espace associé à cette équipe
      const spacesService = this.app.service("/api/mattermost-spaces");
      const spaces = await spacesService.find({
        query: {
          config: { teamId },
        },
        paginate: false,
      });

      // Si nous avons un espace avec un token, utiliser ce token
      if (spaces && spaces.length > 0 && spaces[0].apiToken) {
        return this.getTeamChannelsWithToken(teamId, spaces[0].apiToken);
      }

      // Sinon, utiliser le token admin
      const response = await axios.get(
        `${this.baseUrl}/api/v4/teams/${teamId}/channels`,
        {
          headers: {
            Authorization: `Bearer ${this.adminToken}`,
          },
        },
      );

      logger.debug(`Canaux récupérés pour l'équipe ${teamId} avec token admin`);
      return response.data;
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération des canaux de l'équipe ${teamId}:`,
        {
          message: error.message,
          status: error.response ? error.response.status : "Sans réponse",
        },
      );

      throw error;
    }
  }

  // Méthode pour archiver un canal
  async archiveChannel(channelId) {
    try {
      // Vérifier si le canal existe et récupérer ses informations
      try {
        const channelInfo = await axios.get(
          `${this.baseUrl}/api/v4/channels/${channelId}`,
          {
            headers: {
              Authorization: `Bearer ${this.adminToken}`,
            },
          },
        );

        // Si le canal est déjà archivé, rien à faire
        if (channelInfo.data.delete_at !== 0) {
          logger.info(`Canal ${channelId} déjà archivé.`);
          return {
            success: true,
            channelId,
            alreadyArchived: true,
          };
        }

        // Vérifier si c'est un canal par défaut
        const channelName = channelInfo.data.name;
        if (channelName === "town-square" || channelName === "off-topic") {
          logger.warn(
            `Canal ${channelId} (${channelName}) est un canal par défaut et ne peut pas être archivé.`,
          );
          return {
            success: false,
            channelId,
            isDefaultChannel: true,
            message: "Les canaux par défaut ne peuvent pas être archivés",
          };
        }
      } catch (error) {
        // Si le canal n'existe pas, considérer l'opération comme réussie
        if (error.response && error.response.status === 404) {
          logger.warn(`Canal ${channelId} non trouvé, rien à archiver.`);
          return {
            success: true,
            channelId,
            notFound: true,
          };
        }
        throw error; // Propager les autres erreurs
      }

      // Le canal existe et n'est pas archivé, procéder à l'archivage
      try {
        await axios.delete(`${this.baseUrl}/api/v4/channels/${channelId}`, {
          headers: {
            Authorization: `Bearer ${this.adminToken}`,
          },
        });

        logger.info(`Canal ${channelId} archivé avec succès`);

        return {
          success: true,
          channelId,
        };
      } catch (archiveError) {
        // Si erreur 400, c'est probablement un canal protégé
        if (archiveError.response && archiveError.response.status === 400) {
          logger.warn(
            `Impossible d'archiver le canal ${channelId} (probablement protégé): ${archiveError.message}`,
          );
          return {
            success: false,
            channelId,
            isProtected: true,
            message: "Ce canal ne peut pas être archivé (canal protégé)",
            error: archiveError.message,
          };
        }
        throw archiveError;
      }
    } catch (error) {
      logger.error(`Erreur lors de l'archivage du canal ${channelId}:`, {
        message: error.message,
        status: error.response ? error.response.status : "Sans réponse",
        data: error.response ? error.response.data : null,
      });

      throw error;
    }
  }

  // Ajouter une méthode pour restaurer un canal
  async restoreChannelWithToken(channelId, token) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v4/channels/${channelId}/restore`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      logger.info(`Canal ${channelId} restauré avec succès avec token bot`);

      return {
        success: true,
        channelId,
        channel: response.data,
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la restauration du canal ${channelId} avec token bot:`,
        error,
      );
      throw error;
    }
  }

  // Générer un nom d'équipe (slug) à partir du nom de l'entreprise
  _generateTeamName(companyName) {
    // Créer le nom de base à partir des 9 premiers caractères du nom de l'entreprise
    let name = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-") // Remplacer les caractères non alphanumériques par des tirets
      .replace(/-+/g, "-") // Remplacer plusieurs tirets consécutifs par un seul
      .replace(/^-|-$/g, "") // Supprimer les tirets au début et à la fin
      .substring(0, 9); // Prendre les 9 premiers caractères

    // Générer un nombre aléatoire à 6 chiffres max (0-999999)
    const randomSuffix = Math.floor(Math.random() * 1000000);

    // Concaténer le nom de base et le suffixe
    name = `${name}-${randomSuffix}`;

    // S'assurer que le nom final ne dépasse pas 15 caractères (limite de Mattermost)
    if (name.length > 15) {
      name = name.substring(0, 15);
    }

    // Si le nom commence par un chiffre, ajouter un préfixe 't-'
    if (/^[0-9]/.test(name)) {
      name = "t-" + name.substring(0, 13); // Garder dans la limite de 15 caractères
    }

    // Assurer une longueur minimale de 2 caractères
    if (name.length < 2) {
      name = "team-" + Math.floor(Math.random() * 1000);
    }

    logger.debug("Nom d'équipe généré:", name);
    return name;
  }
  // Voici les méthodes à ajouter au fichier mattermost-integration.js

  // Méthode pour obtenir les canaux d'une équipe avec le token du bot
  async getTeamChannelsWithToken(teamId, token, options = {}) {
    try {
      const { includeDeleted = false } = options;

      // URL de base pour récupérer les canaux
      let url = `${this.baseUrl}/api/v4/teams/${teamId}/channels`;

      // Si on veut inclure les canaux supprimés, on utilise une autre méthode API
      if (includeDeleted) {
        url = `${this.baseUrl}/api/v4/teams/${teamId}/channels/deleted`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Si on a demandé les canaux archivés, les ajouter aux canaux actifs
      let allChannels = response.data;

      if (includeDeleted) {
        // Marquer ces canaux comme archivés
        allChannels = allChannels.map((channel) => ({
          ...channel,
          isArchived: true,
        }));

        // Récupérer aussi les canaux actifs pour avoir une liste complète
        const activeChannels = await this.getTeamChannelsWithToken(
          teamId,
          token,
          { includeDeleted: false },
        );
        allChannels = [...activeChannels, ...allChannels];
      }

      return allChannels;
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération des canaux de l'équipe ${teamId} avec token bot:`,
        error,
      );
      throw error;
    }
  }

  // Méthode pour créer un canal avec le token du bot
  async createChannelWithToken(channelData, token) {
    // Nettoyer les données du canal
    const cleanChannelData = { ...channelData };
    if (cleanChannelData.id) {
      logger.warn("ID détecté dans les données de channel - suppression");
      delete cleanChannelData.id;
    }

    // Ajouter un suffixe unique au nom du canal si nécessaire
    const originalName = cleanChannelData.name;
    if (!cleanChannelData.name.includes("-unique-")) {
      const uniqueSuffix = `-unique-${Date.now().toString().slice(-6)}`;
      cleanChannelData.name = `${originalName}${uniqueSuffix}`.substring(0, 22); // Limiter à 22 caractères (limite Mattermost)
    }

    logger.debug(
      "Tentative de création de channel Mattermost avec token bot:",
      {
        baseUrl: this.baseUrl,
        channelData: cleanChannelData,
      },
    );

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v4/channels`,
        cleanChannelData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Erreur lors de la création du canal Mattermost avec token bot:",
        {
          message: error.message,
          status: error.response ? error.response.status : "Sans réponse",
          data: error.response ? error.response.data : "Pas de données",
          url: `${this.baseUrl}/api/v4/channels`,
        },
      );

      // Si le canal existe déjà, générer un nouveau nom et réessayer
      if (
        error.response &&
        error.response.data &&
        error.response.data.id ===
          "store.sql_channel.save_channel.exists.app_error"
      ) {
        logger.info(
          `Le canal ${cleanChannelData.name} existe déjà, génération d'un nouveau nom...`,
        );

        // Générer un nouveau nom avec un suffixe différent
        const newUniqueSuffix = `-unique-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        cleanChannelData.name = `${originalName}${newUniqueSuffix}`.substring(
          0,
          22,
        );

        logger.info(
          `Nouvel essai avec le nom de canal: ${cleanChannelData.name}`,
        );

        // Réessayer avec le nouveau nom
        return this.createChannelWithToken(cleanChannelData, token);
      }

      throw error;
    }
  }

  // Méthode pour mettre à jour un canal avec le token du bot
  async updateChannelWithToken(channelId, channelData, token) {
    try {
      const response = await axios.put(
        `${this.baseUrl}/api/v4/channels/${channelId}/patch`,
        channelData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      logger.info(`Canal ${channelId} mis à jour avec succès avec token bot`);

      return response.data;
    } catch (error) {
      logger.error(
        `Erreur lors de la mise à jour du canal ${channelId} avec token bot:`,
        {
          message: error.message,
          status: error.response ? error.response.status : "Sans réponse",
        },
      );

      throw error;
    }
  }

  // Méthode pour archiver un canal avec le token du bot
  async archiveChannelWithToken(channelId, token) {
    try {
      // Vérifier si le canal existe et récupérer ses informations
      try {
        const channelInfo = await axios.get(
          `${this.baseUrl}/api/v4/channels/${channelId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        // Si le canal est déjà archivé, rien à faire
        if (channelInfo.data.delete_at !== 0) {
          logger.info(`Canal ${channelId} déjà archivé.`);
          return {
            success: true,
            channelId,
            alreadyArchived: true,
          };
        }

        // Vérifier si c'est un canal par défaut
        const channelName = channelInfo.data.name;
        if (channelName === "town-square" || channelName === "off-topic") {
          logger.warn(
            `Canal ${channelId} (${channelName}) est un canal par défaut et ne peut pas être archivé.`,
          );
          return {
            success: false,
            channelId,
            isDefaultChannel: true,
            message: "Les canaux par défaut ne peuvent pas être archivés",
          };
        }
      } catch (error) {
        // Si le canal n'existe pas, considérer l'opération comme réussie
        if (error.response && error.response.status === 404) {
          logger.warn(`Canal ${channelId} non trouvé, rien à archiver.`);
          return {
            success: true,
            channelId,
            notFound: true,
          };
        }
        throw error; // Propager les autres erreurs
      }

      // Le canal existe et n'est pas archivé, procéder à l'archivage
      try {
        await axios.delete(`${this.baseUrl}/api/v4/channels/${channelId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        logger.info(`Canal ${channelId} archivé avec succès avec token bot`);

        return {
          success: true,
          channelId,
        };
      } catch (archiveError) {
        // Si erreur 400, c'est probablement un canal protégé
        if (archiveError.response && archiveError.response.status === 400) {
          logger.warn(
            `Impossible d'archiver le canal ${channelId} (probablement protégé): ${archiveError.message}`,
          );
          return {
            success: false,
            channelId,
            isProtected: true,
            message: "Ce canal ne peut pas être archivé (canal protégé)",
            error: archiveError.message,
          };
        }
        throw archiveError;
      }
    } catch (error) {
      logger.error(
        `Erreur lors de l'archivage du canal ${channelId} avec token bot:`,
        {
          message: error.message,
          status: error.response ? error.response.status : "Sans réponse",
          data: error.response ? error.response.data : null,
        },
      );

      throw error;
    }
  }

  // Méthode pour obtenir les informations d'un utilisateur avec token du bot
  async _getUserInfoWithToken(userId, token) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v4/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération des informations de l'utilisateur ${userId} avec token bot:`,
        error,
      );
      return {
        id: userId,
        username: "Inconnu",
        email: "Inconnu",
        first_name: "Inconnu",
        last_name: "Inconnu",
      };
    }
  }

  // Méthode pour obtenir les membres d'une équipe avec token du bot
  async getTeamMembersWithToken(teamId, token) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v4/teams/${teamId}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            per_page: 200,
          },
        },
      );

      // Récupérer les détails des utilisateurs avec le token du bot
      const userIds = response.data.map((member) => member.user_id);
      const userDetails = await Promise.all(
        userIds.map((userId) => this._getUserInfoWithToken(userId, token)),
      );

      // Combiner les informations
      return response.data.map((member, index) => {
        const user = userDetails[index];
        const userRoles = user.roles || "";
        const memberRoles = member.roles || "";
        const combinedRolesSet = new Set([
          ...userRoles.split(" ").filter((r) => r),
          ...memberRoles.split(" ").filter((r) => r),
        ]);
        const combinedRoles = Array.from(combinedRolesSet).join(" ");

        return {
          ...user,
          ...member,
          roles: combinedRoles,
        };
      });
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération des membres de l'équipe ${teamId} avec token bot:`,
        {
          message: error.message,
          status: error.response ? error.response.status : "Sans réponse",
        },
      );
      throw error;
    }
  }

  // Méthode pour mettre à jour le rôle d'un utilisateur avec token du bot
  async updateUserRoleWithToken(teamId, userId, isAdmin, token) {
    try {
      // Récupérer les détails actuels du membre
      const memberResponse = await axios.get(
        `${this.baseUrl}/api/v4/teams/${teamId}/members/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const currentRoles = memberResponse.data.roles;

      // Mettre à jour les rôles du membre
      await axios.put(
        `${this.baseUrl}/api/v4/teams/${teamId}/members/${userId}/schemeRoles`,
        {
          scheme_admin: isAdmin,
          scheme_user: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      // Déterminer les nouveaux rôles
      let newRoles;
      if (isAdmin) {
        newRoles = currentRoles.includes("team_admin")
          ? currentRoles
          : `${currentRoles} team_admin`.trim();
      } else {
        newRoles = currentRoles.replace("team_admin", "").trim();
      }

      logger.info(
        `Rôle mis à jour pour l'utilisateur ${userId} dans l'équipe ${teamId}, isAdmin: ${isAdmin} (avec token bot)`,
      );

      return {
        teamId,
        userId,
        isAdmin,
        roles: newRoles,
      };
    } catch (error) {
      logger.error(`Erreur lors de la mise à jour du rôle avec token bot:`, {
        message: error.message,
        status: error.response ? error.response.status : "Sans réponse",
      });
      throw error;
    }
  }

  // Méthode pour supprimer un utilisateur d'une équipe avec token du bot
  async removeUserFromTeamWithToken(teamId, userId, token) {
    try {
      // Vérifier si l'utilisateur est le bot administrateur
      const teamMembers = await this.getTeamMembersWithToken(teamId, token);
      const targetMember = teamMembers.find(
        (member) => member.user_id === userId,
      );

      // Vérifier si c'est un bot et s'il est administrateur de l'équipe
      if (
        targetMember &&
        targetMember.props &&
        targetMember.props.is_bot === "true" &&
        targetMember.roles &&
        targetMember.roles.includes("team_admin")
      ) {
        throw new Error(
          "Impossible de supprimer le bot administrateur de l'équipe",
        );
      }

      // Si ce n'est pas le bot, procéder à la suppression
      await axios.delete(
        `${this.baseUrl}/api/v4/teams/${teamId}/members/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      logger.info(
        `Utilisateur ${userId} supprimé de l'équipe ${teamId} avec token bot`,
      );

      return {
        success: true,
      };
    } catch (error) {
      logger.error(
        `Erreur lors de la suppression de l'utilisateur avec token bot:`,
        {
          message: error.message,
          status: error.response ? error.response.status : "Sans réponse",
        },
      );
      throw error;
    }
  }

  // Méthode pour vérifier si un utilisateur est membre d'une équipe avec token bot
  async _checkTeamMembershipWithToken(teamId, userId, token) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v4/teams/${teamId}/members/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      // Propager l'erreur pour que l'appelant puisse vérifier le statut 404
      throw error;
    }
  }

  // Méthode pour ajouter un utilisateur à une équipe avec token bot
  async _addUserToTeamWithToken(teamId, userId, token) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v4/teams/${teamId}/members`,
        {
          team_id: teamId,
          user_id: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      return response.data;
    } catch (error) {
      logger.error(
        `Erreur lors de l'ajout de l'utilisateur à l'équipe avec token bot:`,
        error,
      );
      throw error;
    }
  }

  // Méthode pour régénérer l'ID d'invitation d'une équipe avec token bot
  async _regenerateTeamInviteIdWithToken(teamId, token) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v4/teams/${teamId}/regenerate_invite_id`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      return response.data.invite_id;
    } catch (error) {
      logger.error(
        `Erreur lors de la régénération de l'ID d'invitation avec token bot:`,
        error,
      );
      throw error;
    }
  }
}

module.exports = function (app) {
  // Ajouter l'instance du service à l'application
  const service = new MattermostIntegration(app);
  app.set("mattermostIntegration", service);
  return service;
};
