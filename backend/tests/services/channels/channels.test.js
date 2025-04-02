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
        userId: "123",
        config: {
          teamId: "team123",
        },
      }),
    });

    app.mattermostIntegration.getTeamChannels = jest.fn().mockResolvedValue([
      {
        id: "channel1",
        name: "general",
        display_name: "General",
        creator_id: "user1",
        create_at: 1617235200000,
      },
      {
        id: "channel2",
        name: "random",
        display_name: "Random",
        creator_id: "bot-user",
        create_at: 1617321600000,
      },
      {
        id: "channel3",
        name: "town-square",
        display_name: "Town Square",
        creator_id: "system",
        create_at: 1617148800000,
      },
    ]);

    app.mattermostIntegration._getUserInfo = jest
      .fn()
      .mockImplementation(async (userId) => {
        if (userId === "user1") {
          return {
            id: "user1",
            username: "johndoe",
            first_name: "John",
            last_name: "Doe",
            email: "john@example.com",
          };
        } else if (userId === "bot-user") {
          return {
            id: "bot-user",
            username: "bot-team",
            email: "bot-team@mattermost-admin.local",
            props: { is_bot: "true" },
          };
        }
        throw new Error("User not found");
      });

    // Créer le service à tester
    channelsService = new Channels({ app });
  });

  describe("Add creator info", () => {
    it("should enrich channel data with creator information", async () => {
      const params = {
        user: { id: "123" },
        query: { spaceId: "space123" },
      };

      const result = await channelsService.find(params);

      // Vérifier le premier canal (créateur normal)
      expect(result[0].creator).toBeDefined();
      expect(result[0].creator.displayName).toBe("John Doe");

      // Vérifier le second canal (créateur bot)
      expect(result[1].creator).toBeDefined();
      expect(result[1].creator.displayName).toBe("Bot");
      expect(result[1].creator.isBot).toBe(true);

      // Ajouter une vérification pour le canal par défaut
      expect(result[2].isDefaultChannel).toBe(true);
      expect(result[2].creator).toBeNull(); // Pas d'info créateur pour un canal par défaut
    });
  });
});
