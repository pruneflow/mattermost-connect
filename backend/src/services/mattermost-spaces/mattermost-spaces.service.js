const { MattermostSpaces } = require("./mattermost-spaces.class");
const createModel = require("../../models/mattermost-spaces");
const hooks = require("./mattermost-spaces.hooks");

module.exports = function (app) {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
    multi: ["patch"], // Activer les opérations de patch en masse
  };

  // Initialiser le service
  app.use("/api/mattermost-spaces", new MattermostSpaces(options));

  // Enregistrer les hooks
  const service = app.service("api/mattermost-spaces");

  // Configurer les hooks
  service.hooks(hooks);
};
