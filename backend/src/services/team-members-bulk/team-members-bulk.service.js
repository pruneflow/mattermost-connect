// src/services/team-members/team-members.service.js
const { BulkInviteService } = require("./team-members-bulk.class");
const hooks = require("./team-members-bulk.hooks");

module.exports = function (app) {
  const options = {
    app,
  };

  // Initialiser le service
  app.use("/api/team-members-bulk", new BulkInviteService(options));

  // Obtenir une référence au service
  const service = app.service("api/team-members-bulk");

  // Configurer les hooks
  service.hooks(hooks);

  return service;
};
