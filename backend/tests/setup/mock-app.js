// tests/setup/mock-app.js

const logger = require("../../src/logger");

// Mocks pour les dépendances externes
jest.mock("axios");
jest.mock("../../src/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Créer un mock du service Mattermost Integration
const createMockMattermostIntegration = () => ({
  createClientSpace: jest.fn().mockResolvedValue({
    teamId: "team123",
    teamName: "test-team",
    channelId: "channel123",
    apiToken: "test-token",
    inviteUrl: "http://invite-url",
  }),
  getSpaceInfo: jest.fn().mockResolvedValue({
    teamId: "team123",
    teamName: "test-team",
    displayName: "Test Team",
    description: "Test team description",
    inviteUrl: "http://invite-url",
  }),
  updateClientSpace: jest.fn().mockResolvedValue({
    teamId: "team123",
    teamName: "test-team",
    displayName: "Updated Team",
    description: "Updated description",
  }),
  deleteClientSpace: jest.fn().mockResolvedValue({ success: true }),
  _createChannel: jest.fn().mockResolvedValue({
    id: "channel123",
    name: "test-channel",
    team_id: "team123",
  }),
  _generateToken: jest.fn().mockResolvedValue("test-token-12345"),
  getTeamChannels: jest.fn().mockResolvedValue([
    { id: "channel1", name: "general", display_name: "General" },
    { id: "channel2", name: "random", display_name: "Random" },
  ]),
  createChannel: jest.fn().mockResolvedValue({
    id: "new-channel",
    name: "new-channel",
    display_name: "New Channel",
    team_id: "team123",
  }),
  updateChannel: jest.fn().mockResolvedValue({
    id: "channel1",
    name: "general",
    display_name: "Updated General",
  }),
  archiveChannel: jest.fn().mockResolvedValue({
    success: true,
    channelId: "channel1",
  }),
  inviteUserToTeam: jest.fn().mockResolvedValue({
    status: "invited",
    email: "test@example.com",
  }),
  getTeamMembers: jest.fn().mockResolvedValue([
    { user_id: "user1", username: "user1", roles: "team_user" },
    { user_id: "user2", username: "user2", roles: "team_user team_admin" },
  ]),
  updateUserRole: jest.fn().mockResolvedValue({
    teamId: "team123",
    userId: "user1",
    isAdmin: true,
    roles: "team_user team_admin",
  }),
  removeUserFromTeam: jest.fn().mockResolvedValue({ success: true }),
});

// Créer un mock pour un service générique
const createMockService = (customMethods = {}) => {
  const defaultMethods = {
    find: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    patch: jest.fn().mockResolvedValue({}),
    remove: jest.fn().mockResolvedValue({}),
    hooks: jest.fn(),
  };

  return {
    ...defaultMethods,
    ...customMethods,
  };
};

// Créer le mock global de l'application
const createMockApp = (customConfig = {}) => {
  // Services par défaut
  const mockServices = {
    "/api/users": createMockService(),
    "api/users": createMockService(),
    "/api/mattermost-spaces": createMockService(),
    "api/mattermost-spaces": createMockService(),
    "/api/tokens": createMockService(),
    "api/tokens": createMockService(),
    "/api/channels": createMockService(),
    "api/channels": createMockService(),
    "/api/team-members": createMockService(),
    "api/team-members": createMockService(),
    "/api/statistics": createMockService(),
    "api/statistics": createMockService(),
  };

  // Configuration par défaut
  const defaultConfig = {
    host: "localhost",
    port: 3030,
    public: "../public/",
    paginate: {
      default: 10,
      max: 50,
    },
    authentication: {
      entity: "user",
      service: "api/users",
      secret: "test-secret",
      authStrategies: ["jwt", "local"],
      jwtOptions: {
        header: { typ: "access" },
        audience: "https://yourdomain.com",
        issuer: "feathers",
        algorithm: "HS256",
        expiresIn: "1d",
      },
      local: {
        usernameField: "email",
        passwordField: "password",
      },
    },
    postgres: {
      client: "pg",
      connection: {
        host: "localhost",
        user: "test_user",
        password: "test_password",
        database: "mattermost_admin_test",
      },
    },
    mattermost: {
      baseUrl: "http://localhost:8065",
      adminToken: "test-admin-token",
    },
  };

  // Fusionner la configuration personnalisée
  const appConfig = {
    ...defaultConfig,
    ...customConfig,
  };

  // Créer le mock de l'app
  const mockMattermostIntegration = createMockMattermostIntegration();

  const mockApp = {
    // Méthodes Feathers
    get: jest.fn().mockImplementation((key) => {
      if (key === "mattermostIntegration") return mockMattermostIntegration;
      return appConfig[key];
    }),
    set: jest.fn(),
    configure: jest.fn(),
    use: jest.fn(),
    service: jest.fn().mockImplementation((path) => {
      return mockServices[path] || createMockService();
    }),
    hooks: jest.fn(),
    setup: jest.fn(),
    // Propriétés et méthodes supplémentaires
    mattermostIntegration: mockMattermostIntegration,
    // Permettre d'ajouter ou de remplacer des services
    _addService: (path, customService) => {
      mockServices[path] = {
        ...createMockService(),
        ...customService,
      };
    },
  };

  return mockApp;
};

module.exports = {
  createMockApp,
  createMockService,
  createMockMattermostIntegration,
};
