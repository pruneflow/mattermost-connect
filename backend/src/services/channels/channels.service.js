// src/services/channels/channels.service.js
const { Channels } = require("./channels.class");
const hooks = require("./channels.hooks");

module.exports = function (app) {
  const options = {
    app,
  };

  // Initialiser le service
  const channelsService = new Channels(options);
  app.use("/api/channels", channelsService);

  // Service pour la restauration des canaux
  app.use("/api/channels/:id/restore", {
    create: async (data, params) => {
      const { spaceId } = data;
      const { id } = params.route || params.path || {};
      // Utiliser directement la méthode restoreChannel existante
      return channelsService.restoreChannel(id, {
        ...params,
        query: { spaceId },
      });
    },
  });

  // Obtenir une référence au service
  const service = app.service("api/channels");

  // Configurer les hooks
  service.hooks(hooks);

  // Configurer les hooks pour le service de restauration
  app.service("api/channels/:id/restore").hooks({
    before: {
      create: hooks.before.all,
    },
    after: {
      create: hooks.after.all,
    },
    error: {
      create: hooks.error.all,
    },
  });

  return service;
};
