// tests/services/token-generation.test.js
const { Tokens } = require("../../../src/services/tokens/tokens.class");

describe("Token Generation", () => {
  let app;
  let tokensService;

  beforeEach(() => {
    app = createTestApp();

    // Configuration spécifique pour les tests de tokens
    app._addService("/api/mattermost-spaces", {
      get: jest.fn().mockResolvedValue({
        id: "space123",
        userId: "123",
        config: {
          teamId: "team123",
        },
      }),
      patch: jest.fn().mockResolvedValue({
        id: "space123",
        apiToken: "test-token-12345",
      }),
    });

    // Créer le service Tokens avec notre mock d'app
    tokensService = new Tokens({ app });
  });

  describe("create method", () => {
    it("should generate a token for a valid space", async () => {
      const params = {
        user: { id: "123" },
      };

      const data = {
        spaceId: "space123",
      };

      const result = await tokensService.create(data, params);

      // Vérifier que les méthodes ont été appelées correctement
      expect(app.service("/api/mattermost-spaces").get).toHaveBeenCalledWith(
        "space123",
      );
      expect(app.mattermostIntegration._generateToken).toHaveBeenCalledWith(
        "team123",
      );
      expect(app.service("/api/mattermost-spaces").patch).toHaveBeenCalledWith(
        "space123",
        { apiToken: "test-token-12345" },
      );

      // Vérifier le résultat
      expect(result).toEqual({
        spaceId: "space123",
        apiToken: "test-token-12345",
      });
    });

    it("should reject if no user is authenticated", async () => {
      const data = {
        spaceId: "space123",
      };

      const params = {}; // Pas d'utilisateur

      await expect(tokensService.create(data, params)).rejects.toThrow(
        "Authentification requise",
      );
    });

    it("should reject if spaceId is missing", async () => {
      const data = {}; // Pas de spaceId
      const params = {
        user: { id: "123" },
      };

      await expect(tokensService.create(data, params)).rejects.toThrow(
        "ID d'espace requis",
      );
    });

    it("should reject if user is not authorized to manage the space", async () => {
      // Modifier le mock pour que l'espace appartienne à un autre utilisateur
      app._addService("/api/mattermost-spaces", {
        get: jest.fn().mockResolvedValue({
          id: "space123",
          userId: "other-user",
          config: {
            teamId: "team123",
          },
        }),
      });

      const data = { spaceId: "space123" };
      const params = { user: { id: "123", isAdmin: false } };

      await expect(tokensService.create(data, params)).rejects.toThrow(
        "Vous n'êtes pas autorisé à gérer cet espace",
      );
    });

    it("should allow admin to manage any space", async () => {
      // Modifier le mock pour que l'espace appartienne à un autre utilisateur
      app._addService("/api/mattermost-spaces", {
        get: jest.fn().mockResolvedValue({
          id: "space123",
          userId: "other-user",
          config: {
            teamId: "team123",
          },
        }),
      });

      const data = { spaceId: "space123" };
      const params = { user: { id: "123", isAdmin: true } };

      const result = await tokensService.create(data, params);

      expect(result).toEqual({
        spaceId: "space123",
        apiToken: "test-token-12345",
      });
    });

    it("should reject if space has no team associated", async () => {
      // Modifier le mock pour que l'espace n'ait pas de config
      app._addService("/api/mattermost-spaces", {
        get: jest.fn().mockResolvedValue({
          id: "space123",
          userId: "123",
          config: null,
        }),
      });

      const data = { spaceId: "space123" };
      const params = { user: { id: "123" } };

      await expect(tokensService.create(data, params)).rejects.toThrow(
        "Cet espace n'a pas d'équipe Mattermost associée",
      );
    });

    it("should reject if space config has no teamId", async () => {
      // Modifier le mock pour que l'espace ait une config sans teamId
      app._addService("/api/mattermost-spaces", {
        get: jest.fn().mockResolvedValue({
          id: "space123",
          userId: "123",
          config: {
            // pas de teamId
          },
        }),
      });

      const data = { spaceId: "space123" };
      const params = { user: { id: "123" } };

      await expect(tokensService.create(data, params)).rejects.toThrow(
        "Cet espace n'a pas d'équipe Mattermost associée",
      );
    });
  });

  describe("Token generation integration with Mattermost API", () => {
    it("should handle errors during token generation", async () => {
      // Modifier le mock pour simuler une erreur lors de la génération du token
      app.mattermostIntegration._generateToken.mockRejectedValueOnce(
        new Error("Erreur API"),
      );

      const data = { spaceId: "space123" };
      const params = { user: { id: "123" } };

      await expect(tokensService.create(data, params)).rejects.toThrow(
        "Erreur API",
      );
    });
  });
});
