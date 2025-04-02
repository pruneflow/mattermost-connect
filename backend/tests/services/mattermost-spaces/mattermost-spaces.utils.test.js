// tests/services/mattermost-spaces.utils.test.js
const utils = require("../../../src/services/mattermost-spaces/mattermost-spaces.utils");

describe("MattermostSpaces Utils", () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe("checkUpdatePermission", () => {
    let context;

    beforeEach(() => {
      // Contexte de hook typique pour les méthodes update/patch
      context = {
        id: "space123",
        params: {
          user: { id: "123", isAdmin: false },
        },
        service: {
          get: jest.fn().mockResolvedValue({
            id: "space123",
            userId: "123",
          }),
        },
        app,
      };
    });

    test("devrait autoriser un utilisateur à modifier son propre espace", async () => {
      const result = await utils.checkUpdatePermission(context);

      // Vérifier que le service get a été appelé avec les bons arguments
      expect(context.service.get).toHaveBeenCalledWith(
        "space123",
        context.params,
      );

      // Vérifier que le contexte est retourné inchangé
      expect(result).toBe(context);
    });

    test("devrait refuser à un utilisateur de modifier l'espace d'un autre", async () => {
      // Modifier le mock pour que l'espace appartienne à un autre utilisateur
      context.service.get = jest.fn().mockResolvedValue({
        id: "space123",
        userId: "other-user",
      });

      // Vérifier que la fonction rejette avec une erreur
      await expect(utils.checkUpdatePermission(context)).rejects.toThrow(
        "Non autorisé à modifier cet espace",
      );

      // Vérifier que le service get a été appelé
      expect(context.service.get).toHaveBeenCalledWith(
        "space123",
        context.params,
      );
    });

    test("devrait autoriser un administrateur à modifier n'importe quel espace", async () => {
      // Modifier le contexte pour que l'utilisateur soit admin
      context.params.user.isAdmin = true;

      // Tester directement la fonction exportée
      const result = await utils.checkUpdatePermission(context);

      // Vérifier que le service get n'a pas été appelé (car l'admin bypass la vérification)
      expect(context.service.get).not.toHaveBeenCalled();

      // Vérifier que le contexte est retourné inchangé
      expect(result).toBe(context);
    });
  });

  describe("checkRemovePermission", () => {
    let context;

    beforeEach(() => {
      // Contexte de hook typique pour les méthodes remove
      context = {
        id: "space123",
        params: {
          user: { id: "123", isAdmin: false },
        },
        service: {
          get: jest.fn().mockResolvedValue({
            id: "space123",
            userId: "123",
          }),
        },
        app,
      };
    });

    test("devrait autoriser un utilisateur à supprimer son propre espace", async () => {
      const result = await utils.checkRemovePermission(context);

      expect(context.service.get).toHaveBeenCalledWith(
        "space123",
        context.params,
      );
      expect(result).toBe(context);
    });

    test("devrait refuser à un utilisateur de supprimer l'espace d'un autre", async () => {
      context.service.get = jest.fn().mockResolvedValue({
        id: "space123",
        userId: "other-user",
      });

      await expect(utils.checkRemovePermission(context)).rejects.toThrow(
        "Non autorisé à supprimer cet espace",
      );
      expect(context.service.get).toHaveBeenCalledWith(
        "space123",
        context.params,
      );
    });

    test("devrait autoriser un administrateur à supprimer n'importe quel espace", async () => {
      context.params.user.isAdmin = true;

      const result = await utils.checkRemovePermission(context);

      expect(context.service.get).not.toHaveBeenCalled();
      expect(result).toBe(context);
    });
  });

  describe("createMattermostSpace", () => {
    let context;

    beforeEach(() => {
      // Contexte de hook typique pour la méthode create
      context = {
        app,
        params: {
          user: { id: "123" },
        },
        data: {
          name: "Test Space",
        },
      };

      // Configurer les services spécifiques pour ce test
      app._addService("/api/users", {
        get: jest.fn().mockResolvedValue({
          id: "123",
          firstName: "Test",
          lastName: "User",
          companyName: "Test Company",
        }),
      });
    });

    test("devrait créer un espace Mattermost et mettre à jour les données", async () => {
      const result = await utils.createMattermostSpace(context);

      // Vérifier que l'intégration a été appelée correctement
      expect(app.mattermostIntegration.createClientSpace).toHaveBeenCalledWith({
        companyName: "Test Company",
      });

      // Vérifier que les données ont été mises à jour
      expect(context.data.apiToken).toBe("test-token");
      expect(context.data.config).toEqual({
        teamId: "team123",
        teamName: "test-team",
        inviteUrl: "http://invite-url",
        defaultChannelId: "channel123",
      });

      // Vérifier que le contexte est retourné
      expect(result).toBe(context);
    });

    test("devrait échouer si aucun utilisateur n'est disponible", async () => {
      // Modifier le contexte pour supprimer l'utilisateur
      context.params.user = null;

      await expect(utils.createMattermostSpace(context)).rejects.toThrow(
        "Utilisateur non disponible",
      );
    });

    test("devrait utiliser le prénom comme nom d'entreprise si le nom d'entreprise n'est pas disponible", async () => {
      // Modifier la réponse du service des utilisateurs
      app._addService("/api/users", {
        get: jest.fn().mockResolvedValue({
          id: "123",
          firstName: "Test",
          lastName: "User",
          // pas de companyName
        }),
      });

      await utils.createMattermostSpace(context);

      // Vérifier que l'intégration a été appelée avec le prénom
      expect(app.mattermostIntegration.createClientSpace).toHaveBeenCalledWith({
        companyName: "Espace de Test",
      });
    });

    test("devrait utiliser une valeur par défaut si aucune info n'est disponible", async () => {
      // Modifier la réponse du service des utilisateurs
      app._addService("/api/users", {
        get: jest.fn().mockResolvedValue({
          id: "123",
          // pas de firstName, lastName ou companyName
        }),
      });

      await utils.createMattermostSpace(context);

      // Vérifier que l'intégration a été appelée avec la valeur par défaut
      expect(app.mattermostIntegration.createClientSpace).toHaveBeenCalledWith({
        companyName: "Espace de Client",
      });
    });
  });

  describe("deleteMattermostSpace", () => {
    let context;

    beforeEach(() => {
      // Contexte de hook typique après la suppression
      context = {
        app,
        result: {
          id: "space123",
          config: {
            teamId: "team123",
          },
        },
      };
    });

    test("devrait supprimer l'espace Mattermost associé", async () => {
      const result = await utils.deleteMattermostSpace(context);

      // Vérifier que l'intégration a été appelée correctement
      expect(app.mattermostIntegration.deleteClientSpace).toHaveBeenCalledWith(
        "team123",
      );

      // Vérifier que le contexte est retourné
      expect(result).toBe(context);
    });

    test("ne devrait pas échouer si l'espace n'a pas de configuration Mattermost", async () => {
      // Modifier le contexte pour supprimer la config
      context.result.config = null;

      const result = await utils.deleteMattermostSpace(context);

      // Vérifier que l'intégration n'a pas été appelée
      expect(
        app.mattermostIntegration.deleteClientSpace,
      ).not.toHaveBeenCalled();

      // Vérifier que le contexte est retourné
      expect(result).toBe(context);
    });

    test("ne devrait pas échouer si le résultat est manquant", async () => {
      // Modifier le contexte pour supprimer le résultat
      context.result = null;

      const result = await utils.deleteMattermostSpace(context);

      // Vérifier que l'intégration n'a pas été appelée
      expect(
        app.mattermostIntegration.deleteClientSpace,
      ).not.toHaveBeenCalled();

      // Vérifier que le contexte est retourné
      expect(result).toBe(context);
    });
  });

  describe("validateMattermostSpace", () => {
    test("devrait valider un espace correctement formé", () => {
      const validSpace = {
        name: "Test Space",
        userId: 123,
      };

      expect(utils.validateMattermostSpace(validSpace)).toBe(true);
    });

    test("devrait rejeter un espace sans nom", () => {
      const invalidSpace = {
        userId: 123,
      };

      expect(utils.validateMattermostSpace(invalidSpace)).toBe(false);
    });

    test("devrait rejeter un espace avec un nom trop court", () => {
      const invalidSpace = {
        name: "A", // Moins de 2 caractères
        userId: 123,
      };

      expect(utils.validateMattermostSpace(invalidSpace)).toBe(false);
    });

    test("devrait rejeter un espace sans ID utilisateur", () => {
      const invalidSpace = {
        name: "Test Space",
      };

      expect(utils.validateMattermostSpace(invalidSpace)).toBe(false);
    });
  });

  describe("formatMattermostSpaceData", () => {
    test("devrait formater correctement les données d'espace", () => {
      const spaceData = {
        id: "space123",
        name: "Test Space",
        isActive: true,
        createdAt: "2025-03-26T12:00:00Z",
        apiToken: "secret-token-12345",
        config: {
          teamName: "test-team",
          inviteUrl: "http://invite-url",
        },
      };

      const formatted = utils.formatMattermostSpaceData(spaceData);

      expect(formatted.id).toBe("space123");
      expect(formatted.name).toBe("Test Space");
      expect(formatted.teamName).toBe("test-team");
      expect(formatted.inviteUrl).toBe("http://invite-url");
      expect(formatted.hasApiToken).toBe(true);
      expect(formatted.apiTokenPreview).toBe("...2345"); // Derniers 4 caractères
      expect(formatted.apiToken).toBeUndefined(); // Le token complet ne doit pas être inclus
    });

    test("devrait gérer un espace sans token API", () => {
      const spaceData = {
        id: "space123",
        name: "Test Space",
        isActive: true,
        createdAt: "2025-03-26T12:00:00Z",
        config: {
          teamName: "test-team",
        },
      };

      const formatted = utils.formatMattermostSpaceData(spaceData);

      expect(formatted.hasApiToken).toBe(false);
      expect(formatted.apiTokenPreview).toBeUndefined();
    });

    test("devrait gérer un espace sans configuration", () => {
      const spaceData = {
        id: "space123",
        name: "Test Space",
        isActive: true,
        createdAt: "2025-03-26T12:00:00Z",
      };

      const formatted = utils.formatMattermostSpaceData(spaceData);

      expect(formatted.teamName).toBeNull();
      expect(formatted.inviteUrl).toBeNull();
    });

    test("devrait retourner null pour des données invalides", () => {
      expect(utils.formatMattermostSpaceData(null)).toBeNull();
      expect(utils.formatMattermostSpaceData(undefined)).toBeNull();
    });
  });
});
