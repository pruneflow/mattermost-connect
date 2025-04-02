// tests/services/users.test.js
const { createMockApp } = require("../../setup/mock-app");
const { hashPassword } = require("@feathersjs/authentication-local").hooks;
const usersHooksModule = require("../../../src/services/users/users.hooks");

describe("Users Hooks", () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe("createDefaultSpace hook", () => {
    it("should create a default space for a new user", async () => {
      // Configurer le contexte pour simuler un hook "after.create"
      const context = {
        app,
        type: "after",
        result: {
          id: "123",
          email: "test@example.com",
          companyName: "Test Company",
        },
      };

      // Configurer les services
      app._addService("/api/mattermost-spaces", {
        find: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({
          id: "space123",
          name: "Espace de Test Company",
          userId: "123",
        }),
      });

      // Appliquer le hook
      await usersHooksModule.after.create[0](context);

      // Vérifier que le service des espaces a été appelé
      expect(app.service("/api/mattermost-spaces").find).toHaveBeenCalledWith({
        query: {
          userId: "123",
        },
        paginate: false,
      });

      // Vérifier que l'espace a été créé
      expect(app.service("/api/mattermost-spaces").create).toHaveBeenCalledWith(
        {
          userId: "123",
          name: "Espace de Test Company",
        },
        expect.objectContaining({
          user: context.result,
          provider: null,
        }),
      );
    });

    it("should not create a space if user already has one", async () => {
      // Configurer le contexte
      const context = {
        app,
        type: "after",
        result: {
          id: "123",
          email: "test@example.com",
        },
      };

      // Configurer le service des espaces pour simuler un espace existant
      app._addService("/api/mattermost-spaces", {
        find: jest
          .fn()
          .mockResolvedValue([
            { id: "existing-space", name: "Existing Space", userId: "123" },
          ]),
        create: jest.fn(),
      });

      // Appliquer le hook
      await usersHooksModule.after.create[0](context);

      // Vérifier que le service a vérifié les espaces existants
      expect(app.service("/api/mattermost-spaces").find).toHaveBeenCalled();

      // Vérifier qu'aucun nouvel espace n'a été créé
      expect(
        app.service("/api/mattermost-spaces").create,
      ).not.toHaveBeenCalled();
    });

    it("should not fail the user creation if space creation fails", async () => {
      // Configurer le contexte
      const context = {
        app,
        type: "after",
        result: {
          id: "123",
          email: "test@example.com",
        },
      };

      // Configurer le service des espaces pour simuler une erreur
      app._addService("/api/mattermost-spaces", {
        find: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockRejectedValue(new Error("Erreur de création")),
      });

      // Appliquer le hook - ne devrait pas échouer
      const result = await usersHooksModule.after.create[0](context);

      // Vérifier que le contexte est retourné malgré l'erreur
      expect(result).toBe(context);
    });
  });

  describe("getCurrentUser hook", () => {
    it('should update the context id to the user id when id is "current"', async () => {
      // Configurer le contexte
      const context = {
        id: "current",
        params: {
          user: {
            id: "123",
          },
        },
      };

      // Appliquer le hook
      const result = await usersHooksModule.before.get[1](context);

      // Vérifier que l'ID a été remplacé
      expect(result.id).toBe("123");
    });

    it("should reject if no user is authenticated", async () => {
      // Configurer le contexte sans utilisateur
      const context = {
        id: "current",
        params: {},
      };

      // Appliquer le hook - devrait échouer
      await expect(usersHooksModule.before.get[1](context)).rejects.toThrow(
        "Non authentifié",
      );
    });

    it('should pass through if id is not "current"', async () => {
      // Configurer le contexte avec un ID spécifique
      const context = {
        id: "123",
        params: {},
      };

      // Appliquer le hook
      const result = await usersHooksModule.before.get[1](context);

      // Vérifier que le contexte est inchangé
      expect(result).toBe(context);
      expect(result.id).toBe("123");
    });
  });

  describe("verifyOldPassword hook", () => {
    it("should verify old password before changing to new password", async () => {
      // Configurer le contexte pour simuler un changement de mot de passe
      const context = {
        app,
        id: "123",
        data: {
          password: "newPassword",
          oldPassword: "currentPassword",
        },
        params: {
          user: {
            id: "123",
          },
        },
      };

      // Configurer les services
      app._addService("/api/users", {
        get: jest.fn().mockResolvedValue({
          id: "123",
          email: "test@example.com",
          password: "hashedCurrentPassword",
        }),
      });

      app._addService("/api/authentication", {
        strategies: {
          local: {
            authenticate: jest.fn().mockResolvedValue({
              id: "123",
            }),
          },
        },
      });

      // Appliquer le hook
      const result = await usersHooksModule.before.update[2](context);

      // Vérifier que l'authentification a été vérifiée
      expect(
        app.service("/api/authentication").strategies.local.authenticate,
      ).toHaveBeenCalledWith(
        {
          email: "test@example.com",
          password: "currentPassword",
        },
        expect.anything(),
      );

      // Vérifier que oldPassword a été supprimé
      expect(result.data).not.toHaveProperty("oldPassword");
    });

    it("should reject if the old password is incorrect", async () => {
      // Configurer le contexte
      const context = {
        app,
        id: "123",
        data: {
          password: "newPassword",
          oldPassword: "wrongPassword",
        },
        params: {
          user: {
            id: "123",
          },
        },
      };

      // Configurer les services
      app._addService("/api/users", {
        get: jest.fn().mockResolvedValue({
          id: "123",
          email: "test@example.com",
        }),
      });

      // Simulation d'une authentification échouée
      app._addService("/api/authentication", {
        strategies: {
          local: {
            authenticate: jest.fn().mockResolvedValue(null),
          },
        },
      });

      // Appliquer le hook - devrait échouer
      await expect(usersHooksModule.before.update[2](context)).rejects.toThrow(
        "Mot de passe actuel incorrect",
      );
    });

    it("should skip if no password change is attempted", async () => {
      // Configurer le contexte sans changement de mot de passe
      const context = {
        app,
        id: "123",
        data: {
          firstName: "Updated",
        },
        params: {
          user: {
            id: "123",
          },
        },
      };

      // Appliquer le hook
      const result = await usersHooksModule.before.update[2](context);

      // Vérifier que le contexte est inchangé
      expect(result).toBe(context);
    });

    it("should reject if user tries to modify another user account without admin rights", async () => {
      // Configurer le contexte pour simuler un changement de mot de passe sur un autre compte
      const context = {
        app,
        id: "other-user",
        data: {
          password: "newPassword",
          oldPassword: "currentPassword",
        },
        params: {
          user: {
            id: "123",
            isAdmin: false,
          },
        },
      };

      // Appliquer le hook - devrait échouer
      await expect(usersHooksModule.before.update[2](context)).rejects.toThrow(
        "Non autorisé à modifier ce compte",
      );
    });

    it("should allow admin to modify any user account", async () => {
      // Configurer le contexte pour simuler un admin modifiant un autre compte
      const context = {
        app,
        id: "other-user",
        data: {
          password: "newPassword",
          oldPassword: "currentPassword",
        },
        params: {
          user: {
            id: "123",
            isAdmin: true,
          },
        },
      };

      // Configurer les services
      app._addService("/api/users", {
        get: jest.fn().mockResolvedValue({
          id: "other-user",
          email: "other@example.com",
          password: "hashedCurrentPassword",
        }),
      });

      app._addService("/api/authentication", {
        strategies: {
          local: {
            authenticate: jest.fn().mockResolvedValue({
              id: "other-user",
            }),
          },
        },
      });

      // Appliquer le hook
      const result = await usersHooksModule.before.update[2](context);

      // Vérifier que le service a été appelé pour obtenir l'utilisateur
      expect(app.service("/api/users").get).toHaveBeenCalledWith(
        "other-user",
        expect.anything(),
      );

      // Vérifier que oldPassword a été supprimé
      expect(result.data).not.toHaveProperty("oldPassword");
    });
  });

  describe("hashPassword hook", () => {
    it("should hash password before creating user", async () => {
      // Vérifier que hashPassword est présent dans les hooks before.create
      const hasHashPasswordHook = usersHooksModule.before.create.some(
        (hook) =>
          hook === hashPassword ||
          (typeof hook === "function" && hook.name === "hashPassword") ||
          (hook.toString && hook.toString().includes("hashPassword")),
      );

      expect(hasHashPasswordHook).toBe(true);
    });

    it("should hash password before updating user", async () => {
      // Vérifier que hashPassword est présent dans les hooks before.update
      const hasHashPasswordHook = usersHooksModule.before.update.some(
        (hook) =>
          hook === hashPassword ||
          (typeof hook === "function" && hook.name === "hashPassword") ||
          (hook.toString && hook.toString().includes("hashPassword")),
      );

      expect(hasHashPasswordHook).toBe(true);
    });

    it("should hash password before patching user", async () => {
      // Vérifier que hashPassword est présent dans les hooks before.patch
      const hasHashPasswordHook = usersHooksModule.before.patch.some(
        (hook) =>
          hook === hashPassword ||
          (typeof hook === "function" && hook.name === "hashPassword") ||
          (hook.toString && hook.toString().includes("hashPassword")),
      );

      expect(hasHashPasswordHook).toBe(true);
    });
  });
});
