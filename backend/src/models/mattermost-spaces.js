const { Model } = require("objection");

class MattermostSpace extends Model {
  static get tableName() {
    return "mattermost_spaces";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["userId", "name"],
      properties: {
        id: { type: "integer" },
        userId: { type: "integer" },
        name: { type: "string", minLength: 1, maxLength: 255 },
        apiToken: { type: ["string", "null"], maxLength: 255 },
        webhookUrl: { type: ["string", "null"], maxLength: 255 },
        config: { type: ["object", "null"] },
        isActive: { type: "boolean" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    };
  }

  // Relation avec le modèle utilisateur
  static get relationMappings() {
    const User = require("./users");

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "mattermost_spaces.userId",
          to: "users.id",
        },
      },
    };
  }

  $beforeInsert() {
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString();
  }
}

module.exports = function (app) {
  // Nous n'avons plus besoin d'initialiser Model.knex() ici
  // car c'est fait de manière centralisée dans knex.js

  return MattermostSpace;
};
