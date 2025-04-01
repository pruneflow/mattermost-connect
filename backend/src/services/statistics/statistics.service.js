// src/services/statistics/statistics.service.js
const { Statistics } = require("./statistics.class");
const hooks = require("./statistics.hooks");

module.exports = function (app) {
  const options = {
    app,
  };

  // Initialiser le service avec notre classe
  app.use("/api/statistics", new Statistics(options));

  // Obtenir une référence au service
  const service = app.service("api/statistics");

  // Configurer les hooks
  service.hooks(hooks);

  return service;
};
