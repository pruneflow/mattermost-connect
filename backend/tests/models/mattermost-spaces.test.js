const { Model } = require("objection");
const createMattermostSpaceModel = require("../../src/models/mattermost-spaces");

// Mock pour objection Model
jest.mock("objection", () => {
  return {
    Model: class MockModel {
      static get tableName() {
        return "mattermost_spaces";
      }
      static get relationMappings() {
        return {};
      }
      $beforeInsert() {}
      $beforeUpdate() {}
    },
  };
});

describe("MattermostSpace Model", () => {
  let MattermostSpace;
  let app;

  beforeEach(() => {
    // Mock de l'app
    app = {
      get: jest.fn(),
    };

    // Créer le modèle MattermostSpace
    MattermostSpace = createMattermostSpaceModel(app);
  });

  test("devrait définir correctement le nom de la table", () => {
    expect(MattermostSpace.tableName).toBe("mattermost_spaces");
  });

  test("devrait définir un schéma JSON valide", () => {
    const schema = MattermostSpace.jsonSchema;

    // Vérifier que le schéma existe
    expect(schema).toBeDefined();

    // Vérifier les propriétés requises
    expect(schema.required).toContain("userId");
    expect(schema.required).toContain("name");

    // Vérifier les propriétés
    expect(schema.properties.userId.type).toBe("integer");
    expect(schema.properties.name.type).toBe("string");
    expect(schema.properties.apiToken.type).toContain("string");
    expect(schema.properties.isActive.type).toBe("boolean");
  });

  test("devrait définir les relations correctement", () => {
    // Mock du modèle User
    jest.mock("../../src/models/users", () => "UserModel");

    const relationMappings = MattermostSpace.relationMappings;

    // Vérifier la relation avec l'utilisateur
    expect(relationMappings.user).toBeDefined();
    expect(relationMappings.user.relation).toBe(Model.BelongsToOneRelation);
    expect(relationMappings.user.join.from).toBe("mattermost_spaces.userId");
    expect(relationMappings.user.join.to).toBe("users.id");
  });

  test("devrait mettre à jour les timestamps avant l'insertion", () => {
    // Capturer la date actuelle
    const now = new Date();
    const realDate = Date;
    global.Date = class extends Date {
      constructor() {
        super();
        return now;
      }
      static now() {
        return now.getTime();
      }
    };

    // Instance de test
    const space = new MattermostSpace();
    space.$beforeInsert();

    // Restaurer Date
    global.Date = realDate;

    // Vérifier les timestamps
    expect(space.createdAt).toBe(now.toISOString());
    expect(space.updatedAt).toBe(now.toISOString());
  });

  test("devrait mettre à jour le timestamp updatedAt avant la mise à jour", () => {
    // Capturer la date actuelle
    const now = new Date();
    const realDate = Date;
    global.Date = class extends Date {
      constructor() {
        super();
        return now;
      }
      static now() {
        return now.getTime();
      }
    };

    // Instance de test
    const space = new MattermostSpace();
    space.$beforeUpdate();

    // Restaurer Date
    global.Date = realDate;

    // Vérifier le timestamp
    expect(space.updatedAt).toBe(now.toISOString());
  });
});
