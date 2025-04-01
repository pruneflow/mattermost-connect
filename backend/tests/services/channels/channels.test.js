// tests/services/channels.test.js
const { Channels } = require("../../../src/services/channels/channels.class");

describe("Channels Service", () => {
  let app;
  let channelService;

  beforeEach(() => {
    // Créer une instance fraîche de l'app mockée
    app = createTestApp();

    // Personnaliser des services spécifiques pour ce test
    app._addService("/api/mattermost-spaces", {
      get: jest.fn().mockResolvedValue({
        id: "space123",
        userId: "user123",
        config: {
          teamId: "team123",
        },
      }),
    });

    // Créer le service à tester avec l'app mockée
    channelService = new Channels({ app });
  });

  describe("find method", () => {
    it("should return channels for a space", async () => {
      const params = {
        user: { id: "user123" },
        query: { spaceId: "space123" },
      };

      const result = await channelService.find(params);

      expect(app.service("/api/mattermost-spaces").get).toHaveBeenCalledWith(
        "space123",
      );
      expect(app.mattermostIntegration.getTeamChannels).toHaveBeenCalledWith(
        "team123",
      );
      expect(result).toEqual([
        { id: "channel1", name: "general", display_name: "General" },
        { id: "channel2", name: "random", display_name: "Random" },
      ]);
    });

    it("should reject if user is not authenticated", async () => {
      const params = {
        query: { spaceId: "space123" },
      };

      await expect(channelService.find(params)).rejects.toThrow(
        "Authentification requise",
      );
    });

    it("should reject if spaceId is missing", async () => {
      const params = {
        user: { id: "user123" },
        query: {},
      };

      await expect(channelService.find(params)).rejects.toThrow(
        "ID d'espace requis",
      );
    });

    it("should reject if user is not authorized to access the space", async () => {
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
        user: { id: "user123", isAdmin: false },
        query: { spaceId: "space123" },
      };

      await expect(channelService.find(params)).rejects.toThrow("Non autorisé");
    });

    it("should allow admin to access any space", async () => {
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
        user: { id: "user123", isAdmin: true },
        query: { spaceId: "space123" },
      };

      await channelService.find(params);

      expect(app.service("/api/mattermost-spaces").get).toHaveBeenCalledWith(
        "space123",
      );
      expect(app.mattermostIntegration.getTeamChannels).toHaveBeenCalledWith(
        "team123",
      );
    });
  });

  describe("create method", () => {
    it("should create a new channel in a space", async () => {
      const data = {
        spaceId: "space123",
        name: "new-channel",
        display_name: "New Channel",
        type: "O",
        purpose: "Test channel",
        header: "Test header",
      };

      const params = {
        user: { id: "user123" },
      };

      const result = await channelService.create(data, params);

      expect(app.service("/api/mattermost-spaces").get).toHaveBeenCalledWith(
        "space123",
      );
      expect(app.mattermostIntegration.createChannel).toHaveBeenCalledWith({
        team_id: "team123",
        name: "new-channel",
        display_name: "New Channel",
        type: "O",
        purpose: "Test channel",
        header: "Test header",
      });

      expect(result).toEqual({
        id: "new-channel",
        name: "new-channel",
        display_name: "New Channel",
        team_id: "team123",
        spaceId: "space123",
      });
    });

    it("should reject if required fields are missing", async () => {
      const data = {
        spaceId: "space123",
        // name and display_name missing
      };

      const params = {
        user: { id: "user123" },
      };

      await expect(channelService.create(data, params)).rejects.toThrow(
        "ID d'espace, nom et nom d'affichage requis",
      );
    });
  });

  describe("patch method", () => {
    it("should update a channel", async () => {
      const data = {
        spaceId: "space123",
        display_name: "Updated General",
        purpose: "Updated purpose",
      };

      const params = {
        user: { id: "user123" },
      };

      const result = await channelService.patch("channel1", data, params);

      expect(app.service("/api/mattermost-spaces").get).toHaveBeenCalledWith(
        "space123",
      );
      expect(app.mattermostIntegration.updateChannel).toHaveBeenCalledWith(
        "channel1",
        {
          display_name: "Updated General",
          purpose: "Updated purpose",
        },
      );

      expect(result).toEqual({
        id: "channel1",
        name: "general",
        display_name: "Updated General",
        spaceId: "space123",
      });
    });
  });

  describe("remove method", () => {
    it("should archive a channel", async () => {
      const params = {
        user: { id: "user123" },
        query: { spaceId: "space123" },
      };

      const result = await channelService.remove("channel1", params);

      expect(app.service("/api/mattermost-spaces").get).toHaveBeenCalledWith(
        "space123",
      );
      expect(app.mattermostIntegration.archiveChannel).toHaveBeenCalledWith(
        "channel1",
      );

      expect(result).toEqual({
        success: true,
        channelId: "channel1",
        spaceId: "space123",
      });
    });
  });
});
