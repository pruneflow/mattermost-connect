// src/services/team-members/team-members.service.js
const { TeamMembers } = require("./team-members.class");
const hooks = require("./team-members.hooks");

module.exports = function (app) {
  const options = {
    app,
  };

  // Initialiser le service
  app.use("/api/team-members", new TeamMembers(options));

  // Obtenir une référence au service
  const service = app.service("api/team-members");

  // Configurer les hooks
  service.hooks(hooks);

  return service;
};
