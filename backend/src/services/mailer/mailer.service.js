const mailer = require("feathers-mailer");
const hooks = require("./mailer.hooks");
const { HtmlMailFactory } = require("./mailer.factory");
const logger = require("../../logger");

module.exports = async function (app) {
  try {
    // Récupérer la configuration du mailer
    const mailerConfig = app.get("mailer");

    // Vérifier et mettre à jour la configuration du transporteur si nécessaire
    if (mailerConfig && mailerConfig.transporter) {
      const transporter = mailerConfig.transporter;

      // Vérifier si on doit remplacer les variables d'environnement
      if (transporter.host === "MAILER_HOST" && process.env.MAILER_HOST) {
        transporter.host = process.env.MAILER_HOST;
      }
      if (transporter.port === "MAILER_PORT" && process.env.MAILER_PORT) {
        transporter.port = process.env.MAILER_PORT;
      }
      if (
        transporter.secureConnection === "MAILER_SECURE" &&
        process.env.MAILER_SECURE
      ) {
        transporter.secureConnection = process.env.MAILER_SECURE === "true";
      }
      if (transporter.auth) {
        if (
          transporter.auth.user === "MAILER_USER" &&
          process.env.MAILER_USER
        ) {
          transporter.auth.user = process.env.MAILER_USER;
        }
        if (
          transporter.auth.pass === "MAILER_PASS" &&
          process.env.MAILER_PASS
        ) {
          transporter.auth.pass = process.env.MAILER_PASS;
        }
      }
    }

    // Obtenir l'adresse email par défaut
    const defaultEmail = app.get("defaultEmail");
    const fromEmail =
      defaultEmail === "DEFAULT_EMAIL" && process.env.DEFAULT_EMAIL
        ? process.env.DEFAULT_EMAIL
        : defaultEmail;

    // Configurer le service de mail
    app.use(
      "/api/mailer",
      mailer(mailerConfig.transporter, { from: fromEmail, replyTo: "" }),
    );

    const service = app.service("api/mailer");
    service.hooks(hooks);

    logger.info("Mailer service configured successfully");
  } catch (error) {
    logger.error("Failed to configure mailer service:", error);
    // Continuer l'initialisation de l'application même si le mailer échoue
  }
};
