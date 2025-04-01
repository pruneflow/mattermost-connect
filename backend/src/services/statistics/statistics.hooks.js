// src/services/statistics/statistics.hooks.js
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
        logger.error("Erreur dans le service de statistiques:", context.error);
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
