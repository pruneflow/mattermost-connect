// tests/mocks/feathers-config.mock.js
module.exports = () => (app) => {
  // Configuration par défaut pour les tests
  app.set("host", "localhost");
  app.set("port", 3030);
  app.set("public", "../public/");
  app.set("paginate", {
    default: 10,
    max: 50,
  });
  app.set("authentication", {
    entity: "user",
    service: "api/users",
    secret: "test-secret-for-testing",
    authStrategies: ["jwt", "local"],
    jwtOptions: {
      header: {
        typ: "access",
      },
      audience: "https://yourdomain.com",
      issuer: "feathers",
      algorithm: "HS256",
      expiresIn: "1d",
    },
    local: {
      usernameField: "email",
      passwordField: "password",
    },
  });
  app.set("postgres", {
    client: "pg",
    connection: {
      host: "localhost",
      user: "test_user",
      password: "test_password",
      database: "mattermost_admin_test",
    },
  });
  app.set("mattermost", {
    baseUrl: "http://localhost:8065",
    adminToken: "test-admin-token",
  });
};
