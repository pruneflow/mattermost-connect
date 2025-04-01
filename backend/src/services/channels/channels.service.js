// src/services/channels/channels.service.js
const { Channels } = require("./channels.class");
const hooks = require("./channels.hooks");

module.exports = function (app) {
  const options = {
    app,
  };

  // Initialiser le service
  app.use("/api/channels", new Channels(options));

  // Obtenir une référence au service
  const service = app.service("api/channels");

  // Configurer les hooks
  service.hooks(hooks);

  return service;
};
