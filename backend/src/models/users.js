const { Model } = require("objection");

class User extends Model {
  static get tableName() {
    return "users";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["email", "password"],
      properties: {
        id: { type: "integer" },
        email: { type: "string", format: "email" },
        password: { type: "string" },
        firstName: { type: "string", minLength: 1, maxLength: 255 },
        lastName: { type: "string", minLength: 1, maxLength: 255 },
        companyName: { type: "string", minLength: 1, maxLength: 255 },
        isAdmin: { type: "boolean" },
        mattermost: { type: "object" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
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

  return User;
};
