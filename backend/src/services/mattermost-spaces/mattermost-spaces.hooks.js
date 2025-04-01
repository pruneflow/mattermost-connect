const { authenticate } = require("@feathersjs/authentication").hooks;
const { iff, isProvider, preventChanges } = require("feathers-hooks-common");
const utils = require("./mattermost-spaces.utils");

// Au lieu de définir restrictUserId comme ceci
// const restrictUserId = preventChanges("userId");

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
    create: [],
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
