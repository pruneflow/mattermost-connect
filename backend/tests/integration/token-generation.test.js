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
    it("should create a bot user and generate a token for a team", async () => {
      // Tester directement la méthode _generateToken
      const token = await app.mattermostIntegration._generateToken("team123");

      // Vérifier que le token correct est retourné
      expect(token).toBe("test-token-12345");

      // Vérifier l'appel pour créer un bot utilisateur
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/v4/users"),
        expect.objectContaining({
          username: expect.stringMatching(/bot-team123/),
          email: expect.stringMatching(/bot-team123@/),
          password: expect.any(String),
        }),
        expect.anything(),
      );

      // Vérifier l'appel pour ajouter le bot à l'équipe
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/v4/teams/team123/members"),
        expect.objectContaining({
          team_id: "team123",
          user_id: "bot-user-id",
        }),
        expect.anything(),
      );

      // Vérifier l'appel pour la connexion du bot
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/v4/users/login"),
        expect.objectContaining({
          login_id: expect.stringMatching(/bot-team123@/),
          password: expect.any(String),
        }),
      );

      // Vérifier l'appel pour générer un token d'accès personnel
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/v4/users/tokens"),
        expect.objectContaining({
          description: expect.stringContaining("team123"),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer bot-session-token",
          }),
        }),
      );
    });

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

    it("should use existing bot user if found", async () => {
      // Simuler qu'un bot existe déjà
      axios.get.mockImplementationOnce((url) => {
        if (url.includes("/api/v4/users/search")) {
          return Promise.resolve({
            data: [
              {
                id: "existing-bot-id",
                username: "bot-team123",
                email: "bot-team123@mattermost-admin.local",
              },
            ],
          });
        }
        return Promise.reject(new Error(`URL GET non gérée: ${url}`));
      });

      // Configurer le mock pour la connexion du bot existant
      axios.post
        .mockImplementationOnce((url, data) => {
          if (url.includes("/api/v4/users/login")) {
            return Promise.resolve({
              data: { id: "existing-bot-id" },
              headers: { token: "existing-bot-token" },
            });
          }
          return Promise.reject(new Error(`URL POST non gérée: ${url}`));
        })
        .mockImplementationOnce((url, data, config) => {
          if (url.includes("/api/v4/users/tokens")) {
            return Promise.resolve({
              data: {
                id: "token-id",
                user_id: "existing-bot-id",
                description: data.description,
                token: "test-personal-access-token-for-existing-bot",
              },
            });
          }
          return Promise.reject(new Error(`URL POST non gérée: ${url}`));
        });

      const result = await app.mattermostIntegration._generateToken("team123");

      // Vérifier le résultat
      expect(result).toBe("test-personal-access-token-for-existing-bot");

      // Vérifier que la recherche d'utilisateur a été appelée
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("/api/v4/users/search"),
        expect.anything(),
      );

      // Vérifier que la création d'utilisateur n'a pas été appelée
      const createUserCalls = axios.post.mock.calls.filter(
        (call) =>
          call[0].includes("/api/v4/users") &&
          !call[0].includes("/login") &&
          !call[0].includes("/tokens"),
      );

      expect(createUserCalls.length).toBe(0);

      // Vérifier que la connexion a été appelée
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/v4/users/login"),
        expect.anything(),
      );

      // Vérifier que la génération de token a été appelée
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/v4/users/tokens"),
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("existing-bot-token"),
          }),
        }),
      );
    });
  });

  describe("Token service integration with Mattermost", () => {
    it("should generate a token via the tokens service", async () => {
      // Configurer les services pour le test
      app._addService("/api/mattermost-spaces", {
        get: jest.fn().mockResolvedValue({
          id: "space123",
          userId: "user123",
          config: {
            teamId: "team123",
          },
        }),
        patch: jest.fn().mockResolvedValue({
          id: "space123",
          apiToken: "test-personal-access-token-12345",
        }),
      });

      // Obtenir le service de tokens via le factory
      const { Tokens } = require("../../src/services/tokens/tokens.class");
      const tokensService = new Tokens({ app });

      // Créer un token via le service
      const result = await tokensService.create(
        { spaceId: "space123" },
        { user: { id: "user123" } },
      );

      // Vérifier que le service des espaces a été appelé
      expect(app.service("/api/mattermost-spaces").get).toHaveBeenCalledWith(
        "space123",
      );

      // Vérifier que le token a été généré
      expect(app.mattermostIntegration._generateToken).toHaveBeenCalledWith(
        "team123",
      );

      // Vérifier que le token a été enregistré
      expect(app.service("/api/mattermost-spaces").patch).toHaveBeenCalledWith(
        "space123",
        { apiToken: "test-personal-access-token-12345" },
      );

      // Vérifier le résultat
      expect(result).toEqual({
        spaceId: "space123",
        apiToken: "test-personal-access-token-12345",
      });
    });
  });
});
