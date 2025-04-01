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
      find: jest.fn().mockResolvedValue([
        {
          id: "space1",
          name: "Space 1",
          userId: "user123",
          isActive: true,
          apiToken: "token1",
          createdAt: "2025-01-01T00:00:00Z",
          config: { teamId: "team1" },
        },
        {
          id: "space2",
          name: "Space 2",
          userId: "user123",
          isActive: false,
          apiToken: null,
          createdAt: "2025-02-01T00:00:00Z",
          config: { teamId: "team2" },
        },
      ]),
    });

    app._addService("/api/users", {
      find: jest.fn().mockResolvedValue({
        total: 10,
        limit: 10,
        skip: 0,
        data: [],
      }),
    });

    statisticsService = new Statistics({ app });
  });

  describe("find method", () => {
    it("should return statistics for a user", async () => {
      const params = {
        user: { id: "user123", isAdmin: false },
      };

      const result = await statisticsService.find(params);

      expect(app.service("/api/mattermost-spaces").find).toHaveBeenCalledWith({
        query: {
          userId: "user123",
        },
        paginate: false,
      });

      // Vérifier les statistiques
      expect(result).toEqual({
        totalSpaces: 2,
        activeSpaces: 1,
        inactiveSpaces: 1,
        withToken: 1,
        withoutToken: 1,
        oldestSpace: expect.objectContaining({
          id: "space1",
          createdAt: "2025-01-01T00:00:00Z",
        }),
        newestSpace: expect.objectContaining({
          id: "space2",
          createdAt: "2025-02-01T00:00:00Z",
        }),
      });
    });

    it("should return empty statistics if user has no spaces", async () => {
      // Modifier le mock pour retourner un tableau vide
      app._addService("/api/mattermost-spaces", {
        find: jest.fn().mockResolvedValue([]),
      });

      const params = {
        user: { id: "user123", isAdmin: false },
      };

      const result = await statisticsService.find(params);

      expect(result).toEqual({
        totalSpaces: 0,
        activeSpaces: 0,
        inactiveSpaces: 0,
        oldestSpace: null,
        newestSpace: null,
        withToken: 0,
        withoutToken: 0,
      });
    });

    it("should include admin statistics for admin users", async () => {
      const params = {
        user: { id: "user123", isAdmin: true },
      };

      const result = await statisticsService.find(params);

      // Vérifier que les statistiques d'admin sont présentes
      expect(result).toHaveProperty("adminStats");
      expect(result.adminStats).toEqual({
        totalUsers: 10,
        totalSpacesGlobal: expect.any(Number),
        averageSpacesPerUser: expect.any(Number),
      });
    });

    it("should reject if user is not authenticated", async () => {
      const params = {}; // Pas d'utilisateur

      await expect(statisticsService.find(params)).rejects.toThrow(
        "Authentification requise",
      );
    });
  });

  describe("get method", () => {
    it("should return statistics for a specific space", async () => {
      // Configuration pour simuler un espace spécifique
      app._addService("/api/mattermost-spaces", {
        get: jest.fn().mockResolvedValue({
          id: "space1",
          userId: "user123",
          config: { teamId: "team1" },
        }),
      });

      const params = {
        user: { id: "user123" },
      };

      const result = await statisticsService.get("space1", params);

      // Vérifier que l'espace a été récupéré
      expect(app.service("/api/mattermost-spaces").get).toHaveBeenCalledWith(
        "space1",
      );

      // Vérifier le format des statistiques
      expect(result).toEqual({
        spaceId: "space1",
        spaceName: expect.any(String),
        usersCount: expect.any(Number),
        channelsCount: expect.any(Number),
        messagesCount: expect.any(Number),
        activeUsers: expect.any(Number),
        lastActivity: expect.any(String),
      });
    });

    it("should reject if user is not owner of the space and not admin", async () => {
      // Configuration pour simuler un espace appartenant à un autre utilisateur
      app._addService("/api/mattermost-spaces", {
        get: jest.fn().mockResolvedValue({
          id: "space1",
          userId: "other-user",
          config: { teamId: "team1" },
        }),
      });

      const params = {
        user: { id: "user123", isAdmin: false },
      };

      await expect(statisticsService.get("space1", params)).rejects.toThrow(
        "Non autorisé",
      );
    });

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
        user: { id: "user123", isAdmin: true },
      };

      const result = await statisticsService.get("space1", params);

      // Vérifier que les statistiques sont retournées
      expect(result).toHaveProperty("spaceId", "space1");
    });
  });
});
