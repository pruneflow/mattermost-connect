// tests/services/statistics.test.js
const {
  Statistics,
} = require("../../../src/services/statistics/statistics.class");

describe("Statistics Service", () => {
  let app;
  let statisticsService;

  beforeEach(() => {
    app = createTestApp();

    // Configuration des mocks pour le service de statistiques
    app._addService("/api/mattermost-spaces", {
      find: jest.fn().mockResolvedValue({
        total: 2,
        limit: 10,
        skip: 0,
        data: [
          {
            id: "space1",
            name: "Space 1",
            userId: "123",
            isActive: true,
            apiToken: "token1",
            createdAt: "2025-01-01T00:00:00Z",
            config: { teamId: "team1" },
          },
          {
            id: "space2",
            name: "Space 2",
            userId: "123",
            isActive: false,
            apiToken: null,
            createdAt: "2025-02-01T00:00:00Z",
            config: { teamId: "team2" },
          },
        ],
      }),
    });

    app._addService("/api/users", {
      find: jest.fn().mockResolvedValue({
        total: 0,
        limit: 10,
        skip: 0,
        data: [],
      }),
    });

    statisticsService = new Statistics({ app });
  });

  describe("find method", () => {
    it("should reject if user is not authenticated", async () => {
      const params = {}; // Pas d'utilisateur

      await expect(statisticsService.find(params)).rejects.toThrow(
        "Authentification requise",
      );
    });
  });

  describe("get method", () => {
    it("should allow admin to get statistics for any space", async () => {
      // Configuration pour simuler un espace appartenant à un autre utilisateur
      app._addService("/api/mattermost-spaces", {
        get: jest.fn().mockResolvedValue({
          id: "space1",
          userId: "other-user",
          config: { teamId: "team1" },
        }),
      });

      const params = {
        user: { id: "123", isAdmin: true },
      };

      const result = await statisticsService.get("space1", params);

      // Vérifier que les statistiques sont retournées
      expect(result).toHaveProperty("spaceId", "space1");
    });
  });
});
