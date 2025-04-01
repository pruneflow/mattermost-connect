// tests/unit/api/mattermost-spaces.test.js
import { mattermostSpacesService } from "../../../src/api/mattermost-spaces";
import api from "../../../src/api/api";

// Mock de l'API Axios
jest.mock("../../../src/api/api");

describe("mattermostSpacesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAll", () => {
    it("should fetch all spaces", async () => {
      // Setup du mock
      const mockResponse = {
        data: {
          data: [
            { id: 1, name: "Space 1" },
            { id: 2, name: "Space 2" },
          ],
        },
      };
      api.get.mockResolvedValue(mockResponse);

      // Appeler la méthode
      const result = await mattermostSpacesService.getAll();

      // Vérifier les résultats
      expect(api.get).toHaveBeenCalledWith("/mattermost-spaces");
      expect(result).toEqual(mockResponse.data.data);
    });

    it("should handle errors", async () => {
      // Setup du mock pour simuler une erreur
      const mockError = new Error("Network error");
      api.get.mockRejectedValue(mockError);

      // Espionner console.error
      console.error = jest.fn();

      // Appeler la méthode et s'attendre à une erreur
      await expect(mattermostSpacesService.getAll()).rejects.toThrow(mockError);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("should create a new space", async () => {
      // Setup du mock
      const spaceData = { name: "New Space" };
      const mockResponse = {
        data: { id: 1, name: "New Space" },
      };
      api.post.mockResolvedValue(mockResponse);

      // Appeler la méthode
      const result = await mattermostSpacesService.create(spaceData);

      // Vérifier les résultats
      expect(api.post).toHaveBeenCalledWith("/mattermost-spaces", spaceData);
      expect(result).toEqual(mockResponse.data);
    });
  });

  // Ajouter des tests similaires pour get, update, delete et generateToken
});
