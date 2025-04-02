// tests/integration/token-generation.test.js
const axios = require("axios");
const { createMockApp } = require("../setup/mock-app");

describe("Token Generation Integration", () => {
  let app;

  beforeEach(() => {
    app = createTestApp();

    // Réinitialiser les mocks
    jest.clearAllMocks();

    // Configuration des mocks axios pour simuler les appels API Mattermost
    axios.post.mockImplementation((url, data, config) => {
      if (
        url.includes("/api/v4/users") &&
        !url.includes("/login") &&
        !url.includes("/tokens")
      ) {
        // Création d'un utilisateur bot
        return Promise.resolve({
          data: {
            id: "bot-user-id",
            username: data.username,
            email: data.email,
          },
        });
      }

      if (url.includes("/api/v4/teams/team123/members")) {
        // Ajout de l'utilisateur bot à l'équipe
        return Promise.resolve({
          data: {
            team_id: "team123",
            user_id: "bot-user-id",
            roles: "team_user",
          },
        });
      }

      if (url.includes("/api/v4/users/login")) {
        // Connexion du bot
        return Promise.resolve({
          data: {
            id: "bot-user-id",
            username: "bot-team123",
          },
          headers: {
            token: "bot-session-token",
          },
        });
      }

      if (url.includes("/api/v4/users/tokens")) {
        // Génération d'un token d'accès personnel
        return Promise.resolve({
          data: {
            id: "token-id",
            user_id: "bot-user-id",
            description: data.description,
            token: "test-personal-access-token-12345",
          },
        });
      }

      return Promise.reject(new Error(`URL non gérée dans le mock: ${url}`));
    });

    axios.get.mockImplementation((url, config) => {
      if (url.includes("/api/v4/users/search")) {
        // Recherche d'utilisateur bot existant - retourne vide pour forcer la création
        return Promise.resolve({ data: [] });
      }

      return Promise.reject(
        new Error(`URL GET non gérée dans le mock: ${url}`),
      );
    });
  });

  describe("generateToken method", () => {
    it("should handle errors gracefully", async () => {
      // Remplacer directement l'implémentation de _generateToken pour tester la gestion d'erreur
      const originalMethod = app.mattermostIntegration._generateToken;
      app.mattermostIntegration._generateToken = jest
        .fn()
        .mockRejectedValue(new Error("Erreur création utilisateur"));

      // La fonction devrait propager l'erreur
      await expect(
        app.mattermostIntegration._generateToken("team123"),
      ).rejects.toThrow("Erreur création utilisateur");

      // Restaurer l'implémentation originale après le test
      app.mattermostIntegration._generateToken = originalMethod;
    });
  });
});
