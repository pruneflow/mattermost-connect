// src/services/tokens/tokens.service.js
const { Tokens } = require("./tokens.class");
const hooks = require("./tokens.hooks");

module.exports = function (app) {
  const options = {
    app,
  };

  // Initialiser le service avec notre classe
  app.use("/api/tokens", new Tokens(options));

  // Obtenir une référence au service
  const service = app.service("api/tokens");

  // Configurer les hooks
  service.hooks(hooks);

  return service;
};
