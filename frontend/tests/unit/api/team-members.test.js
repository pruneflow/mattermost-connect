// tests/unit/api/team-members.test.js
import { teamMembersService } from "../../../src/api/team-members";
import api from "../../../src/api/api";

// Mock de axios/api
jest.mock("../../../src/api/api", () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}));

describe("Team Members Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllMembers", () => {
    it("should fetch members for a specific space", async () => {
      // Mock de la réponse
      const mockResponse = {
        data: [
          {
            id: "user1",
            username: "user1",
            email: "user1@example.com",
            isAdmin: false,
          },
          {
            id: "user2",
            username: "user2",
            email: "user2@example.com",
            isAdmin: true,
          },
        ],
      };

      api.get.mockResolvedValueOnce(mockResponse);

      // Appel de la fonction
      const result = await teamMembersService.getAllMembers("space123");

      // Vérifications
      expect(api.get).toHaveBeenCalledWith("/team-members", {
        params: { spaceId: "space123" },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle errors when fetching members", async () => {
      // Mock d'une erreur
      const mockError = new Error("Network error");
      api.get.mockRejectedValueOnce(mockError);

      // Appel de la fonction et vérification de l'erreur
      await expect(
        teamMembersService.getAllMembers("space123"),
      ).rejects.toThrow("Network error");
      expect(api.get).toHaveBeenCalledWith("/team-members", {
        params: { spaceId: "space123" },
      });
    });
  });

  describe("inviteUser", () => {
    it("should invite a user to a space", async () => {
      // Mock de la réponse
      const mockResponse = {
        data: {
          spaceId: "space123",
          teamId: "team123",
          invited: { status: "invited", email: "new@example.com" },
        },
      };

      api.post.mockResolvedValueOnce(mockResponse);

      // Appel de la fonction
      const result = await teamMembersService.inviteUser(
        "space123",
        "new@example.com",
      );

      // Vérifications
      expect(api.post).toHaveBeenCalledWith("/team-members", {
        spaceId: "space123",
        email: "new@example.com",
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("updateRole", () => {
    it("should update a user role", async () => {
      // Mock de la réponse
      const mockResponse = {
        data: {
          spaceId: "space123",
          teamId: "team123",
          userId: "user1",
          isAdmin: true,
        },
      };

      api.patch.mockResolvedValueOnce(mockResponse);

      // Appel de la fonction
      const result = await teamMembersService.updateRole(
        "user1",
        "space123",
        true,
      );

      // Vérifications
      expect(api.patch).toHaveBeenCalledWith("/team-members/user1", {
        spaceId: "space123",
        isAdmin: true,
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("removeMember", () => {
    it("should remove a member from a space", async () => {
      // Mock de la réponse
      const mockResponse = {
        data: {
          success: true,
          spaceId: "space123",
          teamId: "team123",
          userId: "user1",
        },
      };

      api.delete.mockResolvedValueOnce(mockResponse);

      // Appel de la fonction
      const result = await teamMembersService.removeMember("user1", "space123");

      // Vérifications
      expect(api.delete).toHaveBeenCalledWith("/team-members/user1", {
        params: { spaceId: "space123" },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });
});
