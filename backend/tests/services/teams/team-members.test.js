// tests/services/team-members.test.js
const {
  TeamMembers,
} = require("../../../src/services/team-members/team-members.class");

describe("Team Members Service", () => {
  let app;
  let teamMembersService;

  beforeEach(() => {
    app = createTestApp();

    // Configuration des mocks pour le service de membres d'équipe
    app._addService("/api/mattermost-spaces", {
      get: jest.fn().mockResolvedValue({
        id: "space123",
        userId: "123",
        config: {
          teamId: "team123",
        },
      }),
    });

    teamMembersService = new TeamMembers({ app });
  });

  describe("create method (invitation d'utilisateur)", () => {
    it("should reject if required fields are missing", async () => {
      // Données sans email
      const data = {
        spaceId: "space123",
      };

      const params = {
        user: { id: "123" },
      };

      await expect(teamMembersService.create(data, params)).rejects.toThrow(
        "ID d'espace et email requis",
      );

      // Données sans spaceId
      const data2 = {
        email: "test@example.com",
      };

      await expect(teamMembersService.create(data2, params)).rejects.toThrow(
        "ID d'espace et email requis",
      );
    });

    it("should reject if user is not authenticated", async () => {
      const data = {
        spaceId: "space123",
        email: "test@example.com",
      };

      const params = {}; // Pas d'utilisateur

      await expect(teamMembersService.create(data, params)).rejects.toThrow(
        "Authentification requise",
      );
    });

    it("should reject if user is not owner of the space", async () => {
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

      const data = {
        spaceId: "space123",
        email: "test@example.com",
      };

      const params = {
        user: { id: "123", isAdmin: false },
      };

      await expect(teamMembersService.create(data, params)).rejects.toThrow(
        "Non autorisé",
      );
    });
  });

  describe("patch method (mise à jour de rôle)", () => {
    it("should reject if required fields are missing", async () => {
      // Données sans isAdmin
      const data = {
        spaceId: "space123",
      };

      const params = {
        user: { id: "123" },
      };

      await expect(
        teamMembersService.patch("user456", data, params),
      ).rejects.toThrow("ID d'espace et statut admin requis");

      // Données sans spaceId
      const data2 = {
        isAdmin: true,
      };

      await expect(
        teamMembersService.patch("user456", data2, params),
      ).rejects.toThrow("ID d'espace et statut admin requis");
    });
  });

  describe("remove method (suppression d'un membre)", () => {
    it("should remove a user from a team", async () => {
      const params = {
        user: { id: "123" },
        query: {
          spaceId: "space123",
        },
      };

      const result = await teamMembersService.remove("user456", params);

      // Vérifier que l'espace a été récupéré
      expect(app.service("/api/mattermost-spaces").get).toHaveBeenCalledWith(
        "space123",
      );

      // Vérifier que l'utilisateur a été supprimé
      expect(app.mattermostIntegration.removeUserFromTeam).toHaveBeenCalledWith(
        "team123",
        "user456",
      );

      // Vérifier le résultat
      expect(result).toEqual({
        success: true,
        spaceId: "space123",
        teamId: "team123",
        userId: "user456",
      });
    });

    it("should reject if spaceId is missing in query", async () => {
      const params = {
        user: { id: "123" },
        query: {},
      };

      await expect(
        teamMembersService.remove("user456", params),
      ).rejects.toThrow("ID d'espace requis");
    });

    it("should reject if user is not owner of the space", async () => {
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

      const params = {
        user: { id: "123", isAdmin: false },
        query: {
          spaceId: "space123",
        },
      };

      await expect(
        teamMembersService.remove("user456", params),
      ).rejects.toThrow("Non autorisé");
    });

    it("should allow admin to remove users from any space", async () => {
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

      const params = {
        user: { id: "123", isAdmin: true },
        query: {
          spaceId: "space123",
        },
      };

      const result = await teamMembersService.remove("user456", params);

      expect(result).toEqual({
        success: true,
        spaceId: "space123",
        teamId: "team123",
        userId: "user456",
      });
    });
  });
});
