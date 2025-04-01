// tests/setup/setupTests.js
const { createMockApp } = require("./mock-app");

// Définir un mock global pour l'app qui peut être utilisé dans tous les tests
global.mockApp = createMockApp();

// Définir une fonction pour créer un nouvel app mock
global.createTestApp = createMockApp;

// Réinitialiser les mocks avant chaque test
beforeEach(() => {
  jest.clearAllMocks();
});

// Configuration de mocks pour le localStorage et autres APIs du navigateur
if (typeof TextEncoder === "undefined") {
  global.TextEncoder = require("util").TextEncoder;
  global.TextDecoder = require("util").TextDecoder;
}

// Mock pour objection Model si nécessaire
jest.mock("objection", () => {
  return {
    Model: class MockModel {
      static get tableName() {
        return "mock_table";
      }
      static get relationMappings() {
        return {};
      }
      $beforeInsert() {}
      $beforeUpdate() {}
    },
    QueryBuilder: class MockQueryBuilder {},
    raw: jest.fn(),
  };
});
