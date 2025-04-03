const { authenticate } = require("@feathersjs/authentication").hooks;
const { hashPassword, protect } =
  require("@feathersjs/authentication-local").hooks;
const logger = require("../../logger");

function generateMattermostUsername(userData) {
  const baseUsername = `${userData.firstName.toLowerCase()}${userData.lastName.toLowerCase()}`;
  return `${baseUsername}-${Date.now()}`.substring(0, 22);
}

const syncMattermostUser = async (context) => {
  if (context.type !== "before" || context.method !== "create") {
    return context;
  }

  try {
    const { app, data: user } = context;
    // Synchronisation Mattermost
    const mattermostIntegration = app.get("mattermostIntegration");

    // Rechercher un utilisateur Mattermost existant
    const existingMattermostUser =
      await mattermostIntegration._searchUserByEmail(user.email);
    if (!existingMattermostUser || existingMattermostUser.length === 0) {
      await mattermostIntegration.createUser({
        email: user.email,
        username: generateMattermostUsername(user),
        password: user.password,
        first_name: user.firstName,
        last_name: user.lastName,
      });
    }
  } catch (error) {
    logger.error("Erreur lors de la synchronisation Mattermost", error);
  }

  return context;
};

// Hook pour créer un espace Mattermost par défaut pour un nouvel utilisateur
const createDefaultSpace = async (context) => {
  if (!context.result || context.type !== "after") {
    return context;
  }

  try {
    const { app, result: user } = context;

    // Vérifier si l'utilisateur a déjà un espace
    const spacesService = app.service("/api/mattermost-spaces");
    const existingSpaces = await spacesService.find({
      query: {
        userId: user.id,
      },
      paginate: false,
    });

    if (existingSpaces.length === 0) {
      // Créer un espace par défaut
      await spacesService.create(
        {
          userId: user.id,
          name: `Espace de ${user.companyName || "Mon organisation"}`,
        },
        {
          user: user, // Passer l'utilisateur dans les params pour les autorisations
          provider: null, // Indiquer que c'est un appel interne
        },
      );
    }
  } catch (error) {
    logger.error("Erreur lors de la création de l'espace par défaut", error);
    // Ne pas échouer la création de l'utilisateur si la création de l'espace échoue
  }

  return context;
};

const getCurrentUser = async (context) => {
  // Si l'ID n'est pas 'current', continuer normalement
  if (context.id !== "current") {
    return context;
  }

  // Récupérer l'utilisateur à partir du contexte d'authentification
  const { user } = context.params;
  if (!user) {
    throw new Error("Non authentifié");
  }

  // Remplacer l'ID 'current' par l'ID réel de l'utilisateur
  context.id = user.id;

  return context;
};

const verifyOldPassword = async (context) => {
  // Ne s'applique que si on modifie le mot de passe et qu'un oldPassword est fourni
  if (!context.data.password || !context.data.oldPassword) {
    return context;
  }

  try {
    // Récupérer les informations complètes de l'utilisateur (y compris le hash du mot de passe)
    const { app, id, params } = context;
    // Vérifier que l'utilisateur agit sur son propre compte ou est admin
    if (!id || !params.user.id) {
      throw new Error("Non autorisé à modifier ce compte");
    }
    if (Number(id) !== Number(params.user.id) && !params.user.isAdmin) {
      throw new Error("Non autorisé à modifier ce compte");
    }

    // Récupérer l'utilisateur complet (avec mot de passe hashé)
    const userService = app.service("/api/users");
    const user = await userService.get(id, {
      query: {}, // Vider les filtres
      provider: undefined, // Indiquer que c'est un appel interne
    });

    // Utiliser le service d'authentification pour vérifier le mot de passe
    const authService = app.service("/api/authentication");
    const authResult = await authService.strategies["local"].authenticate(
      {
        email: user.email,
        password: context.data.oldPassword,
      },
      params,
    );

    if (!authResult) {
      throw new Error("Mot de passe actuel incorrect");
    }

    // Supprimer l'ancien mot de passe des données
    delete context.data.oldPassword;

    return context;
  } catch (error) {
    logger.error("Erreur lors de la vérification du mot de passe", error);
    throw error;
  }
};

module.exports = {
  before: {
    all: [],
    find: [authenticate("jwt")],
    get: [authenticate("jwt"), getCurrentUser],
    create: [syncMattermostUser, hashPassword("password")],
    update: [hashPassword("password"), authenticate("jwt"), verifyOldPassword],
    patch: [hashPassword("password"), authenticate("jwt"), verifyOldPassword],
    remove: [authenticate("jwt")],
  },

  after: {
    all: [
      // Protège les données sensibles des utilisateurs
      protect("password"),
    ],
    find: [],
    get: [],
    create: [createDefaultSpace],
    update: [],
    patch: [],
    remove: [],
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },
};
