const utils = require("../../../src/services/mattermost-spaces/mattermost-spaces.utils");
const logger = require("../../../src/logger");

// Mock pour logger
jest.mock("../../../src/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe("MattermostSpaces Utils", () => {
  describe("checkUpdatePermission", () => {
    let context;

    beforeEach(() => {
      // Contexte de hook typique pour les méthodes update/patch
      context = {
        id: "space123",
        params: {
          user: { id: "user123", isAdmin: false },
        },
        service: {
          get: jest.fn().mockResolvedValue({
            id: "space123",
            userId: "user123",
          }),
        },
      };
    });

    test("devrait autoriser un utilisateur à modifier son propre espace", async () => {
      // Tester directement la fonction exportée
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
          user: { id: "user123", isAdmin: false },
        },
        service: {
          get: jest.fn().mockResolvedValue({
            id: "space123",
            userId: "user123",
          }),
        },
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
    let mockMattermostIntegration;

    beforeEach(() => {
      // Mock pour l'intégration Mattermost
      mockMattermostIntegration = {
        createClientSpace: jest.fn().mockResolvedValue({
          teamId: "team123",
          teamName: "test-team",
          channelId: "channel123",
          apiToken: "test-token",
          inviteUrl: "http://invite-url",
        }),
      };

      // Contexte de hook typique
      context = {
        app: {
          get: jest.fn().mockImplementation((key) => {
            if (key === "mattermostIntegration")
              return mockMattermostIntegration;
            return null;
          }),
          service: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              id: "user123",
              firstName: "Test",
              lastName: "User",
              companyName: "Test Company",
            }),
          }),
        },
        params: {
          user: { id: "user123" },
        },
        data: {
          name: "Test Space",
        },
      };
    });

    test("devrait créer un espace Mattermost et mettre à jour les données", async () => {
      await utils.createMattermostSpace(context);

      // Vérifier que l'intégration a été appelée correctement
      expect(mockMattermostIntegration.createClientSpace).toHaveBeenCalledWith({
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
    });

    test("devrait échouer si aucun utilisateur n'est disponible", async () => {
      // Modifier le contexte pour supprimer l'utilisateur
      context.params.user = null;

      await expect(utils.createMattermostSpace(context)).rejects.toThrow(
        "Utilisateur non disponible",
      );
    });

    test("devrait échouer si le service d'intégration n'est pas disponible", async () => {
      // Modifier le contexte pour supprimer l'intégration
      context.app.get = jest.fn().mockReturnValue(null);

      await expect(utils.createMattermostSpace(context)).rejects.toThrow(
        "Service d'intégration Mattermost non disponible",
      );
    });
  });

  describe("deleteMattermostSpace", () => {
    let context;
    let mockMattermostIntegration;

    beforeEach(() => {
      // Mock pour l'intégration Mattermost
      mockMattermostIntegration = {
        deleteClientSpace: jest.fn().mockResolvedValue({ success: true }),
      };

      // Contexte de hook typique après suppression
      context = {
        app: {
          get: jest.fn().mockImplementation((key) => {
            if (key === "mattermostIntegration")
              return mockMattermostIntegration;
            return null;
          }),
        },
        result: {
          id: "space123",
          config: {
            teamId: "team123",
          },
        },
      };
    });

    test("devrait supprimer l'espace Mattermost associé", async () => {
      await utils.deleteMattermostSpace(context);

      // Vérifier que l'intégration a été appelée correctement
      expect(mockMattermostIntegration.deleteClientSpace).toHaveBeenCalledWith(
        "team123",
      );
    });

    test("ne devrait pas échouer si l'espace n'a pas de configuration Mattermost", async () => {
      // Modifier le contexte pour supprimer la config
      context.result.config = null;

      await utils.deleteMattermostSpace(context);

      // Vérifier que l'intégration n'a pas été appelée
      expect(
        mockMattermostIntegration.deleteClientSpace,
      ).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalled();
    });

    test("ne devrait pas échouer si le service d'intégration n'est pas disponible", async () => {
      // Modifier le contexte pour supprimer l'intégration
      context.app.get = jest.fn().mockReturnValue(null);

      // Le hook ne doit pas lever d'erreur
      const result = await utils.deleteMattermostSpace(context);

      // Vérifier que le contexte est retourné et que l'erreur a été enregistrée
      expect(result).toBe(context);
      expect(logger.error).toHaveBeenCalled();
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
