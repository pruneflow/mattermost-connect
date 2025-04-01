const knex = require("knex");
const { Model } = require("objection");

module.exports = function (app) {
  const { client, connection } = app.get("postgres");
  const db = knex({ client, connection });

  // Initialise Objection.js avec Knex
  Model.knex(db);

  app.set("knexClient", db);

  // Charger tous les modèles
  require("./users")(app);
  require("./mattermost-spaces")(app);
};
