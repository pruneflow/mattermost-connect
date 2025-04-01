// backend jest.config.js
module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup/setupTests.js"],
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  collectCoverageFrom: ["src/**/*.js", "!src/public/**", "!**/node_modules/**"],
  coverageDirectory: "coverage",
  // Timeouts allongés pour tester l'intégration Mattermost
  testTimeout: 10000,
  // Ignorer certains dossiers pour les tests
  testPathIgnorePatterns: ["/node_modules/", "/config/", "/public/"],
  // Mock automatique pour certaines dépendances
  moduleNameMapper: {
    "^@feathersjs/configuration$":
      "<rootDir>/tests/mocks/feathers-config.mock.js",
  },
};
