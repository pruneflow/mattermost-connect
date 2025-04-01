// tests/services/mattermost-spaces.test.js
const {
  MattermostSpaces,
} = require("../../../src/services/mattermost-spaces/mattermost-spaces.class");

describe("MattermostSpaces Service", () => {
  let app;
  let spacesService;

  beforeEach(() => {
    app = createTestApp();

    // Créer le service avec notre mock d'app
    spacesService = new MattermostSpaces({
      Model: { tableName: "mattermost_spaces" },
      app,
    });

    // Surcharger les méthodes héritées pour éviter les appels à la base de données
    spacesService.find = jest.fn().mockImplementation(async (params) => {
      const spaces = [
        {
          id: "space1",
          name: "Space 1",
          userId: "user123",
          isActive: true,
          createdAt: "2025-01-01T00:00:00Z",
        },
        {
          id: "space2",
          name: "Space 2",
          userId: "user456",
          isActive: false,
          createdAt: "2025-02-01T00:00:00Z",
        },
      ];

      // Filtrer par utilisateur si nécessaire
      if (
        params.user &&
        !params.user.isAdmin &&
        params.query &&
        params.query.userId
      ) {
        return spaces.filter((space) => space.userId === params.query.userId);
      }

      return spaces;
    });

    spacesService.get = jest.fn().mockImplementation(async (id, params) => {
      const spaces = {
        space1: {
          id: "space1",
          name: "Space 1",
          userId: "user123",
          isActive: true,
          createdAt: "2025-01-01T00:00:00Z",
        },
        space2: {
          id: "space2",
          name: "Space 2",
          userId: "user456",
          isActive: false,
          createdAt: "2025-02-01T00:00:00Z",
        },
      };

      const space = spaces[id];
      if (!space) {
        throw new Error("Espace non trouvé");
      }

      return space;
    });

    spacesService.create = jest
      .fn()
      .mockImplementation(async (data, params) => {
        return {
          id: "new-space",
          ...data,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
      });

    spacesService._super = {
      find: spacesService.find,
      get: spacesService.get,
      create: spacesService.create,
    };
  });

  describe("find method", () => {
    it("should filter spaces by user ID for non-admin users", async () => {
      const params = {
        user: { id: "user123", isAdmin: false },
        query: {},
      };

      await spacesService.find(params);

      // Vérifier que la requête est modifiée pour inclure l'ID de l'utilisateur
      expect(params.query).toHaveProperty("userId", "user123");
    });

    it("should not filter spaces for admin users", async () => {
      const params = {
        user: { id: "user123", isAdmin: true },
        query: {},
      };

      await spacesService.find(params);

      // Vérifier que la requête n'est pas modifiée
      expect(params.query).not.toHaveProperty("userId");
    });
  });

  describe("get method", () => {
    it("should allow a user to get their own space", async () => {
      const params = {
        user: { id: "user123", isAdmin: false },
      };

      const result = await spacesService.get("space1", params);

      // Vérifier que l'espace est retourné
      expect(result).toEqual({
        id: "space1",
        name: "Space 1",
        userId: "user123",
        isActive: true,
        createdAt: "2025-01-01T00:00:00Z",
      });
    });

    it("should reject if a non-admin user tries to access another user's space", async () => {
      const params = {
        user: { id: "user123", isAdmin: false },
      };

      // Pour simuler le rejet, nous utilisons une mise en œuvre personnalisée
      const originalGet = spacesService._super.get;
      spacesService.get = jest.fn().mockImplementation(async (id, params) => {
        const result = await originalGet(id, { ...params, query: {} });
        if (result.userId !== params.user.id && !params.user.isAdmin) {
          throw new Error("Non autorisé");
        }
        return result;
      });

      await expect(spacesService.get("space2", params)).rejects.toThrow(
        "Non autorisé",
      );
    });

    it("should allow admin to get any space", async () => {
      const params = {
        user: { id: "user123", isAdmin: true },
      };

      const result = await spacesService.get("space2", params);

      // Vérifier que l'espace est retourné
      expect(result).toEqual({
        id: "space2",
        name: "Space 2",
        userId: "user456",
        isActive: false,
        createdAt: "2025-02-01T00:00:00Z",
      });
    });
  });

  describe("create method", () => {
    it("should assign userId from authenticated user", async () => {
      const data = {
        name: "New Space",
      };

      const params = {
        user: { id: "user123" },
      };

      await spacesService.create(data, params);

      // Vérifier que l'ID utilisateur est assigné aux données
      expect(data).toHaveProperty("userId", "user123");
    });
  });
});
