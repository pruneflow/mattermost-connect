const { authenticate } = require("@feathersjs/authentication").hooks;
const { iff, isProvider, preventChanges } = require("feathers-hooks-common");
const utils = require("./mattermost-spaces.utils");
const { syncUserToMattermostSpace } = require("./mattermost-spaces.utils");

module.exports = {
  before: {
    all: [authenticate("jwt")],
    find: [],
    get: [],
    create: [utils.createMattermostSpace],
    update: [
      // Utiliser directement la fonction de vérification des permissions
      iff(isProvider("external"), utils.checkUpdatePermission),
      // Puis utiliser preventChanges comme un hook séparé
      preventChanges("userId"),
    ],
    patch: [
      // Utiliser directement la fonction de vérification des permissions
      iff(isProvider("external"), utils.checkUpdatePermission),
      // Puis utiliser preventChanges comme un hook séparé
      preventChanges("userId"),
    ],
    remove: [iff(isProvider("external"), utils.checkRemovePermission)],
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [
      async (context) => {
        if (context.result) {
          const userService = context.app.service("/api/users");
          const user = await userService.get(context.result.userId);

          // Synchroniser l'utilisateur avec l'espace Mattermost
          await syncUserToMattermostSpace(context.app, context.result, user);
        }
        return context;
      },
    ],
    update: [],
    patch: [],
    remove: [utils.deleteMattermostSpace],
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
