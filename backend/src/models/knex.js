const knex = require("knex");
const { Model } = require("objection");
const logger = require("../logger");

module.exports = function (app) {
  // Récupérer la configuration PostgreSQL
  let pgConfig = app.get("postgres");

  // Vérifier et mettre à jour la configuration si nécessaire
  if (pgConfig.client === "DB_CLIENT" && process.env.DB_CLIENT) {
    pgConfig.client = process.env.DB_CLIENT;
  }

  if (pgConfig.connection) {
    const conn = pgConfig.connection;

    if (conn.host === "DB_HOST" && process.env.DB_HOST) {
      conn.host = process.env.DB_HOST;
    }
    if (conn.user === "DB_USER" && process.env.DB_USER) {
      conn.user = process.env.DB_USER;
    }
    if (conn.password === "DB_PASSWORD" && process.env.DB_PASSWORD) {
      conn.password = process.env.DB_PASSWORD;
    }
    if (conn.database === "DB_DATABASE" && process.env.DB_DATABASE) {
      conn.database = process.env.DB_DATABASE;
    }
  }

  try {
    // Initialiser Knex avec la configuration
    const db = knex({
      client: pgConfig.client,
      connection: pgConfig.connection,
      pool: {
        min: 2,
        max: 10,
      },
    });

    // Initialise Objection.js avec Knex
    Model.knex(db);

    app.set("knexClient", db);

    logger.info(
      `Base de données ${pgConfig.connection.database} connectée avec succès`,
    );

    // Charger tous les modèles
    require("./users")(app);
    require("./mattermost-spaces")(app);
  } catch (error) {
    logger.error("Erreur lors de la connexion à la base de données:", error);
    throw error; // Propager l'erreur pour que l'application s'arrête si la BD n'est pas accessible
  }
};
