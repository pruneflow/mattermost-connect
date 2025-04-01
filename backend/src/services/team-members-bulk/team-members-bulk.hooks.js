// src/services/team-members/team-members.hooks.js
const { authenticate } = require("@feathersjs/authentication").hooks;
const logger = require("../../logger");

module.exports = {
  before: {
    all: [authenticate("jwt")],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },

  error: {
    all: [
      (context) => {
        logger.error(
          "Erreur dans le service de membres d'équipe groupés:",
          context.error,
        );
      },
    ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },
};
