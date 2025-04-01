// tests/services/mattermost-integration.test.js
const axios = require("axios");
const MattermostIntegration = require("../../../src/services/mattermost-integration/mattermost-integration");

describe("MattermostIntegration", () => {
  let app;
  let mattermostIntegration;

  beforeEach(() => {
    app = createTestApp();

    // Recréer l'instance pour chaque test
    mattermostIntegration = new MattermostIntegration(app);
  });

  describe("_generateTeamName", () => {
    test("devrait générer un nom d'équipe valide à partir d'un nom d'entreprise", () => {
      const companyName = "Test Company 123";
      const teamName = mattermostIntegration._generateTeamName(companyName);

      // Vérifier le format du nom généré
      expect(teamName).toMatch(/^[a-z][a-z0-9-]+$/);
      expect(teamName.length).toBeLessThanOrEqual(15);
      expect(teamName.length).toBeGreaterThanOrEqual(2);

      // Vérifier que le nom commence par une partie du nom de l'entreprise
      const companyNameStart = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .substring(0, 5);
      expect(teamName.startsWith(companyNameStart)).toBe(true);

      // Vérifier que le nom contient un tiret suivi d'un nombre (le suffixe aléatoire)
      expect(teamName).toMatch(/.*-\d+/);
    });

    test("devrait gérer les caractères spéciaux", () => {
      const companyName = "Spécial@Caractères!";
      const teamName = mattermostIntegration._generateTeamName(companyName);

      // Vérifier que les caractères spéciaux sont remplacés par des tirets
      expect(teamName).not.toMatch(/[^a-z0-9-]/);
    });

    test("devrait ajouter un préfixe si le nom commence par un chiffre", () => {
      const companyName = "123Company";
      const teamName = mattermostIntegration._generateTeamName(companyName);

      // Vérifier que le nom généré ne commence pas par un chiffre
      expect(teamName).toMatch(/^[a-z]/);
    });

    test("devrait générer des noms uniques pour le même nom d'entreprise", () => {
      const companyName = "SameCompany";

      // Générer plusieurs noms d'équipe à partir du même nom d'entreprise
      const teamNames = Array.from({ length: 5 }, () =>
        mattermostIntegration._generateTeamName(companyName),
      );

      // Vérifier que tous les noms sont différents
      const uniqueNames = new Set(teamNames);
      expect(uniqueNames.size).toBe(teamNames.length);
    });
  });

  describe("_createTeam", () => {
    test("devrait créer une équipe avec succès", async () => {
      // Configurer le mock axios pour simuler une création réussie
      axios.post.mockResolvedValueOnce({
        data: {
          id: "team123",
          name: "test-team",
          display_name: "Test Team",
          description: "Test team description",
          invite_id: "invite123",
        },
      });

      const teamData = {
        name: "test-team",
        display_name: "Test Team",
        type: "I",
      };

      const result = await mattermostIntegration._createTeam(teamData);

      // Vérifier que la requête a été faite correctement
      expect(axios.post).toHaveBeenCalledWith(
        `${app.get("mattermost").baseUrl}/api/v4/teams`,
        teamData,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${app.get("mattermost").adminToken}`,
          }),
        }),
      );

      // Vérifier le résultat
      expect(result).toEqual({
        id: "team123",
        name: "test-team",
        display_name: "Test Team",
        description: "Test team description",
        invite_id: "invite123",
      });
    });

    test("devrait gérer le cas où l'équipe existe déjà en générant un nouveau nom", async () => {
      // Configurer le mock pour simuler d'abord un échec (équipe existante), puis un succès
      axios.post
        .mockRejectedValueOnce({
          response: {
            status: 400,
            data: {
              id: "app.team.save.existing.app_error",
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            id: "team123",
            name: "test-team-new",
            display_name: "Test Team",
            invite_id: "invite123",
          },
        });

      const teamData = {
        name: "existing-team",
        display_name: "Existing Team",
        type: "I",
      };

      const result = await mattermostIntegration._createTeam(teamData);

      // Vérifier que deux requêtes ont été faites (échec puis succès avec un nouveau nom)
      expect(axios.post).toHaveBeenCalledTimes(2);

      // Vérifier que la seconde requête utilise un nom différent
      const secondCallArgs = axios.post.mock.calls[1][1];
      expect(secondCallArgs.name).not.toBe(teamData.name);

      // Vérifier le résultat final
      expect(result).toEqual(
        expect.objectContaining({
          id: "team123",
        }),
      );
    });
  });

  describe("createClientSpace", () => {
    test("devrait créer un espace client complet", async () => {
      // Mocks pour les sous-méthodes
      mattermostIntegration._createTeam = jest.fn().mockResolvedValue({
        id: "team123",
        name: "client-team",
        invite_id: "invite123",
      });

      mattermostIntegration._createChannel = jest.fn().mockResolvedValue({
        id: "channel123",
        name: "general-unique",
      });

      mattermostIntegration._generateToken = jest
        .fn()
        .mockResolvedValue("test-token-123");

      const clientData = {
        companyName: "Client Company",
      };

      const result = await mattermostIntegration.createClientSpace(clientData);

      // Vérifier que les méthodes ont été appelées correctement
      expect(mattermostIntegration._createTeam).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: clientData.companyName,
        }),
      );

      expect(mattermostIntegration._createChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          team_id: "team123",
          name: "general",
        }),
      );

      expect(mattermostIntegration._generateToken).toHaveBeenCalledWith(
        "team123",
      );

      // Vérifier le résultat
      expect(result).toEqual(
        expect.objectContaining({
          teamId: "team123",
          channelId: "channel123",
          apiToken: "test-token-123",
          inviteUrl: expect.stringContaining("invite123"),
        }),
      );
    });

    test("devrait échouer si les données client sont insuffisantes", async () => {
      await expect(
        mattermostIntegration.createClientSpace(null),
      ).rejects.toThrow("Données client insuffisantes pour créer un espace");

      await expect(mattermostIntegration.createClientSpace({})).rejects.toThrow(
        "Données client insuffisantes pour créer un espace",
      );
    });
  });

  // Des tests supplémentaires peuvent être ajoutés ici pour les autres méthodes
});
