const {
  AuthenticationService,
  JWTStrategy,
} = require("@feathersjs/authentication");
const { LocalStrategy } = require("@feathersjs/authentication-local");
const { oauth } = require("@feathersjs/authentication-oauth");
const logger = require("./logger");

module.exports = (app) => {
  const authentication = new AuthenticationService(app);

  // Récupérer les valeurs de configuration traitées
  const config = app.get("authentication");

  // Assurer que le secret est bien défini
  if (!config.secret || config.secret === "JWT_SECRET") {
    if (!process.env.JWT_SECRET) {
      logger.error("JWT_SECRET environment variable is not defined");
      throw new Error("JWT secret is required for authentication");
    }
    config.secret = process.env.JWT_SECRET;
  }

  // Mettre à jour les options JWT si nécessaire
  if (config.jwtOptions) {
    if (
      config.jwtOptions.audience === "JWT_AUDIENCE" &&
      process.env.JWT_AUDIENCE
    ) {
      config.jwtOptions.audience = process.env.JWT_AUDIENCE;
    }
    if (config.jwtOptions.issuer === "JWT_ISSUER" && process.env.JWT_ISSUER) {
      config.jwtOptions.issuer = process.env.JWT_ISSUER;
    }
    if (
      config.jwtOptions.expiresIn === "JWT_EXPIRES_IN" &&
      process.env.JWT_EXPIRES_IN
    ) {
      config.jwtOptions.expiresIn = process.env.JWT_EXPIRES_IN;
    }
  }

  // Mettre à jour la configuration de l'authentification
  app.set("authentication", config);

  authentication.register("jwt", new JWTStrategy());
  authentication.register("local", new LocalStrategy());

  app.use("/api/authentication", authentication);
  app.service("/api/authentication");

  // Nouvelle façon de configurer OAuth dans Feathers v5+
  app.configure(oauth());
};
